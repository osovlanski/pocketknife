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

// =============================================================================
// STRUCTURED DATA CARDS
// =============================================================================

export interface JobCard {
    type: 'job';
    title: string;
    company: string;
    location?: string;
    matchScore?: number;
    url?: string;
    salary?: string;
    source?: string;
}

export interface RecipeCard {
    type: 'recipe';
    title: string;
    prepTime?: string;
    cookTime?: string;
    servings?: number;
    matchPercentage?: number;
    missingIngredients?: string[];
    imageUrl?: string;
    sourceUrl?: string;
}

export interface FlightCard {
    type: 'flight';
    airline: string;
    origin: string;
    destination: string;
    price?: string;
    stops?: number;
    departTime?: string;
    arriveTime?: string;
    bookingUrl?: string;
}

export interface TaskCard {
    type: 'task';
    title: string;
    completed: boolean;
    priority?: 'low' | 'medium' | 'high';
    dueDate?: string;
    taskId?: string;
}

export interface ProductCard {
    type: 'product';
    name: string;
    price?: string;
    originalPrice?: string;
    source?: string;
    url?: string;
    imageUrl?: string;
}

export type StructuredCard = JobCard | RecipeCard | FlightCard | TaskCard | ProductCard;