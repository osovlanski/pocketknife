import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';

interface JobRequirement {
  prompt: string;
  location?: string;
  remotePreference?: 'remote' | 'hybrid' | 'office' | 'any';
  salaryRange?: { min?: number; max?: number };
  companyTypes?: string[];
}

interface AIJobResult {
  companies: {
    name: string;
    reason: string;
    website?: string;
    jobsUrl?: string;
    industry: string;
  }[];
  searchQueries: string[];
  recommendations: string[];
  keywords: string[];
}

class AIJobSearchService {
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
   * AI-powered job search based on user requirements
   * Uses Claude to analyze requirements and suggest relevant companies/roles
   */
  async searchByRequirements(requirements: JobRequirement): Promise<AIJobResult> {
    this.initializeClient();

    if (!this.client) {
      throw new Error('Failed to initialize Anthropic client');
    }

    console.log('🤖 AI analyzing job requirements:', requirements.prompt);

    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are an expert tech recruiter and career advisor. Analyze these job requirements and provide recommendations.

USER REQUIREMENTS:
"${requirements.prompt}"

PREFERENCES:
- Location: ${requirements.location || 'Any'}
- Remote Preference: ${requirements.remotePreference || 'Any'}
- Salary Range: ${requirements.salaryRange ? `$${requirements.salaryRange.min || 0}k - $${requirements.salaryRange.max || 'unlimited'}k` : 'Any'}
- Company Types: ${requirements.companyTypes?.join(', ') || 'Any'}

TASK:
1. Identify 10-15 specific companies that match these requirements
2. For each company, explain WHY they're a good match
3. Generate 5 optimized job search queries for job boards
4. Suggest additional keywords to search for
5. Provide career recommendations

Focus on:
- Well-known tech companies (FAANG, Israeli unicorns, etc.)
- Growing startups in relevant fields
- Companies known for good culture/compensation

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "companies": [
    {
      "name": "Company Name",
      "reason": "Why this company matches the requirements",
      "website": "https://company.com",
      "jobsUrl": "https://company.com/careers",
      "industry": "Industry category"
    }
  ],
  "searchQueries": [
    "optimized search query 1",
    "optimized search query 2"
  ],
  "recommendations": [
    "Career recommendation 1",
    "Career recommendation 2"
  ],
  "keywords": ["keyword1", "keyword2"]
}`
      }]
    });

    const firstBlock = message.content[0];
    const responseText = firstBlock.type === 'text' ? firstBlock.text : '';
    const cleanText = responseText.replace(/```json|```/g, '').trim();

    try {
      const result = JSON.parse(cleanText);
      return {
        companies: result.companies || [],
        searchQueries: result.searchQueries || [],
        recommendations: result.recommendations || [],
        keywords: result.keywords || []
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return {
        companies: [],
        searchQueries: [requirements.prompt],
        recommendations: ['Try different search terms'],
        keywords: []
      };
    }
  }

  /**
   * Get career path recommendations based on current skills
   */
  async getCareerPath(cvData: any): Promise<{
    currentLevel: string;
    nextRoles: string[];
    skillsToLearn: string[];
    timeline: string;
    advice: string;
  }> {
    this.initializeClient();

    if (!this.client) {
      throw new Error('Failed to initialize Anthropic client');
    }

    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Analyze this developer's profile and suggest a career path.

PROFILE:
- Current Role: ${cvData.currentRole || 'Not specified'}
- Skills: ${cvData.skills?.join(', ') || 'Not specified'}
- Years of Experience: ${cvData.yearsOfExperience || 'Not specified'}
- Seniority: ${cvData.seniorityLevel || 'Not specified'}
- Desired Roles: ${cvData.desiredRoles?.join(', ') || 'Not specified'}

Provide:
1. Assessment of current career level
2. 3-5 potential next role progressions
3. Skills to learn for advancement
4. Realistic timeline
5. Personalized advice

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "currentLevel": "Assessment of current level",
  "nextRoles": ["Role 1", "Role 2", "Role 3"],
  "skillsToLearn": ["Skill 1", "Skill 2"],
  "timeline": "e.g., 1-2 years to next level",
  "advice": "Personalized career advice"
}`
      }]
    });

    const firstBlock = message.content[0];
    const responseText = firstBlock.type === 'text' ? firstBlock.text : '';
    const cleanText = responseText.replace(/```json|```/g, '').trim();

    try {
      return JSON.parse(cleanText);
    } catch (error) {
      console.error('Failed to parse career path response:', error);
      return {
        currentLevel: 'Unable to assess',
        nextRoles: [],
        skillsToLearn: [],
        timeline: 'N/A',
        advice: 'Please try again with more detailed CV information.'
      };
    }
  }
}

export default new AIJobSearchService();

