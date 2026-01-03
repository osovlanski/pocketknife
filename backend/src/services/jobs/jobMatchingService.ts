import Anthropic from '@anthropic-ai/sdk';

interface JobListing {
  id: string;
  title: string;
  company: string;
  description: string;
  [key: string]: any;
}

interface CVData {
  skills?: string[];
  desiredRoles?: string[];
  yearsOfExperience?: number;
  experience?: any[];
  seniorityLevel?: string;
  currentRole?: string;
  location?: string;
  preferredLocations?: string[];
  jobSearchQuery?: string;
}

interface JobMatch {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasoning: string;
  salaryMatch?: string;
  locationMatch?: string;
}

class JobMatchingService {
  private client: Anthropic | null = null;

  private initializeClient() {
    if (this.client) return;
    
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    
    this.client = new Anthropic({ apiKey });
  }

  async matchJob(job: JobListing, cvData: any): Promise<JobMatch> {
    this.initializeClient();
    
    if (!this.client) {
      throw new Error('Failed to initialize Anthropic client');
    }

    try {
      // Handle different CV data structures - extract from nested structure if needed
      const actualCVData = cvData.cvData || cvData;
      const skills = actualCVData.skills || [];
      const desiredRoles = actualCVData.desiredRoles || [];
      const experience = actualCVData.experience || [];
      const yearsOfExperience = actualCVData.yearsOfExperience || 0;
      
      // Validate we have usable CV data
      if (skills.length === 0 && desiredRoles.length === 0) {
        console.warn('⚠️ CV has no skills or desired roles - using basic matching');
        return this.basicMatch(job, actualCVData);
      }
      
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Analyze how well this job matches the candidate's profile.

JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description?.substring(0, 1500) || 'No description available'}

CANDIDATE PROFILE:
Skills: ${skills.length > 0 ? skills.join(', ') : 'Not specified'}
Desired Roles: ${desiredRoles.length > 0 ? desiredRoles.join(', ') : 'Not specified'}
Years of Experience: ${yearsOfExperience || 'Not specified'}
Seniority Level: ${actualCVData.seniorityLevel || 'Not specified'}
Current Role: ${actualCVData.currentRole || 'Not specified'}
Recent Experience: ${experience.length > 0 ? experience.slice(0, 2).map((e: any) => `${e.title || e.role} at ${e.company}`).join(', ') : 'Not specified'}

ANALYSIS INSTRUCTIONS:
1. Calculate match score (0-100) based on:
   - Skills overlap (40% weight) - count how many candidate skills appear in job description
   - Role title match (30% weight) - does job title align with desired roles?
   - Experience level fit (20% weight) - is seniority appropriate?
   - Job description alignment (10% weight) - general fit

2. Be GENEROUS with scoring:
   - If candidate has 50%+ of required skills: score >= 60
   - If job title matches desired roles: add 20 points
   - If seniority matches: add 15 points

3. Identify:
   - Which candidate skills match job requirements
   - Which required skills candidate is missing
   - Overall fit reasoning

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "matchScore": 85,
  "matchedSkills": ["Node.js", "TypeScript", "React"],
  "missingSkills": ["Kubernetes", "GraphQL"],
  "reasoning": "Strong match - candidate has 8/10 required skills and relevant experience",
  "salaryMatch": "Competitive",
  "locationMatch": "Perfect"
}`
        }]
      });

      const firstBlock = message.content[0];
      const responseText = firstBlock.type === 'text' ? firstBlock.text : '';
      const cleanText = responseText.replace(/```json|```/g, '').trim();
      const match = JSON.parse(cleanText);

      return match;
    } catch (error: any) {
      console.error('❌ Error matching job:', error.message);
      // Fall back to basic matching on AI error
      const actualCVData = cvData.cvData || cvData;
      return this.basicMatch(job, actualCVData);
    }
  }

  /**
   * Basic keyword-based matching when AI is unavailable
   */
  private basicMatch(job: JobListing, cvData: any): JobMatch {
    const skills = cvData.skills || [];
    const desiredRoles = cvData.desiredRoles || [];
    const currentRole = cvData.currentRole || '';
    const seniorityLevel = cvData.seniorityLevel || '';
    
    const jobText = `${job.title} ${job.description}`.toLowerCase();
    
    // Count matched skills
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];
    
    skills.forEach((skill: string) => {
      const skillLower = skill.toLowerCase();
      // Check for exact match or common variations
      if (jobText.includes(skillLower) || 
          jobText.includes(skillLower.replace('.js', '')) ||
          jobText.includes(skillLower.replace('js', 'javascript'))) {
        matchedSkills.push(skill);
      }
    });
    
    // Check for common tech keywords in job that candidate doesn't have
    const commonTech = ['python', 'java', 'javascript', 'typescript', 'react', 'node', 'aws', 'docker', 'kubernetes', 'sql', 'mongodb', 'go', 'rust'];
    commonTech.forEach(tech => {
      if (jobText.includes(tech) && !skills.some((s: string) => s.toLowerCase().includes(tech))) {
        missingSkills.push(tech);
      }
    });
    
    // Calculate base score from skills match
    let matchScore = 0;
    if (skills.length > 0) {
      const skillMatchRatio = matchedSkills.length / Math.max(skills.length, 1);
      matchScore = Math.round(skillMatchRatio * 50); // Up to 50 points for skills
    }
    
    // Bonus for role match
    const roleMatch = desiredRoles.some((role: string) => 
      jobText.includes(role.toLowerCase())
    ) || jobText.includes(currentRole.toLowerCase());
    if (roleMatch) {
      matchScore += 25;
    }
    
    // Bonus for seniority match
    if (seniorityLevel) {
      const seniorityKeywords: Record<string, string[]> = {
        'senior': ['senior', 'sr.', 'lead', 'principal', 'staff'],
        'mid': ['mid', 'intermediate', '3-5 years'],
        'junior': ['junior', 'jr.', 'entry', 'graduate']
      };
      const seniorMatch = seniorityKeywords[seniorityLevel]?.some(kw => jobText.includes(kw));
      if (seniorMatch) {
        matchScore += 15;
      }
    }
    
    // Bonus for tech company indicators
    const techIndicators = ['startup', 'tech', 'software', 'engineering', 'developer', 'engineer'];
    if (techIndicators.some(ind => jobText.includes(ind))) {
      matchScore += 10;
    }
    
    // Cap at 100
    matchScore = Math.min(matchScore, 100);
    
    const reasoning = matchedSkills.length > 0 
      ? `Basic match: ${matchedSkills.length} skills matched${roleMatch ? ', role title matches' : ''}`
      : 'Low match - few skill overlaps detected';
    
    return {
      matchScore,
      matchedSkills: matchedSkills.slice(0, 10),
      missingSkills: missingSkills.slice(0, 5),
      reasoning
    };
  }

  async matchMultipleJobs(
    jobs: JobListing[], 
    cvData: CVData, 
    io?: any, 
    matchThreshold: number = 75,
    shouldStop?: () => boolean
  ) {
    console.log(`🎯 Matching ${jobs.length} jobs against CV...`);
    
    if (io) {
      io.emit('log', { 
        message: `🎯 Starting AI analysis of ${jobs.length} jobs...`, 
        type: 'info' 
      });
      io.emit('log', { 
        message: `🔥 Jobs with ${matchThreshold}%+ match will appear immediately!`, 
        type: 'info' 
      });
    }
    
    const matchedJobs = [];
    let processedCount = 0;
    let streamedCount = 0;
    let wasStopped = false;
    
    for (const job of jobs) {
      // Check for stop signal before processing each job
      if (shouldStop && shouldStop()) {
        console.log('🛑 Stop signal received - halting job matching');
        wasStopped = true;
        if (io) {
          io.emit('log', { 
            message: `🛑 Stopping... processed ${processedCount}/${jobs.length} jobs`, 
            type: 'warning' 
          });
        }
        break;
      }

      try {
        const match = await this.matchJob(job, cvData);
        
        // Check for stop signal after API call
        if (shouldStop && shouldStop()) {
          console.log('🛑 Stop signal received after match - halting');
          wasStopped = true;
          break;
        }

        const matchedJob = {
          ...job,
          matchScore: match.matchScore,
          matchedSkills: match.matchedSkills,
          missingSkills: match.missingSkills,
          reasoning: match.reasoning
        };
        
        matchedJobs.push(matchedJob);
        processedCount++;
        
        console.log(`  ${job.title} at ${job.company}: ${match.matchScore}% match`);
        
        // Stream job to frontend immediately if it meets threshold
        if (io && match.matchScore >= matchThreshold) {
          streamedCount++;
          io.emit('job-match', {
            job: matchedJob,
            progress: {
              processed: processedCount,
              total: jobs.length,
              streamedCount
            }
          });
          
          // Also send a log message
          io.emit('log', { 
            message: `🎯 ${match.matchScore}% Match: ${job.title} at ${job.company}`, 
            type: 'success' 
          });
        }
        
        // Send progress update every 5 jobs
        if (io && processedCount % 5 === 0) {
          io.emit('log', { 
            message: `⏳ Progress: ${processedCount}/${jobs.length} jobs analyzed (${streamedCount} matches found)`, 
            type: 'info' 
          });
        }
        
      } catch (error) {
        console.error(`  ❌ Error matching ${job.title}:`, error);
        processedCount++;
      }
    }

    // Sort by match score
    matchedJobs.sort((a, b) => b.matchScore - a.matchScore);
    
    if (wasStopped) {
      console.log(`⏹️ Stopped after matching ${matchedJobs.length} jobs`);
      if (io) {
        io.emit('log', { 
          message: `⏹️ Search stopped. Found ${streamedCount} matches in ${processedCount} jobs analyzed.`, 
          type: 'warning' 
        });
      }
    } else {
      console.log(`✅ Matched ${matchedJobs.length} jobs successfully`);
      if (io) {
        io.emit('log', { 
          message: `✅ Analysis complete! ${streamedCount} jobs meet your ${matchThreshold}%+ threshold`, 
          type: 'success' 
        });
      }
    }
    
    return matchedJobs;
  }
}

export default new JobMatchingService();
