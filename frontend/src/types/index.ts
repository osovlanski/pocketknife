// frontend/src/types/index.ts
export interface Email {
    id: string;
    subject: string;
    from: string;
    body: string;
}

export interface AnalysisResult {
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
    processed: number;
    invoices: number;
    jobOffers: number;
    spam: number;
}

export interface LogEntry {
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: string;
}

export interface JobListing {
    id: string;
    source: string;
    title: string;
    company: string;
    location: string;
    remote: boolean;
    description: string;
    applyUrl: string;
    salary?: string;
    postedAt: string;
    tags?: string[];
    companySize?: 'startup' | 'midsize' | 'enterprise';
    industry?: string[];
    experienceLevel?: 'junior' | 'mid' | 'senior';
    jobType?: 'fulltime' | 'contract' | 'freelance' | 'internship';
    matchScore?: number;
    matchedSkills?: string[];
    missingSkills?: string[];
    reasoning?: string;
}

export interface JobSearchFilters {
    companySize?: 'startup' | 'midsize' | 'enterprise' | 'any';
    industry?: 'fintech' | 'cybersecurity' | 'healthtech' | 'ecommerce' | 'saas' | 'ai' | 'gaming' | 'any';
    salaryMin?: number;
    salaryMax?: number;
    experienceLevel?: 'junior' | 'mid' | 'senior' | 'any';
    jobType?: 'fulltime' | 'contract' | 'freelance' | 'internship' | 'any';
}