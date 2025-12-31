import Anthropic from '@anthropic-ai/sdk';

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

  async analyzeCV(cvText: string): Promise<CVData> {
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
