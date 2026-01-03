/**
 * Extract text from different file types
 */

// Initialize PDF.js worker once
let pdfWorkerInitialized = false;

export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  // Handle PDF files
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return await extractTextFromPDF(file);
  }

  // Handle Word documents
  if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType === 'application/msword' ||
    fileName.endsWith('.docx') ||
    fileName.endsWith('.doc')
  ) {
    return await extractTextFromWord(file);
  }

  // Handle plain text files
  if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    return await readAsText(file);
  }

  // Default: try to read as text
  return await readAsText(file);
}

async function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Dynamically import pdfjs-dist
    const pdfjs = await import('pdfjs-dist');
    
    // Configure worker - use CDN for pdfjs-dist v4.x
    if (!pdfWorkerInitialized) {
      // Use CDN worker that matches our installed version (4.4.168)
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
      pdfWorkerInitialized = true;
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(arrayBuffer),
    });
    
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    // Check if we got any meaningful text
    const trimmedText = fullText.trim();
    if (!trimmedText || trimmedText.length < 20) {
      throw new Error('scanned-pdf');
    }
    
    return trimmedText;
  } catch (error: any) {
    console.error('Error parsing PDF:', error);
    
    // Provide more helpful error messages
    if (error.message === 'scanned-pdf') {
      throw new Error('This PDF appears to be scanned/image-based and cannot be read automatically. Please copy the text manually or use a text-based PDF.');
    }
    
    // Try alternative approach with a fallback
    console.log('Primary PDF parsing failed, trying fallback...');
    return await extractTextFromPDFFallback(file);
  }
}

/**
 * Fallback PDF extraction using a simpler approach
 */
async function extractTextFromPDFFallback(file: File): Promise<string> {
  try {
    // Use a simpler approach - try to read as text (works for some PDFs)
    const text = await readAsText(file);
    
    // Try to extract readable text from binary PDF
    // PDFs often have text content between stream markers
    const textMatches = text.match(/\((.*?)\)/g);
    if (textMatches && textMatches.length > 10) {
      const extractedText = textMatches
        .map(m => m.slice(1, -1))
        .filter(t => t.length > 0 && /[a-zA-Z]/.test(t))
        .join(' ');
      
      if (extractedText.length > 100) {
        return extractedText;
      }
    }
    
    throw new Error('Could not extract text');
  } catch {
    throw new Error('Failed to parse PDF. Please try one of these options:\n• Save your CV as a .docx file and upload\n• Copy and paste your CV text directly into the text box\n• Use a text-based PDF (not scanned)');
  }
}

async function extractTextFromWord(file: File): Promise<string> {
  try {
    // Use mammoth library for .docx files
    const mammoth = await import('mammoth') as any;
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error('Error parsing Word document:', error);
    throw new Error('Failed to parse Word document. Please try uploading as a .txt file or paste the text directly.');
  }
}
