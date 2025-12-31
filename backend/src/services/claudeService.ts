import Anthropic from '@anthropic-ai/sdk';
import https from 'https';

class ClaudeService {
  private client: Anthropic | null = null;

  private initializeClient() {
    if (this.client) {
      return; // Already initialized
    }

    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    
    if (!apiKey) {
      console.error('❌ ANTHROPIC_API_KEY is not set in environment variables');
      console.error('❌ Available env keys:', Object.keys(process.env).filter(k => k.includes('ANTHROPIC')));
      throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
    }
    
    console.log('🔑 Initializing Claude with API key (length:', apiKey.length, ')');
    
    this.client = new Anthropic({
      apiKey: apiKey,
      // Disable SSL verification for corporate proxies
      httpAgent: new https.Agent({ rejectUnauthorized: false })
    });
  }

  async classifyEmail(email: any) {
    try {
      // Lazy initialization - only create client when first needed
      this.initializeClient();
      
      if (!this.client) {
        throw new Error('Failed to initialize Anthropic client');
      }

      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `Analyze this email and classify it into one of three categories:
1. INVOICE - Bills, invoices, utility payments, rates, receipts, statements
   Hebrew keywords: ארנונה (municipal tax), חשמל (electricity), מים (water), גז (gas), 
   ביטוח (insurance), טלפון (phone), אינטרנט (internet), חשבון (bill), תשלום (payment)
2. JOB_OFFER - Job interview offers, recruitment emails, job opportunities
   Hebrew keywords: ראיון עבודה (job interview), הזמנה לראיון (interview invitation), 
   משרה (position), דרוש (wanted)
3. SPAM - Commercial emails, promotions, newsletters, marketing, trash
   Hebrew keywords: מבצע (promotion), הנחה (discount), פרסומת (advertisement)

Email Subject: ${email.subject}
Email From: ${email.from}
Email Date: ${email.date}
Email Preview: ${email.snippet}

The email may be in Hebrew or English. Look for both Hebrew and English keywords.
For invoices, extract company name and billing period if mentioned.

Respond ONLY with valid JSON in this exact format (no markdown, no backticks):
{
  "category": "INVOICE" or "JOB_OFFER" or "SPAM",
  "confidence": 0.0 to 1.0,
  "suggested_filename": "company_type_month_year" (only for INVOICE, null otherwise),
  "reasoning": "brief explanation",
  "key_details": "extracted important info like amount, company, date, billing period"
}`
        }]
      });

      const firstBlock = message.content[0];
      const responseText = firstBlock.type === 'text' ? firstBlock.text : '';
      const cleanText = responseText.replace(/```json|```/g, '').trim();
      const classification = JSON.parse(cleanText);

      return classification;
    } catch (error) {
      console.error('Error with Claude API:', error);
      throw error;
    }
  }
}

export default new ClaudeService();