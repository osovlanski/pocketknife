/**
 * Keyword & Classification List Defaults
 *
 * Default arrays for keyword matching, classification, filtering,
 * and signal detection used across services. Moving these to
 * configService makes them runtime-configurable without code changes.
 *
 * @module services/core/config/defaults/keywordDefaults
 */

export const keywordDefaults = {
  // ==========================================================================
  // JOB MATCHING & CLASSIFICATION
  // ==========================================================================
  'keywords.jobs.matching.seniorityLevels': ['senior', 'sr.', 'sr', 'lead', 'principal', 'staff', 'architect', 'expert'],
  'keywords.jobs.matching.midLevels': ['mid', 'mid-level', 'intermediate', 'experienced'],
  'keywords.jobs.matching.juniorLevels': ['junior', 'jr.', 'jr', 'entry', 'entry-level', 'graduate', 'associate'],
  'keywords.jobs.matching.roleWords': ['developer', 'engineer', 'architect', 'programmer', 'software', 'designer', 'analyst', 'manager'],
  'keywords.jobs.matching.stopWords': ['and', 'or', 'the', 'for', 'with', 'job', 'position', 'role'],
  'keywords.jobs.matching.commonTech': ['python', 'java', 'javascript', 'typescript', 'react', 'node', 'aws', 'docker', 'kubernetes', 'sql', 'mongodb', 'go', 'rust'],
  'keywords.jobs.matching.techIndicators': ['startup', 'tech', 'software', 'engineering', 'developer', 'engineer'],
  'keywords.jobs.matching.seniorityKeywords': {
    senior: ['senior', 'sr.', 'lead', 'principal', 'staff'],
    mid: ['mid', 'intermediate', '3-5 years'],
    junior: ['junior', 'jr.', 'entry', 'graduate']
  },
  'keywords.jobs.matching.synonyms': {
    developer: ['developer', 'engineer', 'programmer', 'coder', 'software engineer'],
    javascript: ['javascript', 'js', 'node', 'nodejs', 'typescript', 'ts'],
    python: ['python', 'py', 'django', 'flask'],
    java: ['java', 'spring', 'jvm'],
    react: ['react', 'reactjs', 'react.js'],
    angular: ['angular', 'angularjs', 'angular.js'],
    vue: ['vue', 'vuejs', 'vue.js'],
    devops: ['devops', 'sre', 'infrastructure', 'platform'],
    data: ['data', 'analytics', 'ml', 'machine learning', 'ai'],
    mobile: ['mobile', 'ios', 'android', 'react native', 'flutter'],
    frontend: ['frontend', 'front-end', 'front end', 'ui', 'ux'],
    backend: ['backend', 'back-end', 'back end', 'server'],
    fullstack: ['fullstack', 'full-stack', 'full stack'],
    cloud: ['cloud', 'aws', 'azure', 'gcp', 'google cloud'],
    security: ['security', 'cybersecurity', 'infosec', 'appsec']
  },

  // ==========================================================================
  // JOB SCRAPING & PARSING
  // ==========================================================================
  'keywords.jobs.scraping.jobBoardDomains': ['linkedin.com', 'indeed.com', 'glassdoor.com', 'glassdoor.co.il', 'drushim.co.il', 'alljobs.co.il'],
  'keywords.jobs.parsing.industryBuzzwords': [
    'fintech', 'healthtech', 'edtech', 'proptech', 'insurtech', 'regtech',
    'cybersecurity', 'cyber', 'blockchain', 'crypto', 'ai', 'ml', 'saas',
    'b2b', 'b2c', 'ecommerce', 'e-commerce', 'gaming', 'adtech', 'martech',
    'foodtech', 'agtech', 'cleantech', 'biotech', 'medtech', 'legaltech'
  ],
  'keywords.jobs.classification.jobIndicators': [
    'looking for', 'hiring', 'opening', 'position', 'job', 'role',
    'developer', 'engineer', 'designer', 'manager',
    "we're hiring", 'join us', 'join our team', 'salary', 'remote',
    'full-time', 'part-time',
    'משרה', 'דרושים', 'מחפשים', 'גיוס'
  ],
  'keywords.jobs.analysis.commonSkills': [
    'javascript', 'typescript', 'python', 'java', 'react', 'node.js', 'nodejs',
    'vue', 'angular', 'aws', 'docker', 'kubernetes', 'sql', 'mongodb',
    'react native', 'flutter', 'swift', 'kotlin', 'go', 'rust', 'c++', 'c#'
  ],
  'keywords.jobs.enrichment.invalidNames': ['jobs', 'careers', 'hiring', 'job', 'career', 'glassdoor', 'linkedin', 'indeed'],

  // ==========================================================================
  // ASSISTANT CLASSIFICATION
  // ==========================================================================
  'keywords.assistant.classification.simpleSignals': ['show my', 'list my', 'get my', 'check my', 'what tasks', 'my emails', 'my todos'],
  'keywords.assistant.classification.deepSignals': ['recipe', 'cook', 'plan', 'travel', 'flight', 'search for', 'find me', 'order', 'compare'],

  // ==========================================================================
  // COOKING
  // ==========================================================================
  'keywords.cooking.matching.stripWords': ['fresh', 'organic', 'large', 'small', 'medium', 'chopped', 'diced', 'minced'],

  // ==========================================================================
  // NEWS
  // ==========================================================================
  'keywords.news.sources.techOnlyFallback': ['hackernews', 'lobsters', 'devto'],
  'keywords.news.sources.default': ['reddit', 'newsapi', 'gnews', 'mediastack'],

  // ==========================================================================
  // AUTOCOMPLETE DEFAULTS
  // ==========================================================================
  'keywords.autocomplete.defaults': {
    learning: ['TypeScript', 'React', 'System Design', 'AWS', 'Docker', 'Kubernetes'],
    problems: ['Two Sum', 'Array', 'Dynamic Programming', 'Binary Search', 'Tree'],
    jobs: ['Software Engineer', 'Frontend', 'Backend', 'Full Stack', 'Remote'],
    travel: ['Tel Aviv', 'Paris', 'London', 'New York', 'Barcelona'],
    all: ['React', 'TypeScript', 'Software Engineer', 'System Design', 'AWS']
  },

  // ==========================================================================
  // DIAGRAMS
  // ==========================================================================
  'keywords.jobs.diagrams.validTemplates': [
    'client', 'mobile', 'load_balancer', 'network', 'api_gateway', 'shield',
    'web_server', 'globe', 'database', 'cache', 'message_queue', 'message',
    'storage', 'cdn', 'cloud', 'microservice', 'server', 'worker', 'layers',
    'auth', 'search', 'notification', 'logging', 'dns', 'monitoring'
  ],
} as const;
