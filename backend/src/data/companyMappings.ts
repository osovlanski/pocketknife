/**
 * Company-to-Topic Mapping Database
 * 
 * Maps tech companies to their commonly asked problem types,
 * interview patterns, and focus areas.
 */

export interface CompanyInterviewProfile {
  name: string;
  aliases: string[];
  focusAreas: string[];
  topCategories: string[];
  topTags: string[];
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  interviewStyle: string;
  tips: string[];
}

export const COMPANY_PROFILES: Record<string, CompanyInterviewProfile> = {
  google: {
    name: 'Google',
    aliases: ['alphabet', 'goog', 'youtube', 'deepmind', 'waymo'],
    focusAreas: ['Algorithms', 'System Design', 'Graph Problems', 'Dynamic Programming', 'Recursion'],
    topCategories: ['Graphs', 'Dynamic Programming', 'Trees', 'Binary Search', 'Arrays & Hashing'],
    topTags: ['Graph', 'DFS', 'BFS', 'Dynamic Programming', 'Binary Search', 'Recursion', 'Tree', 'Backtracking'],
    difficultyDistribution: { easy: 10, medium: 50, hard: 40 },
    interviewStyle: 'Focus on optimal solutions, expect follow-up questions about time/space complexity. Emphasis on clean code and edge cases.',
    tips: [
      'Practice graph problems extensively - Google loves DFS/BFS',
      'Be ready to optimize your initial solution',
      'Think out loud and communicate your thought process',
      'Prepare for system design if interviewing for L4+'
    ]
  },
  
  amazon: {
    name: 'Amazon',
    aliases: ['aws', 'amzn', 'twitch', 'whole foods', 'ring'],
    focusAreas: ['Arrays', 'Trees', 'Leadership Principles', 'System Design', 'OOP'],
    topCategories: ['Arrays & Hashing', 'Trees', 'Linked List', 'Dynamic Programming', 'Graphs'],
    topTags: ['Array', 'Tree', 'DFS', 'BFS', 'Hash Table', 'Sorting', 'Binary Search Tree', 'Heap'],
    difficultyDistribution: { easy: 20, medium: 60, hard: 20 },
    interviewStyle: 'Behavioral questions tied to Leadership Principles are crucial. Coding focuses on practical problem-solving.',
    tips: [
      'Know the 16 Leadership Principles inside out',
      'Practice STAR format for behavioral questions',
      'Focus on BFS/DFS tree traversals',
      'Be ready for system design (high-scale services)'
    ]
  },
  
  meta: {
    name: 'Meta',
    aliases: ['facebook', 'fb', 'instagram', 'whatsapp', 'oculus'],
    focusAreas: ['Graphs', 'Dynamic Programming', 'String Manipulation', 'Trees', 'Social Network Problems'],
    topCategories: ['Graphs', 'Dynamic Programming', 'Trees', 'Arrays & Hashing', 'Backtracking'],
    topTags: ['Graph', 'DFS', 'BFS', 'Dynamic Programming', 'String', 'Tree', 'Recursion', 'Hash Table'],
    difficultyDistribution: { easy: 15, medium: 55, hard: 30 },
    interviewStyle: 'Fast-paced, expect to solve 2 problems in 45 minutes. Clean, bug-free code is essential.',
    tips: [
      'Practice coding speed - Meta interviews are time-pressured',
      'Graph problems are very common (social network modeling)',
      'Be prepared for follow-up optimizations',
      'Know your data structures well'
    ]
  },
  
  microsoft: {
    name: 'Microsoft',
    aliases: ['msft', 'azure', 'linkedin', 'github', 'xbox'],
    focusAreas: ['Arrays', 'Strings', 'Trees', 'Object-Oriented Design', 'System Design'],
    topCategories: ['Arrays & Hashing', 'Trees', 'Linked List', 'Stack', 'Dynamic Programming'],
    topTags: ['Array', 'String', 'Tree', 'Binary Tree', 'Hash Table', 'Stack', 'Design', 'OOP'],
    difficultyDistribution: { easy: 25, medium: 55, hard: 20 },
    interviewStyle: 'Focus on writing production-quality code. Emphasis on OOP principles and design patterns.',
    tips: [
      'Write clean, maintainable code',
      'Be ready for OOP design questions',
      'Practice tree problems extensively',
      'Understand basic system design concepts'
    ]
  },
  
  apple: {
    name: 'Apple',
    aliases: ['aapl'],
    focusAreas: ['Arrays', 'Strings', 'Linked Lists', 'Trees', 'iOS/Swift for mobile roles'],
    topCategories: ['Arrays & Hashing', 'Linked List', 'Trees', 'Dynamic Programming', 'Bit Manipulation'],
    topTags: ['Array', 'String', 'Linked List', 'Tree', 'Math', 'Bit Manipulation', 'Sorting'],
    difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
    interviewStyle: 'Focus on fundamentals and attention to detail. May ask about memory management and low-level concepts.',
    tips: [
      'Strong fundamentals in data structures',
      'Be prepared for questions about memory and performance',
      'Practice linked list problems',
      'For iOS roles, know Swift deeply'
    ]
  },
  
  netflix: {
    name: 'Netflix',
    aliases: ['nflx'],
    focusAreas: ['System Design', 'Distributed Systems', 'Streaming Architecture', 'Caching'],
    topCategories: ['Graphs', 'Dynamic Programming', 'Arrays & Hashing', 'Trees'],
    topTags: ['Design', 'Graph', 'BFS', 'Cache', 'String', 'Array'],
    difficultyDistribution: { easy: 10, medium: 50, hard: 40 },
    interviewStyle: 'Heavy focus on system design and cultural fit. Coding interviews focus on algorithms.',
    tips: [
      'Study Netflix culture deck thoroughly',
      'Be prepared for deep system design discussions',
      'Practice distributed systems concepts',
      'Focus on scalability and reliability'
    ]
  },
  
  uber: {
    name: 'Uber',
    aliases: ['uber eats'],
    focusAreas: ['Graphs', 'Shortest Path', 'Geolocation', 'Real-time Systems', 'Rate Limiting'],
    topCategories: ['Graphs', 'Arrays & Hashing', 'Dynamic Programming', 'Heap', 'Math & Geometry'],
    topTags: ['Graph', 'Dijkstra', 'BFS', 'Heap', 'Design', 'Geometry', 'Hash Table'],
    difficultyDistribution: { easy: 15, medium: 55, hard: 30 },
    interviewStyle: 'Focus on practical problems related to ride-sharing, mapping, and real-time systems.',
    tips: [
      'Practice graph shortest path algorithms (Dijkstra, A*)',
      'Understand rate limiting and caching',
      'Be ready for geo-spatial problems',
      'Study real-time system design'
    ]
  },
  
  airbnb: {
    name: 'Airbnb',
    aliases: ['abnb'],
    focusAreas: ['Dynamic Programming', 'Graphs', 'Design', 'String Processing', 'Search & Ranking'],
    topCategories: ['Dynamic Programming', 'Graphs', 'Arrays & Hashing', 'Trees', 'Backtracking'],
    topTags: ['Dynamic Programming', 'Graph', 'DFS', 'String', 'Design', 'Backtracking'],
    difficultyDistribution: { easy: 10, medium: 50, hard: 40 },
    interviewStyle: 'Focus on practical, real-world problems. Strong emphasis on cultural fit and core values.',
    tips: [
      'Know Airbnb core values',
      'Practice DP problems extensively',
      'Be ready for search/ranking system design',
      'Prepare examples of working on ambiguous problems'
    ]
  },
  
  stripe: {
    name: 'Stripe',
    aliases: [],
    focusAreas: ['Payments', 'API Design', 'String Processing', 'State Machines', 'Consistency'],
    topCategories: ['Arrays & Hashing', 'Stack', 'String', 'Design', 'Dynamic Programming'],
    topTags: ['String', 'Parsing', 'Design', 'State Machine', 'API', 'Hash Table'],
    difficultyDistribution: { easy: 20, medium: 60, hard: 20 },
    interviewStyle: 'Practical, real-world problems. Focus on edge cases, error handling, and API design.',
    tips: [
      'Practice string parsing problems',
      'Understand payment systems basics',
      'Focus on clean code and error handling',
      'Be ready for API design discussions'
    ]
  },
  
  twitter: {
    name: 'Twitter/X',
    aliases: ['x', 'x.com'],
    focusAreas: ['Timelines', 'Feeds', 'Caching', 'Real-time Data', 'Graphs'],
    topCategories: ['Graphs', 'Heap', 'Design', 'Arrays & Hashing'],
    topTags: ['Design', 'Heap', 'Graph', 'Cache', 'Queue', 'Hash Table'],
    difficultyDistribution: { easy: 15, medium: 55, hard: 30 },
    interviewStyle: 'Mix of algorithmic problems and system design focused on social media concepts.',
    tips: [
      'Understand feed/timeline algorithms',
      'Practice heap problems',
      'Study Twitter system design',
      'Be ready for real-time data processing questions'
    ]
  },
  
  linkedin: {
    name: 'LinkedIn',
    aliases: [],
    focusAreas: ['Graphs', 'Connections', 'Recommendation Systems', 'Search', 'Feeds'],
    topCategories: ['Graphs', 'Dynamic Programming', 'Trees', 'Arrays & Hashing'],
    topTags: ['Graph', 'BFS', 'DFS', 'Tree', 'Hash Table', 'Design'],
    difficultyDistribution: { easy: 20, medium: 55, hard: 25 },
    interviewStyle: 'Focus on social network problems and graph algorithms. Part of Microsoft interview process.',
    tips: [
      'Practice graph connectivity problems',
      'Understand recommendation systems basics',
      'Study BFS for degree of separation problems',
      'Be ready for system design (LinkedIn features)'
    ]
  },
  
  salesforce: {
    name: 'Salesforce',
    aliases: ['sfdc', 'slack', 'mulesoft', 'tableau'],
    focusAreas: ['Arrays', 'Strings', 'Trees', 'Design Patterns', 'CRM concepts'],
    topCategories: ['Arrays & Hashing', 'Trees', 'Dynamic Programming', 'Stack'],
    topTags: ['Array', 'String', 'Tree', 'Design', 'Hash Table'],
    difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
    interviewStyle: 'Focus on clean code, design patterns, and cultural fit. Less intense than FAANG.',
    tips: [
      'Know design patterns well',
      'Practice medium-level problems',
      'Be ready for behavioral questions',
      'Understand Salesforce products at a high level'
    ]
  },
  
  oracle: {
    name: 'Oracle',
    aliases: ['orcl'],
    focusAreas: ['Databases', 'SQL', 'Trees', 'Arrays', 'OOP'],
    topCategories: ['Trees', 'Arrays & Hashing', 'Dynamic Programming', 'Database'],
    topTags: ['Tree', 'Array', 'SQL', 'Database', 'OOP', 'Design'],
    difficultyDistribution: { easy: 35, medium: 50, hard: 15 },
    interviewStyle: 'Mix of coding and database questions. Focus on fundamentals and OOP.',
    tips: [
      'Review SQL thoroughly',
      'Practice tree problems',
      'Know OOP principles',
      'Be ready for database design questions'
    ]
  },
  
  nvidia: {
    name: 'NVIDIA',
    aliases: ['nvda'],
    focusAreas: ['Arrays', 'Bit Manipulation', 'Math', 'Parallel Computing', 'Memory'],
    topCategories: ['Bit Manipulation', 'Arrays & Hashing', 'Math & Geometry', 'Dynamic Programming'],
    topTags: ['Bit Manipulation', 'Array', 'Math', 'Matrix', 'Memory'],
    difficultyDistribution: { easy: 25, medium: 50, hard: 25 },
    interviewStyle: 'Focus on low-level programming concepts, memory management, and parallel algorithms.',
    tips: [
      'Practice bit manipulation extensively',
      'Understand GPU/parallel computing basics',
      'Review memory management concepts',
      'For CUDA roles, know parallel programming'
    ]
  },
  
  bloomberg: {
    name: 'Bloomberg',
    aliases: ['bberg'],
    focusAreas: ['Finance', 'Real-time Data', 'Queues', 'Design', 'OOP'],
    topCategories: ['Stack', 'Arrays & Hashing', 'Heap', 'Design', 'Linked List'],
    topTags: ['Stack', 'Queue', 'Design', 'OOP', 'Heap', 'Array'],
    difficultyDistribution: { easy: 25, medium: 55, hard: 20 },
    interviewStyle: 'Practical problems with focus on real-time data processing and clean OOP code.',
    tips: [
      'Practice stack and queue problems',
      'Understand real-time data concepts',
      'Know OOP design patterns',
      'Be ready for system design focused on financial data'
    ]
  },
  
  snap: {
    name: 'Snap',
    aliases: ['snapchat'],
    focusAreas: ['Media Processing', 'Real-time', 'Mobile', 'Graphs', 'Design'],
    topCategories: ['Graphs', 'Arrays & Hashing', 'Dynamic Programming', 'Design'],
    topTags: ['Graph', 'Array', 'Design', 'BFS', 'DFS'],
    difficultyDistribution: { easy: 20, medium: 55, hard: 25 },
    interviewStyle: 'Mix of algorithms and mobile-focused problems. Strong cultural fit emphasis.',
    tips: [
      'Practice graph problems',
      'For mobile roles, know platform-specific concepts',
      'Be ready for media processing discussions',
      'Understand ephemeral content systems'
    ]
  },
  
  spotify: {
    name: 'Spotify',
    aliases: [],
    focusAreas: ['Recommendation Systems', 'Graphs', 'Streaming', 'Search', 'Personalization'],
    topCategories: ['Graphs', 'Arrays & Hashing', 'Dynamic Programming', 'Design'],
    topTags: ['Graph', 'Hash Table', 'Design', 'Sorting', 'Search'],
    difficultyDistribution: { easy: 20, medium: 55, hard: 25 },
    interviewStyle: 'Focus on music/recommendation-related problems and system design.',
    tips: [
      'Understand recommendation system basics',
      'Practice graph problems',
      'Study audio streaming architecture',
      'Be ready for personalization system design'
    ]
  },
  
  adobe: {
    name: 'Adobe',
    aliases: [],
    focusAreas: ['Arrays', 'Strings', 'Design', 'OOP', 'Creative Tools'],
    topCategories: ['Arrays & Hashing', 'Dynamic Programming', 'Trees', 'Design'],
    topTags: ['Array', 'String', 'Design', 'OOP', 'Tree'],
    difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
    interviewStyle: 'Focus on clean code, design, and creativity. Less intense than FAANG.',
    tips: [
      'Practice medium-level problems',
      'Know design patterns',
      'Be ready for OOP design questions',
      'Understand document/image processing basics'
    ]
  },
  
  intuit: {
    name: 'Intuit',
    aliases: ['turbotax', 'quickbooks', 'mint', 'credit karma'],
    focusAreas: ['Finance', 'Taxes', 'Arrays', 'Strings', 'Design'],
    topCategories: ['Arrays & Hashing', 'Dynamic Programming', 'Trees', 'Design'],
    topTags: ['Array', 'String', 'Design', 'Math', 'Hash Table'],
    difficultyDistribution: { easy: 35, medium: 50, hard: 15 },
    interviewStyle: 'Practical problems with focus on financial calculations and data processing.',
    tips: [
      'Practice financial calculation problems',
      'Know design patterns',
      'Be ready for data validation problems',
      'Understand basic tax/finance concepts'
    ]
  },
  
  paypal: {
    name: 'PayPal',
    aliases: ['pypl', 'venmo', 'braintree'],
    focusAreas: ['Payments', 'Security', 'Arrays', 'Strings', 'Design'],
    topCategories: ['Arrays & Hashing', 'Dynamic Programming', 'Design', 'Graphs'],
    topTags: ['Array', 'String', 'Design', 'Security', 'Hash Table'],
    difficultyDistribution: { easy: 30, medium: 50, hard: 20 },
    interviewStyle: 'Focus on payment systems, security, and practical problem-solving.',
    tips: [
      'Understand payment processing basics',
      'Practice string parsing problems',
      'Be ready for security-focused questions',
      'Study fraud detection concepts'
    ]
  },
  
  coinbase: {
    name: 'Coinbase',
    aliases: ['coin'],
    focusAreas: ['Crypto', 'Blockchain', 'Security', 'Graphs', 'Distributed Systems'],
    topCategories: ['Graphs', 'Arrays & Hashing', 'Dynamic Programming', 'Design'],
    topTags: ['Graph', 'Hash Table', 'Design', 'Security', 'Distributed'],
    difficultyDistribution: { easy: 15, medium: 55, hard: 30 },
    interviewStyle: 'Focus on security, distributed systems, and blockchain concepts.',
    tips: [
      'Understand blockchain basics',
      'Practice graph problems',
      'Study distributed consensus',
      'Be ready for security-focused questions'
    ]
  },
  
  dropbox: {
    name: 'Dropbox',
    aliases: ['dbx'],
    focusAreas: ['File Systems', 'Sync', 'Distributed Systems', 'Trees', 'Design'],
    topCategories: ['Trees', 'Design', 'Arrays & Hashing', 'Graphs'],
    topTags: ['Tree', 'Design', 'File System', 'Hash Table', 'Sync'],
    difficultyDistribution: { easy: 15, medium: 55, hard: 30 },
    interviewStyle: 'Focus on file system problems, sync algorithms, and system design.',
    tips: [
      'Study file system concepts',
      'Practice tree problems',
      'Understand sync/conflict resolution',
      'Be ready for distributed storage design'
    ]
  },
  
  doordash: {
    name: 'DoorDash',
    aliases: ['dash'],
    focusAreas: ['Logistics', 'Graphs', 'Real-time', 'Optimization', 'Matching'],
    topCategories: ['Graphs', 'Heap', 'Arrays & Hashing', 'Dynamic Programming'],
    topTags: ['Graph', 'Heap', 'Design', 'Optimization', 'BFS'],
    difficultyDistribution: { easy: 15, medium: 55, hard: 30 },
    interviewStyle: 'Focus on logistics, delivery optimization, and real-time matching problems.',
    tips: [
      'Practice graph shortest path problems',
      'Understand matching algorithms',
      'Study delivery optimization',
      'Be ready for real-time system design'
    ]
  },
  
  lyft: {
    name: 'Lyft',
    aliases: [],
    focusAreas: ['Transportation', 'Graphs', 'Real-time', 'Matching', 'Geolocation'],
    topCategories: ['Graphs', 'Heap', 'Arrays & Hashing', 'Math & Geometry'],
    topTags: ['Graph', 'Heap', 'Geometry', 'Design', 'BFS', 'Dijkstra'],
    difficultyDistribution: { easy: 15, medium: 55, hard: 30 },
    interviewStyle: 'Similar to Uber - focus on ride-sharing, mapping, and real-time systems.',
    tips: [
      'Practice graph problems (similar to Uber)',
      'Understand geo-spatial algorithms',
      'Study real-time matching systems',
      'Be ready for ETA prediction problems'
    ]
  },
  
  reddit: {
    name: 'Reddit',
    aliases: ['rddt'],
    focusAreas: ['Social Media', 'Feeds', 'Voting', 'Graphs', 'Caching'],
    topCategories: ['Graphs', 'Design', 'Arrays & Hashing', 'Heap'],
    topTags: ['Graph', 'Design', 'Cache', 'Heap', 'Hash Table'],
    difficultyDistribution: { easy: 20, medium: 55, hard: 25 },
    interviewStyle: 'Focus on social media concepts, ranking algorithms, and community features.',
    tips: [
      'Understand ranking/voting algorithms',
      'Practice graph problems',
      'Study feed generation systems',
      'Be ready for community moderation design'
    ]
  },
  
  robinhood: {
    name: 'Robinhood',
    aliases: ['hood'],
    focusAreas: ['Finance', 'Trading', 'Real-time', 'Security', 'Queues'],
    topCategories: ['Arrays & Hashing', 'Design', 'Heap', 'Stack'],
    topTags: ['Array', 'Design', 'Queue', 'Real-time', 'Security'],
    difficultyDistribution: { easy: 20, medium: 55, hard: 25 },
    interviewStyle: 'Focus on trading systems, real-time data, and financial calculations.',
    tips: [
      'Understand stock trading basics',
      'Practice real-time data problems',
      'Study order matching systems',
      'Be ready for security-focused questions'
    ]
  },
  
  shopify: {
    name: 'Shopify',
    aliases: ['shop'],
    focusAreas: ['E-commerce', 'Inventory', 'Graphs', 'Design', 'APIs'],
    topCategories: ['Arrays & Hashing', 'Design', 'Graphs', 'Dynamic Programming'],
    topTags: ['Array', 'Design', 'Graph', 'API', 'Hash Table'],
    difficultyDistribution: { easy: 25, medium: 55, hard: 20 },
    interviewStyle: 'Focus on e-commerce problems, inventory management, and API design.',
    tips: [
      'Understand e-commerce concepts',
      'Practice inventory/cart problems',
      'Study checkout flow design',
      'Be ready for API design questions'
    ]
  },
  
  tiktok: {
    name: 'TikTok',
    aliases: ['bytedance', 'douyin'],
    focusAreas: ['Recommendation', 'Video', 'Graphs', 'Machine Learning', 'Feeds'],
    topCategories: ['Graphs', 'Dynamic Programming', 'Arrays & Hashing', 'Design'],
    topTags: ['Graph', 'Dynamic Programming', 'Design', 'ML', 'Feed'],
    difficultyDistribution: { easy: 10, medium: 50, hard: 40 },
    interviewStyle: 'Challenging interviews with focus on algorithms and recommendation systems.',
    tips: [
      'Practice hard DP problems',
      'Understand recommendation systems',
      'Study video processing basics',
      'Be ready for ML-related questions'
    ]
  },
  
  zoom: {
    name: 'Zoom',
    aliases: ['zm'],
    focusAreas: ['Video', 'Real-time', 'Networking', 'Design', 'Optimization'],
    topCategories: ['Design', 'Arrays & Hashing', 'Graphs', 'Dynamic Programming'],
    topTags: ['Design', 'Real-time', 'Network', 'Array', 'Optimization'],
    difficultyDistribution: { easy: 25, medium: 55, hard: 20 },
    interviewStyle: 'Focus on video conferencing, real-time communication, and system design.',
    tips: [
      'Understand WebRTC basics',
      'Practice real-time system problems',
      'Study video compression concepts',
      'Be ready for reliability/latency optimization'
    ]
  }
};

