// shared/types.ts
export interface Email {
    id: string;
    subject: string;
    from: string;
    body: string;
}

export interface EmailAnalysis {
    category: 'INVOICE' | 'JOB_OFFER' | 'SPAM';
    confidence: number;
    suggested_filename?: string;
    reasoning: string;
}

export interface Config {
    whatsappNumber: string;
    checkInterval: number;
}

export interface Stats {
    invoices: number;
    jobOffers: number;
    spam: number;
    processed: number;
}

export interface LogEntry {
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: string;
}