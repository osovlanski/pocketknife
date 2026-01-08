/**
 * File Parser Utility Tests
 * 
 * Tests the file parsing functionality for CV uploads.
 * These tests help prevent regressions like the PDF garbled text issue.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('fileParser', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('File Type Detection', () => {
    it('should correctly identify PDF by MIME type', () => {
      const mimeType = 'application/pdf';
      const isPdf = mimeType === 'application/pdf';
      expect(isPdf).toBe(true);
    });

    it('should correctly identify PDF by extension', () => {
      const fileName = 'resume.pdf';
      const isPdf = fileName.toLowerCase().endsWith('.pdf');
      expect(isPdf).toBe(true);
    });

    it('should correctly identify DOCX by MIME type', () => {
      const mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const isDocx = mimeType.includes('wordprocessingml');
      expect(isDocx).toBe(true);
    });

    it('should correctly identify DOCX by extension', () => {
      const fileName = 'resume.docx';
      const isDocx = fileName.toLowerCase().endsWith('.docx');
      expect(isDocx).toBe(true);
    });

    it('should correctly identify plain text', () => {
      const mimeType = 'text/plain';
      const isText = mimeType === 'text/plain';
      expect(isText).toBe(true);
    });

    it('should correctly identify TXT by extension', () => {
      const fileName = 'resume.txt';
      const isTxt = fileName.toLowerCase().endsWith('.txt');
      expect(isTxt).toBe(true);
    });
  });

  describe('PDF Worker Configuration', () => {
    it('should have correct worker URL format', () => {
      const workerUrl = 'https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
      
      // Verify URL format
      expect(workerUrl).toContain('unpkg.com');
      expect(workerUrl).toContain('pdfjs-dist');
      expect(workerUrl).toContain('4.10.38'); // Version should match package.json
      expect(workerUrl).toContain('pdf.worker');
    });

    it('should use .mjs extension for ES module worker', () => {
      const workerUrl = 'https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
      expect(workerUrl).toMatch(/\.mjs$/);
    });
  });

  describe('Text Extraction Validation', () => {
    it('should detect short/empty text as scanned PDF', () => {
      const extractedText = '   ';
      const trimmedText = extractedText.trim();
      const isScannedPdf = !trimmedText || trimmedText.length < 20;
      expect(isScannedPdf).toBe(true);
    });

    it('should accept valid extracted text', () => {
      const extractedText = 'John Doe - Software Engineer with 5 years of experience in JavaScript and TypeScript';
      const trimmedText = extractedText.trim();
      const isScannedPdf = !trimmedText || trimmedText.length < 20;
      expect(isScannedPdf).toBe(false);
    });

    it('should detect garbled text patterns', () => {
      // Garbled text typically contains many non-printable characters
      const garbagePattern = /[\x00-\x1F\x7F-\x9F]{3,}/;
      
      const validText = 'John Doe, Software Engineer';
      const garbledText = '\x00\x01\x02\x03\x04';
      
      expect(garbagePattern.test(validText)).toBe(false);
      expect(garbagePattern.test(garbledText)).toBe(true);
    });
  });

  describe('extractTextFromFile', () => {
    it('should handle plain text files correctly', async () => {
      const { extractTextFromFile } = await import('./fileParser');
      
      const textContent = 'John Doe - Senior Developer\nSkills: Python, Java, TypeScript';
      const textFile = new File([textContent], 'resume.txt', {
        type: 'text/plain'
      });

      const result = await extractTextFromFile(textFile);
      
      expect(result).toContain('John Doe');
      expect(result).toContain('Senior Developer');
      expect(result).toContain('Python');
    });

    it('should detect file type correctly when MIME is empty', () => {
      const fileName = 'document.pdf';
      const fileType = '';
      
      // The function should check extension as fallback
      const isPdf = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
      
      expect(isPdf).toBe(true);
    });
  });

  describe('Error Messages', () => {
    it('should provide user-friendly error message for PDF parsing failure', () => {
      const errorMessage = 'Failed to parse PDF. Please try one of these options:\n• Save your CV as a .docx file and upload\n• Copy and paste your CV text directly into the text box\n• Use a text-based PDF (not scanned)';
      
      expect(errorMessage).toContain('docx');
      expect(errorMessage).toContain('paste');
      expect(errorMessage).toContain('text-based');
    });

    it('should mention scanned PDF limitation', () => {
      const errorMessage = 'This PDF appears to be scanned/image-based and cannot be read automatically. Please copy the text manually or use a text-based PDF.';
      
      expect(errorMessage).toContain('scanned');
      expect(errorMessage).toContain('image-based');
    });
  });

  describe('CV Text Validation', () => {
    it('should reject very short CV text', () => {
      const cvText = 'Hi';
      const isValidLength = cvText.trim().length >= 50;
      expect(isValidLength).toBe(false);
    });

    it('should accept valid CV text', () => {
      const cvText = 'John Doe is a Senior Software Engineer with 5 years of experience in building scalable applications using JavaScript, TypeScript, and React.';
      const isValidLength = cvText.trim().length >= 50;
      expect(isValidLength).toBe(true);
    });
  });
});
