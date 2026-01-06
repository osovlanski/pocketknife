/**
 * Email Pattern Learning Service
 * 
 * Learns sender patterns from email history to improve classification.
 * Tracks recurring senders (e.g., OpenAI daily emails) and creates auto-tagging rules.
 */

import { getPrisma } from '../core/databaseService';
import claudeService from '../core/claudeService';

interface PatternMatch {
  id: string;
  category: string;
  customTag: string | null;
  confidence: number;
  isUserApproved: boolean;
}

interface LearnedPattern {
  senderEmail: string | null;
  senderDomain: string | null;
  senderName: string | null;
  subjectPattern: string | null;
  category: string;
  customTag: string | null;
  confidence: number;
}

interface EmailInput {
  from: string;
  subject: string;
  snippet?: string;
  body?: string;
}

class EmailPatternService {
  /**
   * Extract domain from email address
   */
  private extractDomain(email: string): string | null {
    const match = email.match(/@([^>]+)/);
    return match ? match[1].toLowerCase().trim() : null;
  }

  /**
   * Extract sender name from email "From" field
   */
  private extractSenderName(from: string): string | null {
    // Handle formats like: "OpenAI <noreply@openai.com>" or "noreply@openai.com"
    const match = from.match(/^([^<]+)</);
    if (match) {
      return match[1].trim().replace(/"/g, '');
    }
    return null;
  }

  /**
   * Extract sender email from "From" field
   */
  private extractSenderEmail(from: string): string | null {
    const match = from.match(/<([^>]+)>/);
    if (match) {
      return match[1].toLowerCase().trim();
    }
    // If no angle brackets, it might be just the email
    if (from.includes('@')) {
      return from.toLowerCase().trim();
    }
    return null;
  }

  /**
   * Check if an email matches any learned patterns
   */
  async findMatchingPattern(email: EmailInput): Promise<PatternMatch | null> {
    const prisma = getPrisma();
    if (!prisma) return null;

    const senderEmail = this.extractSenderEmail(email.from);
    const senderDomain = this.extractDomain(email.from);

    try {
      // Look for exact sender match first
      if (senderEmail) {
        const exactMatch = await prisma.emailSenderPattern.findFirst({
          where: {
            senderEmail: senderEmail,
            confidence: { gte: 0.7 }
          },
          orderBy: { confidence: 'desc' }
        });

        if (exactMatch) {
          return {
            id: exactMatch.id,
            category: exactMatch.category,
            customTag: exactMatch.customTag,
            confidence: exactMatch.confidence,
            isUserApproved: exactMatch.isUserApproved
          };
        }
      }

      // Fall back to domain match
      if (senderDomain) {
        const domainMatch = await prisma.emailSenderPattern.findFirst({
          where: {
            senderDomain: senderDomain,
            confidence: { gte: 0.6 }
          },
          orderBy: { confidence: 'desc' }
        });

        if (domainMatch) {
          return {
            id: domainMatch.id,
            category: domainMatch.category,
            customTag: domainMatch.customTag,
            confidence: domainMatch.confidence,
            isUserApproved: domainMatch.isUserApproved
          };
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding pattern match:', error);
      return null;
    }
  }

  /**
   * Record an email for pattern learning
   * Called after each email is classified to track patterns
   */
  async recordEmailForLearning(
    email: EmailInput,
    classification: { category: string; confidence: number }
  ): Promise<void> {
    const prisma = getPrisma();
    if (!prisma) return;

    const senderEmail = this.extractSenderEmail(email.from);
    const senderDomain = this.extractDomain(email.from);
    const senderName = this.extractSenderName(email.from);

    if (!senderDomain) return;

    try {
      // Use upsert to either create or update the pattern
      await prisma.emailSenderPattern.upsert({
        where: {
          senderDomain_subjectPattern: {
            senderDomain: senderDomain,
            subjectPattern: null
          }
        },
        update: {
          occurrenceCount: { increment: 1 },
          lastSeenAt: new Date(),
          // Only update confidence if it improves
          confidence: {
            set: Math.max(classification.confidence, 0.5)
          }
        },
        create: {
          senderEmail: senderEmail,
          senderDomain: senderDomain,
          senderName: senderName,
          category: classification.category,
          confidence: classification.confidence,
          isAutoLearned: true,
          isUserApproved: false
        }
      });
    } catch (error) {
      // Ignore duplicate key errors for concurrent inserts
      if ((error as any).code !== 'P2002') {
        console.error('Error recording email pattern:', error);
      }
    }
  }

  /**
   * Learn patterns from a batch of emails using AI
   */
  async learnPatternsFromBatch(emails: EmailInput[]): Promise<LearnedPattern[]> {
    const prisma = getPrisma();
    if (!prisma || emails.length < 3) return [];

    // Group emails by domain
    const emailsByDomain: Map<string, EmailInput[]> = new Map();
    
    for (const email of emails) {
      const domain = this.extractDomain(email.from);
      if (domain) {
        const existing = emailsByDomain.get(domain) || [];
        existing.push(email);
        emailsByDomain.set(domain, existing);
      }
    }

    // Find domains that appear 3+ times (indicating a recurring sender)
    const frequentDomains: Array<{ domain: string; emails: EmailInput[] }> = [];
    for (const [domain, domainEmails] of emailsByDomain) {
      if (domainEmails.length >= 3) {
        frequentDomains.push({ domain, emails: domainEmails });
      }
    }

    if (frequentDomains.length === 0) return [];

    // Use AI to analyze patterns
    try {
      const prompt = `Analyze these recurring email senders and suggest tagging rules.

Recurring senders found:
${frequentDomains.map(({ domain, emails }) => `
Domain: ${domain}
Sample emails (${emails.length} total):
${emails.slice(0, 3).map(e => `  - From: ${e.from}\n    Subject: ${e.subject}`).join('\n')}
`).join('\n')}

For each domain, suggest:
1. A category (NEWSLETTER, NOTIFICATION, PROMOTIONAL, INVOICE, SOCIAL, or OTHER)
2. A custom tag name that would help organize these emails (e.g., "OpenAI Updates", "GitHub Notifications")
3. Confidence score (0-1)

Respond ONLY with valid JSON:
{
  "patterns": [
    {
      "domain": "openai.com",
      "category": "NEWSLETTER",
      "customTag": "OpenAI Updates",
      "confidence": 0.9,
      "reasoning": "Daily AI news and updates from OpenAI"
    }
  ]
}`;

      const response = await claudeService.generateText(prompt, 1500);
      const cleanResponse = response.replace(/```json|```/g, '').trim();
      const analysis = JSON.parse(cleanResponse);

      const learnedPatterns: LearnedPattern[] = [];

      // Save patterns to database
      for (const pattern of analysis.patterns || []) {
        const domainData = frequentDomains.find(d => d.domain === pattern.domain);
        if (!domainData) continue;

        const sampleEmail = domainData.emails[0];
        const senderEmail = this.extractSenderEmail(sampleEmail.from);
        const senderName = this.extractSenderName(sampleEmail.from);

        try {
          await prisma.emailSenderPattern.upsert({
            where: {
              senderDomain_subjectPattern: {
                senderDomain: pattern.domain,
                subjectPattern: null
              }
            },
            update: {
              category: pattern.category,
              customTag: pattern.customTag,
              confidence: pattern.confidence,
              occurrenceCount: { increment: domainData.emails.length }
            },
            create: {
              senderEmail: senderEmail,
              senderDomain: pattern.domain,
              senderName: senderName,
              category: pattern.category,
              customTag: pattern.customTag,
              confidence: pattern.confidence,
              occurrenceCount: domainData.emails.length,
              isAutoLearned: true,
              isUserApproved: false
            }
          });

          learnedPatterns.push({
            senderEmail,
            senderDomain: pattern.domain,
            senderName,
            subjectPattern: null,
            category: pattern.category,
            customTag: pattern.customTag,
            confidence: pattern.confidence
          });

          console.log(`📧 Learned pattern: ${pattern.domain} → ${pattern.customTag || pattern.category}`);
        } catch (error) {
          console.error(`Failed to save pattern for ${pattern.domain}:`, error);
        }
      }

      return learnedPatterns;
    } catch (error) {
      console.error('Error learning patterns from batch:', error);
      return [];
    }
  }

  /**
   * Get all learned patterns
   */
  async getLearnedPatterns(): Promise<Array<{
    id: string;
    senderDomain: string | null;
    senderName: string | null;
    category: string;
    customTag: string | null;
    occurrenceCount: number;
    confidence: number;
    isUserApproved: boolean;
    lastSeenAt: Date;
  }>> {
    const prisma = getPrisma();
    if (!prisma) return [];

    try {
      const patterns = await prisma.emailSenderPattern.findMany({
        where: {
          confidence: { gte: 0.5 }
        },
        orderBy: [
          { occurrenceCount: 'desc' },
          { confidence: 'desc' }
        ],
        take: 50
      });

      return patterns.map(p => ({
        id: p.id,
        senderDomain: p.senderDomain,
        senderName: p.senderName,
        category: p.category,
        customTag: p.customTag,
        occurrenceCount: p.occurrenceCount,
        confidence: p.confidence,
        isUserApproved: p.isUserApproved,
        lastSeenAt: p.lastSeenAt
      }));
    } catch (error) {
      console.error('Error getting learned patterns:', error);
      return [];
    }
  }

  /**
   * Approve a pattern (user confirms it's correct)
   */
  async approvePattern(patternId: string): Promise<boolean> {
    const prisma = getPrisma();
    if (!prisma) return false;

    try {
      await prisma.emailSenderPattern.update({
        where: { id: patternId },
        data: {
          isUserApproved: true,
          confidence: 1.0 // User approval means 100% confidence
        }
      });
      return true;
    } catch (error) {
      console.error('Error approving pattern:', error);
      return false;
    }
  }

  /**
   * Delete a pattern (user dismisses it)
   */
  async deletePattern(patternId: string): Promise<boolean> {
    const prisma = getPrisma();
    if (!prisma) return false;

    try {
      await prisma.emailSenderPattern.delete({
        where: { id: patternId }
      });
      return true;
    } catch (error) {
      console.error('Error deleting pattern:', error);
      return false;
    }
  }

  /**
   * Create a custom pattern (user-defined rule)
   */
  async createCustomPattern(
    senderDomainOrEmail: string,
    category: string,
    customTag?: string
  ): Promise<boolean> {
    const prisma = getPrisma();
    if (!prisma) return false;

    const isDomain = !senderDomainOrEmail.includes('@');
    
    try {
      await prisma.emailSenderPattern.create({
        data: {
          senderEmail: isDomain ? null : senderDomainOrEmail,
          senderDomain: isDomain ? senderDomainOrEmail : senderDomainOrEmail.split('@')[1],
          category,
          customTag,
          confidence: 1.0,
          isAutoLearned: false,
          isUserApproved: true
        }
      });
      return true;
    } catch (error) {
      console.error('Error creating custom pattern:', error);
      return false;
    }
  }
}

export const emailPatternService = new EmailPatternService();
export default emailPatternService;