// Helper function to get company profile
export const getCompanyProfile = (companyName: string): CompanyInterviewProfile | null => {
  const normalized = companyName.toLowerCase().trim();
  
  // Direct match
  if (COMPANY_PROFILES[normalized]) {
    return COMPANY_PROFILES[normalized];
  }
  
  // Check aliases
  for (const [key, profile] of Object.entries(COMPANY_PROFILES)) {
    if (profile.aliases.some(alias => alias.toLowerCase() === normalized)) {
      return profile;
    }
  }
  
  // Partial match
  for (const [key, profile] of Object.entries(COMPANY_PROFILES)) {
    if (key.includes(normalized) || profile.name.toLowerCase().includes(normalized)) {
      return profile;
    }
  }
  
  return null;
};

// Helper function to get all company names
export const getAllCompanyNames = (): string[] => {
  return Object.values(COMPANY_PROFILES).map(p => p.name);
};

// Helper function to get companies by focus area
export const getCompaniesByFocusArea = (focusArea: string): CompanyInterviewProfile[] => {
  const normalized = focusArea.toLowerCase();
  return Object.values(COMPANY_PROFILES).filter(profile =>
    profile.focusAreas.some(area => area.toLowerCase().includes(normalized)) ||
    profile.topTags.some(tag => tag.toLowerCase().includes(normalized))
  );
};


