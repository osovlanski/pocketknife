import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import { cacheService, cacheKeys } from '../core/cacheService';
import { configService } from '../core/configService';

interface CVData {
  name?: string;
  email?: string;
  phone?: string;
  summary?: string;
  skills: string[];
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  desiredRoles: string[];
  yearsOfExperience?: number;
}

interface JobPreferences {
  titles: string[];
  keywords: string[];
  locations: string[];
  minSalary?: number;
  currency: string;
  remoteOk: boolean;
  notificationThreshold: number;
}

// Cache TTL for CV analysis (24 hours - CV data doesn't change often)
const CV_CACHE_TTL_SECONDS = () => configService.get('cache.jobs.cvAnalysis.ttlSeconds', 86400) as number;

class CVAnalysisService {
  private client: Anthropic | null = null;

  private initializeClient() {
    if (this.client) return;
    
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Generate a hash for the CV text to use as cache key
   */
  private generateCVHash(cvText: string): string {
    return crypto.createHash('md5').update(cvText.trim()).digest('hex');
  }

  async analyzeCV(cvText: string, useCache: boolean = true): Promise<CVData> {
    // Generate cache key from CV hash
    const cvHash = this.generateCVHash(cvText);
    const cacheKey = `cv:analysis:${cvHash}`;
    
    // Try to get from cache first
    if (useCache) {
      const cached = await cacheService.get<CVData>(cacheKey);
      if (cached) {
        console.log('✅ CV analysis loaded from cache');
        return cached;
      }
    }
    
    this.initializeClient();
    
    if (!this.client) {
      throw new Error('Failed to initialize Anthropic client');
    }

    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Analyze this CV/Resume and extract structured information for job matching.

CV Text:
${cvText}

Extract and provide a JSON response with:
1. Name, email, phone, location (city and country)
2. Professional summary
3. List of technical skills
4. Work experience with seniority indicators
5. Education
6. Suggested desired job roles
7. Years of experience and seniority level
8. Preferred work locations
9. Optimal job search query

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+972...",
  "location": "Tel Aviv, Israel",
  "preferredLocations": ["Tel Aviv", "Remote"],
  "summary": "Professional summary",
  "skills": ["Node.js", "TypeScript", "React", "AWS", ...],
  "yearsOfExperience": 5,
  "seniorityLevel": "senior",
  "currentRole": "Senior Full Stack Developer",
  "desiredRoles": ["Senior Software Engineer", "Backend Developer", "Tech Lead"],
  "jobSearchQuery": "Senior Full Stack Developer",
  "experience": [
    {
      "title": "Senior Developer",
      "company": "Company Name",
      "duration": "2020-2023",
      "description": "Key responsibilities"
    }
  ],
  "education": [
    {
      "degree": "B.Sc. Computer Science",
      "institution": "University Name",
      "year": "2019"
    }
  ]
}

Important:
- Extract the EXACT location from CV (city, country)
- Determine seniorityLevel: "junior" (<2 years), "mid" (2-5 years), "senior" (5+ years), "lead" (8+ years)
- jobSearchQuery should be concise and include seniority + main role
- preferredLocations should include locations mentioned in CV`
      }]
    });

    const firstBlock = message.content[0];
    const responseText = firstBlock.type === 'text' ? firstBlock.text : '';
    const cleanText = responseText.replace(/```json|```/g, '').trim();
    const cvData = JSON.parse(cleanText);

    console.log('✅ CV analyzed successfully');
    console.log(`📋 Name: ${cvData.name || 'Not found'}`);
    console.log(`🎯 Skills found: ${cvData.skills.length}`);
    console.log(`💼 Experience entries: ${cvData.experience.length}`);

    // Cache the result for future use
    await cacheService.set(cacheKey, cvData, { 
      ttl: CV_CACHE_TTL_SECONDS(),
      tags: ['cv', 'analysis']
    });
    console.log('💾 CV analysis cached for 24 hours');

    return cvData;
  }

  generateJobPreferences(cvData: CVData): JobPreferences {
    return {
      titles: cvData.desiredRoles,
      keywords: cvData.skills,
      locations: ['Remote', 'Tel Aviv'], // Default, can be customized
      minSalary: undefined,
      currency: 'ILS',
      remoteOk: true,
      notificationThreshold: 75
    };
  }
}

export default new CVAnalysisService();
