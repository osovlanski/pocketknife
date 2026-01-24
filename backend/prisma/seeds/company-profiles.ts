/**
 * Seed script for CompanyProfile table
 * Migrates hardcoded company interview profiles from companyMappings.ts
 */

import { PrismaClient } from '@prisma/client';

interface CompanyProfileData {
  name: string;
  slug: string;
  focusAreas: string[];
  topCategories: string[];
  topTags: string[];
  difficultyBreakdown: { easy: number; medium: number; hard: number };
  interviewFocus?: { coding: number; system_design: number; behavioral: number };
  tips: string[];
}

const COMPANY_PROFILES: CompanyProfileData[] = [
  {
    name: 'Google',
    slug: 'google',
    focusAreas: ['Algorithms', 'System Design', 'Graph Problems', 'Dynamic Programming', 'Recursion'],
    topCategories: ['Graphs', 'Dynamic Programming', 'Trees', 'Binary Search', 'Arrays & Hashing'],
    topTags: ['Graph', 'DFS', 'BFS', 'Dynamic Programming', 'Binary Search', 'Recursion', 'Tree', 'Backtracking'],
    difficultyBreakdown: { easy: 10, medium: 50, hard: 40 },
    interviewFocus: { coding: 50, system_design: 30, behavioral: 20 },
    tips: [
      'Practice graph problems extensively - Google loves DFS/BFS',
      'Be ready to optimize your initial solution',
      'Think out loud and communicate your thought process',
      'Prepare for system design if interviewing for L4+'
    ]
  },
  {
    name: 'Amazon',
    slug: 'amazon',
    focusAreas: ['Arrays', 'Trees', 'Leadership Principles', 'System Design', 'OOP'],
    topCategories: ['Arrays & Hashing', 'Trees', 'Linked List', 'Dynamic Programming', 'Graphs'],
    topTags: ['Array', 'Tree', 'DFS', 'BFS', 'Hash Table', 'Sorting', 'Binary Search Tree', 'Heap'],
    difficultyBreakdown: { easy: 20, medium: 60, hard: 20 },
    interviewFocus: { coding: 40, system_design: 30, behavioral: 30 },
    tips: [
      'Know the 16 Leadership Principles inside out',
      'Practice STAR format for behavioral questions',
      'Focus on BFS/DFS tree traversals',
      'Be ready for system design (high-scale services)'
    ]
  },
  {
    name: 'Meta',
    slug: 'meta',
    focusAreas: ['Graphs', 'Dynamic Programming', 'String Manipulation', 'Trees', 'Social Network Problems'],
    topCategories: ['Graphs', 'Dynamic Programming', 'Trees', 'Arrays & Hashing', 'Backtracking'],
    topTags: ['Graph', 'DFS', 'BFS', 'Dynamic Programming', 'String', 'Tree', 'Recursion', 'Hash Table'],
    difficultyBreakdown: { easy: 15, medium: 55, hard: 30 },
    interviewFocus: { coding: 60, system_design: 25, behavioral: 15 },
    tips: [
      'Practice coding speed - Meta interviews are time-pressured',
      'Graph problems are very common (social network modeling)',
      'Be prepared for follow-up optimizations',
      'Know your data structures well'
    ]
  },
  {
    name: 'Microsoft',
    slug: 'microsoft',
    focusAreas: ['Arrays', 'Strings', 'Trees', 'Object-Oriented Design', 'System Design'],
    topCategories: ['Arrays & Hashing', 'Trees', 'Linked List', 'Stack', 'Dynamic Programming'],
    topTags: ['Array', 'String', 'Tree', 'Binary Tree', 'Hash Table', 'Stack', 'Design', 'OOP'],
    difficultyBreakdown: { easy: 25, medium: 55, hard: 20 },
    interviewFocus: { coding: 45, system_design: 30, behavioral: 25 },
    tips: [
      'Write clean, maintainable code',
      'Be ready for OOP design questions',
      'Practice tree problems extensively',
      'Understand basic system design concepts'
    ]
  },
  {
    name: 'Apple',
    slug: 'apple',
    focusAreas: ['Arrays', 'Strings', 'Linked Lists', 'Trees', 'iOS/Swift for mobile roles'],
    topCategories: ['Arrays & Hashing', 'Linked List', 'Trees', 'Dynamic Programming', 'Bit Manipulation'],
    topTags: ['Array', 'String', 'Linked List', 'Tree', 'Math', 'Bit Manipulation', 'Sorting'],
    difficultyBreakdown: { easy: 30, medium: 50, hard: 20 },
    interviewFocus: { coding: 50, system_design: 25, behavioral: 25 },
    tips: [
      'Strong fundamentals in data structures',
      'Be prepared for questions about memory and performance',
      'Practice linked list problems',
      'For iOS roles, know Swift deeply'
    ]
  },
  {
    name: 'Netflix',
    slug: 'netflix',
    focusAreas: ['System Design', 'Distributed Systems', 'Streaming Architecture', 'Caching'],
    topCategories: ['Graphs', 'Dynamic Programming', 'Arrays & Hashing', 'Trees'],
    topTags: ['Design', 'Graph', 'BFS', 'Cache', 'String', 'Array'],
    difficultyBreakdown: { easy: 10, medium: 50, hard: 40 },
    interviewFocus: { coding: 35, system_design: 45, behavioral: 20 },
    tips: [
      'Study Netflix culture deck thoroughly',
      'Be prepared for deep system design discussions',
      'Practice distributed systems concepts',
      'Focus on scalability and reliability'
    ]
  },
  {
    name: 'Uber',
    slug: 'uber',
    focusAreas: ['Graphs', 'Shortest Path', 'Geolocation', 'Real-time Systems', 'Rate Limiting'],
    topCategories: ['Graphs', 'Arrays & Hashing', 'Dynamic Programming', 'Heap', 'Math & Geometry'],
    topTags: ['Graph', 'Dijkstra', 'BFS', 'Heap', 'Design', 'Geometry', 'Hash Table'],
    difficultyBreakdown: { easy: 15, medium: 55, hard: 30 },
    interviewFocus: { coding: 45, system_design: 35, behavioral: 20 },
    tips: [
      'Practice graph shortest path algorithms (Dijkstra, A*)',
      'Understand rate limiting and caching',
      'Be ready for geo-spatial problems',
      'Study real-time system design'
    ]
  },
  {
    name: 'Airbnb',
    slug: 'airbnb',
    focusAreas: ['Dynamic Programming', 'Graphs', 'Design', 'String Processing', 'Search & Ranking'],
    topCategories: ['Dynamic Programming', 'Graphs', 'Arrays & Hashing', 'Trees', 'Backtracking'],
    topTags: ['Dynamic Programming', 'Graph', 'DFS', 'String', 'Design', 'Backtracking'],
    difficultyBreakdown: { easy: 10, medium: 50, hard: 40 },
    interviewFocus: { coding: 45, system_design: 30, behavioral: 25 },
    tips: [
      'Know Airbnb core values',
      'Practice DP problems extensively',
      'Be ready for search/ranking system design',
      'Prepare examples of working on ambiguous problems'
    ]
  },
  {
    name: 'Stripe',
    slug: 'stripe',
    focusAreas: ['Payments', 'API Design', 'String Processing', 'State Machines', 'Consistency'],
    topCategories: ['Arrays & Hashing', 'Stack', 'String', 'Design', 'Dynamic Programming'],
    topTags: ['String', 'Parsing', 'Design', 'State Machine', 'API', 'Hash Table'],
    difficultyBreakdown: { easy: 20, medium: 60, hard: 20 },
    interviewFocus: { coding: 50, system_design: 35, behavioral: 15 },
    tips: [
      'Practice string parsing problems',
      'Understand payment systems basics',
      'Focus on clean code and error handling',
      'Be ready for API design discussions'
    ]
  },
  {
    name: 'Twitter/X',
    slug: 'twitter',
    focusAreas: ['Timelines', 'Feeds', 'Caching', 'Real-time Data', 'Graphs'],
    topCategories: ['Graphs', 'Heap', 'Design', 'Arrays & Hashing'],
    topTags: ['Design', 'Heap', 'Graph', 'Cache', 'Queue', 'Hash Table'],
    difficultyBreakdown: { easy: 15, medium: 55, hard: 30 },
    interviewFocus: { coding: 45, system_design: 35, behavioral: 20 },
    tips: [
      'Understand feed/timeline algorithms',
      'Practice heap problems',
      'Study Twitter system design',
      'Be ready for real-time data processing questions'
    ]
  },
  {
    name: 'LinkedIn',
    slug: 'linkedin',
    focusAreas: ['Graphs', 'Connections', 'Recommendation Systems', 'Search', 'Feeds'],
    topCategories: ['Graphs', 'Dynamic Programming', 'Trees', 'Arrays & Hashing'],
    topTags: ['Graph', 'BFS', 'DFS', 'Tree', 'Hash Table', 'Design'],
    difficultyBreakdown: { easy: 20, medium: 55, hard: 25 },
    interviewFocus: { coding: 45, system_design: 35, behavioral: 20 },
    tips: [
      'Practice graph connectivity problems',
      'Understand recommendation systems basics',
      'Study BFS for degree of separation problems',
      'Be ready for system design (LinkedIn features)'
    ]
  },
  {
    name: 'Salesforce',
    slug: 'salesforce',
    focusAreas: ['Arrays', 'Strings', 'Trees', 'Design Patterns', 'CRM concepts'],
    topCategories: ['Arrays & Hashing', 'Trees', 'Dynamic Programming', 'Stack'],
    topTags: ['Array', 'String', 'Tree', 'Design', 'Hash Table'],
    difficultyBreakdown: { easy: 30, medium: 50, hard: 20 },
    interviewFocus: { coding: 45, system_design: 25, behavioral: 30 },
    tips: [
      'Know design patterns well',
      'Practice medium-level problems',
      'Be ready for behavioral questions',
      'Understand Salesforce products at a high level'
    ]
  },
  {
    name: 'NVIDIA',
    slug: 'nvidia',
    focusAreas: ['Arrays', 'Bit Manipulation', 'Math', 'Parallel Computing', 'Memory'],
    topCategories: ['Bit Manipulation', 'Arrays & Hashing', 'Math & Geometry', 'Dynamic Programming'],
    topTags: ['Bit Manipulation', 'Array', 'Math', 'Matrix', 'Memory'],
    difficultyBreakdown: { easy: 25, medium: 50, hard: 25 },
    interviewFocus: { coding: 55, system_design: 25, behavioral: 20 },
    tips: [
      'Practice bit manipulation extensively',
      'Understand GPU/parallel computing basics',
      'Review memory management concepts',
      'For CUDA roles, know parallel programming'
    ]
  },
  {
    name: 'Bloomberg',
    slug: 'bloomberg',
    focusAreas: ['Finance', 'Real-time Data', 'Queues', 'Design', 'OOP'],
    topCategories: ['Stack', 'Arrays & Hashing', 'Heap', 'Design', 'Linked List'],
    topTags: ['Stack', 'Queue', 'Design', 'OOP', 'Heap', 'Array'],
    difficultyBreakdown: { easy: 25, medium: 55, hard: 20 },
    interviewFocus: { coding: 50, system_design: 30, behavioral: 20 },
    tips: [
      'Practice stack and queue problems',
      'Understand real-time data concepts',
      'Know OOP design patterns',
      'Be ready for system design focused on financial data'
    ]
  },
  {
    name: 'Spotify',
    slug: 'spotify',
    focusAreas: ['Recommendation Systems', 'Graphs', 'Streaming', 'Search', 'Personalization'],
    topCategories: ['Graphs', 'Arrays & Hashing', 'Dynamic Programming', 'Design'],
    topTags: ['Graph', 'Hash Table', 'Design', 'Sorting', 'Search'],
    difficultyBreakdown: { easy: 20, medium: 55, hard: 25 },
    interviewFocus: { coding: 45, system_design: 35, behavioral: 20 },
    tips: [
      'Understand recommendation system basics',
      'Practice graph problems',
      'Study audio streaming architecture',
      'Be ready for personalization system design'
    ]
  },
  {
    name: 'Adobe',
    slug: 'adobe',
    focusAreas: ['Arrays', 'Strings', 'Design', 'OOP', 'Creative Tools'],
    topCategories: ['Arrays & Hashing', 'Dynamic Programming', 'Trees', 'Design'],
    topTags: ['Array', 'String', 'Design', 'OOP', 'Tree'],
    difficultyBreakdown: { easy: 30, medium: 50, hard: 20 },
    interviewFocus: { coding: 45, system_design: 25, behavioral: 30 },
    tips: [
      'Practice medium-level problems',
      'Know design patterns',
      'Be ready for OOP design questions',
      'Understand document/image processing basics'
    ]
  },
  {
    name: 'Coinbase',
    slug: 'coinbase',
    focusAreas: ['Crypto', 'Blockchain', 'Security', 'Graphs', 'Distributed Systems'],
    topCategories: ['Graphs', 'Arrays & Hashing', 'Dynamic Programming', 'Design'],
    topTags: ['Graph', 'Hash Table', 'Design', 'Security', 'Distributed'],
    difficultyBreakdown: { easy: 15, medium: 55, hard: 30 },
    interviewFocus: { coding: 45, system_design: 35, behavioral: 20 },
    tips: [
      'Understand blockchain basics',
      'Practice graph problems',
      'Study distributed consensus',
      'Be ready for security-focused questions'
    ]
  },
  {
    name: 'Dropbox',
    slug: 'dropbox',
    focusAreas: ['File Systems', 'Sync', 'Distributed Systems', 'Trees', 'Design'],
    topCategories: ['Trees', 'Design', 'Arrays & Hashing', 'Graphs'],
    topTags: ['Tree', 'Design', 'File System', 'Hash Table', 'Sync'],
    difficultyBreakdown: { easy: 15, medium: 55, hard: 30 },
    interviewFocus: { coding: 45, system_design: 40, behavioral: 15 },
    tips: [
      'Study file system concepts',
      'Practice tree problems',
      'Understand sync/conflict resolution',
      'Be ready for distributed storage design'
    ]
  },
  {
    name: 'DoorDash',
    slug: 'doordash',
    focusAreas: ['Logistics', 'Graphs', 'Real-time', 'Optimization', 'Matching'],
    topCategories: ['Graphs', 'Heap', 'Arrays & Hashing', 'Dynamic Programming'],
    topTags: ['Graph', 'Heap', 'Design', 'Optimization', 'BFS'],
    difficultyBreakdown: { easy: 15, medium: 55, hard: 30 },
    interviewFocus: { coding: 45, system_design: 35, behavioral: 20 },
    tips: [
      'Practice graph shortest path problems',
      'Understand matching algorithms',
      'Study delivery optimization',
      'Be ready for real-time system design'
    ]
  },
  {
    name: 'TikTok',
    slug: 'tiktok',
    focusAreas: ['Recommendation', 'Video', 'Graphs', 'Machine Learning', 'Feeds'],
    topCategories: ['Graphs', 'Dynamic Programming', 'Arrays & Hashing', 'Design'],
    topTags: ['Graph', 'Dynamic Programming', 'Design', 'ML', 'Feed'],
    difficultyBreakdown: { easy: 10, medium: 50, hard: 40 },
    interviewFocus: { coding: 50, system_design: 30, behavioral: 20 },
    tips: [
      'Practice hard DP problems',
      'Understand recommendation systems',
      'Study video processing basics',
      'Be ready for ML-related questions'
    ]
  }
];

export async function seedCompanyProfiles(prisma: PrismaClient): Promise<number> {
  let count = 0;

  for (const profile of COMPANY_PROFILES) {
    try {
      await (prisma as any).companyProfile.upsert({
        where: { slug: profile.slug },
        update: {
          name: profile.name,
          focusAreas: profile.focusAreas,
          topCategories: profile.topCategories,
          topTags: profile.topTags,
          difficultyBreakdown: profile.difficultyBreakdown,
          interviewFocus: profile.interviewFocus,
          tips: profile.tips,
          isActive: true
        },
        create: {
          name: profile.name,
          slug: profile.slug,
          focusAreas: profile.focusAreas,
          topCategories: profile.topCategories,
          topTags: profile.topTags,
          difficultyBreakdown: profile.difficultyBreakdown,
          interviewFocus: profile.interviewFocus,
          tips: profile.tips,
          isActive: true,
          isVerified: true
        }
      });
      count++;
    } catch (error) {
      console.warn(`Failed to seed company profile ${profile.name}:`, error);
    }
  }

  return count;
}
