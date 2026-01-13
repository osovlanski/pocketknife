import Anthropic from '@anthropic-ai/sdk';
import https from 'https';
import logger from '../../utils/logger';

class ClaudeService {
  private client: Anthropic | null = null;

  private initializeClient() {
    if (this.client) {
      return;
    }

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    
    if (!apiKey) {
      logger.fail('ANTHROPIC_API_KEY is not set in environment variables');
      throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
    }
    
    logger.init('Initializing Claude client', { apiKeyLength: apiKey.length });
    
    this.client = new Anthropic({
      apiKey: apiKey,
      httpAgent: new https.Agent({ rejectUnauthorized: false })
    });
  }

  async classifyEmail(email: any) {
    try {
      this.initializeClient();
      
      if (!this.client) {
        throw new Error('Failed to initialize Anthropic client');
      }

      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Analyze this email and classify it into one of these categories:

1. INVOICE - Bills, invoices, utility payments, rates, receipts, statements, payment requests
   Hebrew keywords: ארנונה (municipal tax), חשמל (electricity), מים (water), גז (gas), 
   ביטוח (insurance), טלפון (phone), אינטרנט (internet), חשבון (bill), תשלום (payment),
   חיוב (charge), קבלה (receipt)

2. JOB_OFFER - Job interview offers, recruitment emails, job opportunities
   Hebrew keywords: ראיון עבודה (job interview), הזמנה לראיון (interview invitation), 
   משרה (position), דרוש (wanted), גיוס (recruitment)

3. OFFICIAL - Government, municipality, bank, or official institution communications
   These are IMPORTANT emails from official sources - NOT spam!
   Hebrew keywords: עיריית (municipality), עירייה (city hall), משרד (ministry), בנק (bank),
   ביטוח לאומי (national insurance), מס הכנסה (income tax), רשות (authority),
   פנייה (request/case), מספר פניה (case number), חילופי מחזיקים (holder change),
   רישום (registration), אישור (confirmation/approval), טופס (form)
   Common senders: gov.il, עיריית תל אביב, עיריית ירושלים, etc.

4. SPAM - ONLY commercial marketing, promotions, newsletters, sales, advertising
   Hebrew keywords: מבצע (promotion), הנחה (discount), פרסומת (advertisement),
   עדכונים שיווקיים (marketing updates), רשימת תפוצה (mailing list)
   
IMPORTANT RULES:
- Government/municipality emails are NEVER spam - classify as OFFICIAL
- Emails with case numbers (מספר פניה) are OFFICIAL
- Emails about taxes, rates, property matters are OFFICIAL or INVOICE
- Only pure marketing/promotional emails should be SPAM
- When in doubt between SPAM and OFFICIAL, choose OFFICIAL

Email Subject: ${email.subject}
Email From: ${email.from}
Email Date: ${email.date}
Email Preview: ${email.snippet}
${email.body ? `Email Body: ${email.body.substring(0, 500)}` : ''}

The email may be in Hebrew or English. Analyze carefully before classifying.

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "category": "INVOICE" or "JOB_OFFER" or "OFFICIAL" or "SPAM",
  "confidence": 0.0 to 1.0,
  "suggested_filename": "company_type_month_year" (only for INVOICE, null otherwise),
  "reasoning": "brief explanation",
  "key_details": "extracted important info like amount, company, date, case number"
}`
        }]
      });

      const firstBlock = message.content[0];
      const responseText = firstBlock.type === 'text' ? firstBlock.text : '';
      const cleanText = responseText.replace(/```json|```/g, '').trim();
      const classification = JSON.parse(cleanText);

      return classification;
    } catch (error) {
      logger.fail('Error with Claude API', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async analyzeEmailPatterns(emails: any[], existingRules: string[] = []): Promise<{
    suggestedRules: Array<{
      pattern: string;
      type: 'sender' | 'subject' | 'domain';
      suggestedCategory: string;
      sampleEmails: string[];
      confidence: number;
    }>;
    summary: string;
  }> {
    try {
      this.initializeClient();
      
      if (!this.client) {
        throw new Error('Failed to initialize Anthropic client');
      }

      const emailSummary = emails.slice(0, 50).map(e => ({
        from: e.from,
        subject: e.subject,
        domain: e.from?.match(/@([^>]+)/)?.[1] || 'unknown'
      }));

      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `Analyze these emails and suggest new filtering rules for repetitive patterns.

Existing rules (don't suggest these): ${existingRules.join(', ') || 'None'}

Emails to analyze:
${JSON.stringify(emailSummary, null, 2)}

Find patterns like:
1. Sender domains that appear 3+ times
2. Subject line patterns (newsletters, notifications, etc.)
3. Marketing/promotional patterns
4. Recurring transactional emails

Respond ONLY with valid JSON:
{
  "suggestedRules": [
    {
      "pattern": "regex or text pattern",
      "type": "sender" | "subject" | "domain",
      "suggestedCategory": "INVOICE" | "NEWSLETTER" | "PROMOTIONAL" | "NOTIFICATION" | "SOCIAL",
      "sampleEmails": ["sample subject 1", "sample subject 2"],
      "confidence": 0.0 to 1.0
    }
  ],
  "summary": "Brief summary of findings"
}`
        }]
      });

      const firstBlock = message.content[0];
      const responseText = firstBlock.type === 'text' ? firstBlock.text : '';
      const cleanText = responseText.replace(/```json|```/g, '').trim();
      const result = JSON.parse(cleanText);

      return result;
    } catch (error) {
      logger.fail('Error analyzing email patterns', { error: error instanceof Error ? error.message : String(error) });
      return {
        suggestedRules: [],
        summary: 'Failed to analyze patterns'
      };
    }
  }

  async generateText(prompt: string, maxTokens: number = 4096): Promise<string> {
    try {
      this.initializeClient();
      
      if (!this.client) {
        throw new Error('Failed to initialize Anthropic client');
      }

      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const textBlock = message.content.find(block => block.type === 'text');
      return textBlock?.type === 'text' ? textBlock.text : '';
    } catch (error) {
      logger.fail('Error generating text', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}

export default new ClaudeService();
