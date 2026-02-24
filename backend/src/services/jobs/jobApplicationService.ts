import Anthropic from '@anthropic-ai/sdk';

interface JobListing {
  id: string;
  title: string;
  company: string;
  description: string;
  location?: string;
  salary?: string;
  [key: string]: any;
}

interface CVData {
  name?: string;
  skills?: string[];
  desiredRoles?: string[];
  yearsOfExperience?: number;
  experience?: Array<{ role?: string; company?: string; description?: string; years?: number }>;
  seniorityLevel?: string;
  currentRole?: string;
  education?: Array<{ degree?: string; institution?: string }>;
  [key: string]: any;
}

export interface ApplicationPackage {
  coverLetter: string;
  emailTemplate: string;
  applicationTips: string[];
  skillGapAdvice: string;
  keyStrengths: string[];
}

class JobApplicationService {
  private client: Anthropic | null = null;

  private initializeClient() {
    if (this.client) return;

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }

    this.client = new Anthropic({ apiKey });
  }

  async generateApplicationPackage(
    job: JobListing,
    cvData: CVData,
    options?: {
      tone?: 'professional' | 'enthusiastic' | 'concise';
      additionalContext?: string;
    }
  ): Promise<ApplicationPackage> {
    this.initializeClient();

    if (!this.client) {
      throw new Error('Failed to initialize Anthropic client');
    }

    const tone = options?.tone || 'professional';
    const additionalContext = options?.additionalContext || '';

    const actualCVData = (cvData as any).cvData || cvData;
    const skills = actualCVData.skills || [];
    const experience = actualCVData.experience || [];
    const name = actualCVData.name || 'the candidate';
    const yearsOfExperience = actualCVData.yearsOfExperience || 0;
    const currentRole = actualCVData.currentRole || actualCVData.seniorityLevel || '';

    const experienceSummary = experience
      .slice(0, 5)
      .map((exp: any) => `${exp.role || exp.title || 'Role'} at ${exp.company || 'Company'}: ${exp.description?.substring(0, 150) || ''}`)
      .join('\n');

    const prompt = `You are an expert career coach and professional writer. Generate a complete job application package.

JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location || 'Not specified'}
Salary: ${job.salary || 'Not specified'}
Description: ${job.description?.substring(0, 2000) || 'No description available'}

CANDIDATE PROFILE:
Name: ${name}
Current Role: ${currentRole}
Years of Experience: ${yearsOfExperience}
Key Skills: ${skills.slice(0, 20).join(', ')}
Recent Experience:
${experienceSummary}
${additionalContext ? `\nAdditional Context from Candidate:\n${additionalContext}` : ''}

TONE: ${tone}

Generate a JSON response with EXACTLY this structure (no markdown, pure JSON):
{
  "coverLetter": "A 3-4 paragraph tailored cover letter. First paragraph: strong opener connecting candidate to role. Second paragraph: most relevant experience with specific achievements. Third paragraph: why this company specifically. Fourth paragraph: call to action.",
  "emailTemplate": "A concise 3-paragraph cold email version (max 150 words total). Subject line on first line prefixed with 'Subject: ', then two blank lines, then the email body.",
  "applicationTips": ["tip1", "tip2", "tip3", "tip4", "tip5"],
  "skillGapAdvice": "One paragraph on how to address any skill gaps identified and how to frame experience positively.",
  "keyStrengths": ["strength1 with specific evidence from CV", "strength2", "strength3", "strength4", "strength5"]
}

Important: Return ONLY valid JSON. No preamble, no markdown code blocks.`;

    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';

    try {
      // Strip any accidental markdown fences
      const cleanedText = rawText.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
      const parsed = JSON.parse(cleanedText);

      return {
        coverLetter: parsed.coverLetter || '',
        emailTemplate: parsed.emailTemplate || '',
        applicationTips: Array.isArray(parsed.applicationTips) ? parsed.applicationTips : [],
        skillGapAdvice: parsed.skillGapAdvice || '',
        keyStrengths: Array.isArray(parsed.keyStrengths) ? parsed.keyStrengths : []
      };
    } catch {
      // If parsing fails, return structured error with raw text as cover letter
      return {
        coverLetter: rawText,
        emailTemplate: '',
        applicationTips: ['Unable to parse structured tips — see cover letter for full content.'],
        skillGapAdvice: '',
        keyStrengths: []
      };
    }
  }
}

export default new JobApplicationService();
