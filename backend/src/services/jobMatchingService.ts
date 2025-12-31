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
      // Handle different CV data structures
      const skills = cvData.skills || [];
      const desiredRoles = cvData.desiredRoles || [];
      const experience = cvData.experience || [];
      const yearsOfExperience = cvData.yearsOfExperience || 0;
      
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Analyze how well this job matches the candidate's profile.

JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description.substring(0, 1500)}

CANDIDATE PROFILE:
Skills: ${skills.length > 0 ? skills.join(', ') : 'Not specified'}
Desired Roles: ${desiredRoles.length > 0 ? desiredRoles.join(', ') : 'Not specified'}
Years of Experience: ${yearsOfExperience || 'Not specified'}
Seniority Level: ${cvData.seniorityLevel || 'Not specified'}
Current Role: ${cvData.currentRole || 'Not specified'}
Recent Experience: ${experience.length > 0 ? experience.slice(0, 2).map((e: any) => `${e.title || e.role} at ${e.company}`).join(', ') : 'Not specified'}

ANALYSIS INSTRUCTIONS:
1. Calculate match score (0-100) based on:
   - Skills overlap
   - Role title match
   - Experience level fit
   - Job description alignment

2. Identify:
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
    } catch (error) {
      console.error('❌ Error matching job:', error);
      // Return default match on error
      return {
        matchScore: 0,
        matchedSkills: [],
        missingSkills: [],
        reasoning: 'Error analyzing job match'
      };
    }
  }

  async matchMultipleJobs(jobs: JobListing[], cvData: CVData, io?: any, matchThreshold: number = 75) {
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
    
    for (const job of jobs) {
      try {
        const match = await this.matchJob(job, cvData);
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
    
    console.log(`✅ Matched ${matchedJobs.length} jobs successfully`);
    
    if (io) {
      io.emit('log', { 
        message: `✅ Analysis complete! ${streamedCount} jobs meet your ${matchThreshold}%+ threshold`, 
        type: 'success' 
      });
    }
    
    return matchedJobs;
  }
}

export default new JobMatchingService();
