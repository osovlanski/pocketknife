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

// ToDo Agent Types
export interface Task {
    id: string;
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    dueDate?: string;
    dueTime?: string;
    duration?: number;
    isRecurring: boolean;
    recurrenceRule?: string;
    category?: string;
    tags: string[];
    syncEnabled: boolean;
    sourceType: 'manual' | 'routine' | 'suggested';
    confidence?: number;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface DailyAgenda {
    date: string;
    tasks: Task[];
    routineTasks: Task[];
    suggestedTasks: Task[];
    totalDuration: number;
    completedCount: number;
}

export interface RoutinePattern {
    id: string;
    patternName: string;
    description?: string;
    dayOfWeek: string[];
    timeSlot?: string;
    preferredTime?: string;
    taskTemplate: Record<string, unknown>;
    frequency: number;
    confidence: number;
    isApproved: boolean;
}

// Shopping Agent Types
export interface Product {
    id: string;
    title: string;
    description?: string;
    price: number;
    originalPrice?: number;
    currency: string;
    discount?: number;
    source: string;
    sourceUrl: string;
    sourceId?: string;
    imageUrl?: string;
    dealScore?: number;
    dealReason?: string;
    category?: string;
    tags: string[];
    isSaved: boolean;
    isPurchased: boolean;
    notifyOnDrop: boolean;
    targetPrice?: number;
    createdAt: string;
}

export interface ProductSuggestion {
    product: Product;
    reason: string;
    matchScore: number;
}

export interface PriceAlert {
    id: string;
    productId: string;
    targetPrice: number;
    currentPrice: number;
    isTriggered: boolean;
    triggeredAt?: string;
}

export interface UserInterest {
    type: 'hobby' | 'category' | 'brand' | 'keyword';
    value: string;
    weight?: number;
}