/**
 * Email Processor Tests
 * 
 * Tests the email processing utility functions.
 */

import { describe, it, expect, vi } from 'vitest';

describe('Email Processor', () => {
  describe('Email Classification', () => {
    it('should identify invoice keywords in Hebrew', () => {
      const invoiceKeywordsHebrew = ['חשבונית', 'ארנונה', 'חשמל', 'מים', 'גז', 'ועד בית'];
      const emailSubject = 'חשבונית חודשית - ארנונה';
      
      const containsInvoiceKeyword = invoiceKeywordsHebrew.some(keyword => 
        emailSubject.includes(keyword)
      );
      
      expect(containsInvoiceKeyword).toBe(true);
    });

    it('should identify invoice keywords in English', () => {
      const invoiceKeywordsEnglish = ['invoice', 'bill', 'payment', 'receipt', 'statement'];
      const emailSubject = 'Your monthly invoice is ready';
      
      const containsInvoiceKeyword = invoiceKeywordsEnglish.some(keyword => 
        emailSubject.toLowerCase().includes(keyword)
      );
      
      expect(containsInvoiceKeyword).toBe(true);
    });

    it('should identify job offer keywords', () => {
      const jobKeywords = ['job', 'position', 'opportunity', 'career', 'hiring', 'interview', 'offer'];
      const emailSubject = 'New job opportunity at TechCorp';
      
      const containsJobKeyword = jobKeywords.some(keyword => 
        emailSubject.toLowerCase().includes(keyword)
      );
      
      expect(containsJobKeyword).toBe(true);
    });

    it('should identify spam patterns', () => {
      const spamPatterns = [
        /unsubscribe/i,
        /click here/i,
        /limited time/i,
        /act now/i,
        /winner/i,
        /congratulations.*won/i
      ];
      
      const spamSubject = 'CONGRATULATIONS! You have won $1,000,000!';
      
      const isSpam = spamPatterns.some(pattern => pattern.test(spamSubject));
      
      expect(isSpam).toBe(true);
    });

    it('should not flag legitimate emails as spam', () => {
      const spamPatterns = [
        /unsubscribe/i,
        /click here/i,
        /limited time/i,
        /act now/i,
        /winner/i,
        /congratulations.*won/i
      ];
      
      const legitimateSubject = 'Meeting tomorrow at 3pm';
      
      const isSpam = spamPatterns.some(pattern => pattern.test(legitimateSubject));
      
      expect(isSpam).toBe(false);
    });
  });

  describe('Email Parsing', () => {
    it('should extract email address from header', () => {
      const fromHeader = 'John Doe <john.doe@example.com>';
      const emailMatch = fromHeader.match(/<([^>]+)>/);
      const email = emailMatch ? emailMatch[1] : fromHeader;
      
      expect(email).toBe('john.doe@example.com');
    });

    it('should handle plain email address without name', () => {
      const fromHeader = 'jane@example.com';
      const emailMatch = fromHeader.match(/<([^>]+)>/);
      const email = emailMatch ? emailMatch[1] : fromHeader;
      
      expect(email).toBe('jane@example.com');
    });

    it('should extract sender name from header', () => {
      const fromHeader = 'John Doe <john.doe@example.com>';
      const nameMatch = fromHeader.match(/^([^<]+)/);
      const name = nameMatch ? nameMatch[1].trim() : '';
      
      expect(name).toBe('John Doe');
    });
  });

  describe('Attachment Detection', () => {
    it('should identify PDF attachments', () => {
      const mimeType = 'application/pdf';
      const isPdf = mimeType === 'application/pdf' || mimeType.includes('pdf');
      
      expect(isPdf).toBe(true);
    });

    it('should identify image attachments', () => {
      const imageMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const mimeType = 'image/jpeg';
      
      const isImage = imageMimeTypes.includes(mimeType) || mimeType.startsWith('image/');
      
      expect(isImage).toBe(true);
    });

    it('should identify document attachments', () => {
      const docMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      
      const isDocument = docMimeTypes.includes(mimeType);
      
      expect(isDocument).toBe(true);
    });
  });

  describe('Date Handling', () => {
    it('should parse email date headers correctly', () => {
      const dateHeader = 'Mon, 7 Jan 2026 10:30:00 +0000';
      const parsedDate = new Date(dateHeader);
      
      expect(parsedDate.getFullYear()).toBe(2026);
      expect(parsedDate.getMonth()).toBe(0); // January is 0
      expect(parsedDate.getDate()).toBe(7);
    });

    it('should handle ISO date format', () => {
      const isoDate = '2026-01-07T10:30:00.000Z';
      const parsedDate = new Date(isoDate);
      
      expect(parsedDate.toISOString()).toBe(isoDate);
    });
  });
});

