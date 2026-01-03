import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';
import { 
  BLIND_75, 
  NEETCODE_EXTRA, 
  GRIND_75,
  getAllCuratedProblems, 
  getProblemsByCompany, 
  getProblemsByTag,
  getProblemsByCategory,
  CuratedProblem 
} from '../../data/curatedProblems';
import { 
  getCompanyProfile, 
  getAllCompanyNames,
  CompanyInterviewProfile 
} from '../../data/companyMappings';

interface CodingProblem {
  id: string;
  title: string;
  titleSlug?: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  source: 'LeetCode' | 'HackerRank' | 'Codeforces' | 'Curated' | 'Glassdoor' | 'Custom';
  url?: string;
  company?: string;
  companies?: string[];
  tags: string[];
  hints?: string[];
  category?: string;
  isPremium?: boolean;
  rating?: number; // Codeforces rating
  acceptanceRate?: string;
  needsFullDescription?: boolean;
}

interface ProblemSearchOptions {
  query: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  company?: string;
  source?: string[];
  list?: 'blind75' | 'neetcode150' | 'grind75';
}

class ProblemSolvingService {
  private anthropicClient: Anthropic | null = null;

  private initializeAnthropic() {
    if (this.anthropicClient) return;
    
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    
    this.anthropicClient = new Anthropic({ apiKey });
  }

  /**
   * Search for coding problems from various sources
   * Uses AI to find relevant problems based on user query
   */
  async searchProblems(options: ProblemSearchOptions): Promise<CodingProblem[]> {
    const { query, difficulty, company, source = ['leetcode', 'curated', 'codeforces'], list } = options;
    
    console.log(`🔍 Searching coding problems for: "${query}"`);
    console.log(`   Sources: ${source.join(', ')} | Company: ${company || 'Any'} | Difficulty: ${difficulty || 'Any'} | List: ${list || 'None'}`);

    const problems: CodingProblem[] = [];

    // If a specific curated list is requested, return that list
    if (list) {
      const curatedList = this.getCuratedList(list, difficulty);
      console.log(`📋 Returning ${curatedList.length} problems from ${list}`);
      return curatedList;
    }

    // Search curated problems first (highest quality, always available)
    if (source.includes('curated')) {
      const curatedProblems = this.searchCuratedProblems(query, difficulty, company);
      problems.push(...curatedProblems);
      console.log(`📋 Found ${curatedProblems.length} curated problems`);
    }

    // Search LeetCode problems
    if (source.includes('leetcode')) {
      const leetcodeProblems = await this.searchLeetCode(query, difficulty, company);
      problems.push(...leetcodeProblems);
      console.log(`🟡 Found ${leetcodeProblems.length} LeetCode problems`);
    }

    // Search Codeforces problems (official API)
    if (source.includes('codeforces')) {
      const codeforcesProblems = await this.searchCodeforces(query, difficulty);
      problems.push(...codeforcesProblems);
      console.log(`🔵 Found ${codeforcesProblems.length} Codeforces problems`);
    }

    // Search HackerRank problems
    if (source.includes('hackerrank')) {
      const hackerrankProblems = await this.searchHackerRank(query, difficulty);
      problems.push(...hackerrankProblems);
      console.log(`🟢 Found ${hackerrankProblems.length} HackerRank problems`);
    }

    // Use company profile to find relevant problems
    if (company) {
      const companyProblems = await this.searchCompanyProblems(query, company, difficulty);
      problems.push(...companyProblems);
      console.log(`🏢 Found ${companyProblems.length} company-specific problems`);
    }

    // If no results, try AI-generated problems as fallback
    if (problems.length === 0) {
      console.log('⚠️ No problems found, generating AI suggestions...');
      const aiProblems = await this.generateAIProblems(query, difficulty, company);
      problems.push(...aiProblems);
    }

    // Remove duplicates and sort by relevance
    const uniqueProblems = this.deduplicateAndSort(problems, query);

    console.log(`✅ Returning ${uniqueProblems.length} unique problems`);
    return uniqueProblems;
  }

  /**
   * Get a specific curated problem list
   */
  private getCuratedList(list: string, difficulty?: string): CodingProblem[] {
    let problems: CuratedProblem[] = [];
    
    switch (list) {
      case 'blind75':
        problems = BLIND_75;
        break;
      case 'neetcode150':
        problems = [...BLIND_75, ...NEETCODE_EXTRA];
        break;
      case 'grind75':
        problems = GRIND_75;
        break;
      default:
        problems = BLIND_75;
    }

    // Filter by difficulty if specified
    if (difficulty) {
      problems = problems.filter(p => p.difficulty === difficulty);
    }

    return problems.map(p => this.curatedToCodingProblem(p));
  }

  /**
   * Convert curated problem to CodingProblem interface
   */
  private curatedToCodingProblem(curated: CuratedProblem): CodingProblem {
    return {
      id: curated.id,
      title: curated.title,
      titleSlug: curated.titleSlug,
      description: `${curated.category} problem from curated interview list. Tags: ${curated.tags.join(', ')}`,
      difficulty: curated.difficulty,
      source: 'Curated',
      url: curated.url,
      companies: curated.companies,
      tags: curated.tags,
      category: curated.category,
      isPremium: curated.isPremium,
      needsFullDescription: true // Will fetch from LeetCode when selected
    };
  }

  /**
   * Search curated problem lists (Blind 75, NeetCode 150, etc.)
   */
  private searchCuratedProblems(query: string, difficulty?: string, company?: string): CodingProblem[] {
    const queryLower = query.toLowerCase();
    let problems: CuratedProblem[] = [];

    // Search by company first if specified
    if (company) {
      problems = getProblemsByCompany(company);
    } else {
      problems = getAllCuratedProblems();
    }

    // Filter by query (title, tags, category)
    if (queryLower) {
      problems = problems.filter(p => 
        p.title.toLowerCase().includes(queryLower) ||
        p.tags.some(t => t.toLowerCase().includes(queryLower)) ||
        p.category.toLowerCase().includes(queryLower) ||
        p.titleSlug.includes(queryLower.replace(/\s+/g, '-'))
      );
    }

    // Filter by difficulty
    if (difficulty) {
      problems = problems.filter(p => p.difficulty === difficulty);
    }

    return problems.slice(0, 20).map(p => this.curatedToCodingProblem(p));
  }

  /**
   * Search Codeforces problems using their official API
   */
  private async searchCodeforces(query: string, difficulty?: string): Promise<CodingProblem[]> {
    try {
      const response = await axios.get('https://codeforces.com/api/problemset.problems', {
        timeout: 10000
      });

      if (response.data.status !== 'OK') {
        console.warn('⚠️ Codeforces API returned non-OK status');
        return [];
      }

      const allProblems = response.data.result.problems || [];
      const queryLower = query.toLowerCase();

      // Map Codeforces ratings to difficulty levels
      const ratingToDifficulty = (rating?: number): 'Easy' | 'Medium' | 'Hard' => {
        if (!rating || rating < 1200) return 'Easy';
        if (rating < 1800) return 'Medium';
        return 'Hard';
      };

      // Filter and map problems
      let filtered = allProblems
        .filter((p: any) => {
          const nameMatch = p.name.toLowerCase().includes(queryLower);
          const tagMatch = p.tags?.some((t: string) => t.toLowerCase().includes(queryLower));
          return nameMatch || tagMatch;
        })
        .slice(0, 15);

      // Apply difficulty filter
      if (difficulty) {
        filtered = filtered.filter((p: any) => ratingToDifficulty(p.rating) === difficulty);
      }

      return filtered.map((p: any) => ({
        id: `cf-${p.contestId}-${p.index}`,
        title: p.name,
        description: `Codeforces problem from contest ${p.contestId}. Rating: ${p.rating || 'Unrated'}. Tags: ${(p.tags || []).join(', ')}`,
        difficulty: ratingToDifficulty(p.rating),
        source: 'Codeforces' as const,
        url: `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`,
        tags: p.tags || [],
        rating: p.rating
      }));
    } catch (error: any) {
      console.error('❌ Codeforces API error:', error.message);
      return [];
    }
  }

  /**
   * Generate AI problems as fallback when no results found
   */
  private async generateAIProblems(query: string, difficulty?: string, company?: string): Promise<CodingProblem[]> {
    this.initializeAnthropic();

    if (!this.anthropicClient) {
      return [];
    }

    try {
      const companyProfile = company ? getCompanyProfile(company) : null;
      const companyContext = companyProfile 
        ? `This is for ${companyProfile.name} interviews. Focus areas: ${companyProfile.focusAreas.join(', ')}. Common tags: ${companyProfile.topTags.join(', ')}.`
        : '';

      const message = await this.anthropicClient.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `Generate 3 coding interview problems based on this query: "${query}"
${difficulty ? `Difficulty level: ${difficulty}` : ''}
${companyContext}

Return a JSON array with problems in this format:
[{
  "title": "Problem Title",
  "description": "Detailed problem description with examples",
  "difficulty": "Easy|Medium|Hard",
  "tags": ["Array", "Hash Table"],
  "hints": ["Hint 1", "Hint 2"]
}]

Make the problems realistic interview questions. Return ONLY valid JSON.`
        }]
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const cleanText = responseText.replace(/```json|```/g, '').trim();
      
      const aiProblems = JSON.parse(cleanText);
      
      return aiProblems.map((p: any, idx: number) => ({
        id: `ai-${Date.now()}-${idx}`,
        title: p.title,
        description: p.description,
        difficulty: p.difficulty || 'Medium',
        source: 'Custom' as const,
        tags: p.tags || [],
        hints: p.hints,
        company: company
      }));
    } catch (error: any) {
      console.error('❌ AI problem generation failed:', error.message);
      return [];
    }
  }

  /**
   * Deduplicate problems and sort by relevance
   */
  private deduplicateAndSort(problems: CodingProblem[], query: string): CodingProblem[] {
    const queryLower = query.toLowerCase();
    
    // Remove duplicates by title similarity
    const seen = new Set<string>();
    const unique = problems.filter(p => {
      const normalizedTitle = p.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seen.has(normalizedTitle)) return false;
      seen.add(normalizedTitle);
      return true;
    });

    // Sort by relevance (title match first, then curated, then others)
    return unique.sort((a, b) => {
      const aExact = a.title.toLowerCase().includes(queryLower) ? 1 : 0;
      const bExact = b.title.toLowerCase().includes(queryLower) ? 1 : 0;
      if (aExact !== bExact) return bExact - aExact;
      
      const aCurated = a.source === 'Curated' ? 1 : 0;
      const bCurated = b.source === 'Curated' ? 1 : 0;
      if (aCurated !== bCurated) return bCurated - aCurated;
      
      return 0;
    });
  }

  /**
   * Get company interview profile with tips
   */
  getCompanyInterviewProfile(company: string): CompanyInterviewProfile | null {
    return getCompanyProfile(company);
  }

  /**
   * Get all available company names
   */
  getAllCompanies(): string[] {
    return getAllCompanyNames();
  }

  /**
   * Search LeetCode problems using their public API
   */
  private async searchLeetCode(
    query: string,
    difficulty?: string,
    company?: string
  ): Promise<CodingProblem[]> {
    try {
      // LeetCode GraphQL API endpoint
      const graphqlQuery = {
        query: `
          query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
            problemsetQuestionList: questionList(
              categorySlug: $categorySlug
              limit: $limit
              skip: $skip
              filters: $filters
            ) {
              total: totalNum
              questions: data {
                acRate
                difficulty
                freqBar
                frontendQuestionId: questionFrontendId
                isFavor
                paidOnly: isPaidOnly
                status
                title
                titleSlug
                topicTags {
                  name
                  slug
                }
                hasSolution
                hasVideoSolution
              }
            }
          }
        `,
        variables: {
          categorySlug: '',
          skip: 0,
          limit: 50,
          filters: {
            difficulty: difficulty?.toUpperCase() || undefined,
            searchKeywords: query
          }
        }
      };

      const response = await axios.post('https://leetcode.com/graphql/', graphqlQuery, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        timeout: 10000
      });

      const questions = response.data?.data?.problemsetQuestionList?.questions || [];
      
      const problems = questions
        .filter((q: any) => !q.paidOnly) // Only free problems
        .slice(0, 20); // Show more problems

      // Fetch detailed descriptions for the first 10 problems
      const detailedProblems = await Promise.all(
        problems.slice(0, 10).map(async (q: any) => {
          const fullDescription = await this.getLeetCodeProblemDescription(q.titleSlug);
          return {
            id: `leetcode-${q.frontendQuestionId}`,
            title: q.title,
            titleSlug: q.titleSlug,
            description: fullDescription || `LeetCode problem: ${q.title}. Difficulty: ${q.difficulty}. Acceptance rate: ${q.acRate.toFixed(1)}%`,
            difficulty: q.difficulty as 'Easy' | 'Medium' | 'Hard',
            source: 'LeetCode' as const,
            url: `https://leetcode.com/problems/${q.titleSlug}/`,
            tags: q.topicTags?.map((tag: any) => tag.name) || [],
            company: company || undefined,
            acceptanceRate: q.acRate.toFixed(1)
          };
        })
      );

      // Add remaining problems without full descriptions (they'll load on select)
      const remainingProblems = problems.slice(10).map((q: any) => ({
        id: `leetcode-${q.frontendQuestionId}`,
        title: q.title,
        titleSlug: q.titleSlug,
        description: `Click to load full problem description...`,
        difficulty: q.difficulty as 'Easy' | 'Medium' | 'Hard',
        source: 'LeetCode' as const,
        url: `https://leetcode.com/problems/${q.titleSlug}/`,
        tags: q.topicTags?.map((tag: any) => tag.name) || [],
        company: company || undefined,
        acceptanceRate: q.acRate.toFixed(1),
        needsFullDescription: true
      }));

      return [...detailedProblems, ...remainingProblems];
    } catch (error: any) {
      console.error('❌ LeetCode search failed:', error.message);
      // Fallback: Return some popular problems based on query
      return this.getFallbackLeetCodeProblems(query, difficulty);
    }
  }

  /**
   * Fetch full problem description from LeetCode
   */
  private async getLeetCodeProblemDescription(titleSlug: string): Promise<string | null> {
    try {
      const graphqlQuery = {
        query: `
          query questionContent($titleSlug: String!) {
            question(titleSlug: $titleSlug) {
              content
              mysqlSchemas
              exampleTestcases
            }
          }
        `,
        variables: { titleSlug }
      };

      const response = await axios.post('https://leetcode.com/graphql/', graphqlQuery, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        timeout: 5000
      });

      const content = response.data?.data?.question?.content;
      
      if (content) {
        // Strip HTML tags and clean up the content
        const cleanContent = content
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&nbsp;/g, ' ')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/\n\s*\n/g, '\n\n') // Clean up multiple newlines
          .trim();
        
        return cleanContent;
      }
      
      return null;
    } catch (error: any) {
      console.warn(`⚠️ Could not fetch description for ${titleSlug}:`, error.message);
      return null;
    }
  }

  /**
   * Public method to get problem description (for lazy loading)
   */
  async getProblemDescription(titleSlug: string): Promise<string | null> {
    return this.getLeetCodeProblemDescription(titleSlug);
  }

  /**
   * LeetCode 75 curated problem list - commonly asked in top company interviews
   */
  private leetcode75Problems: CodingProblem[] = [
    // Array / String
    { id: 'lc-1768', title: 'Merge Strings Alternately', description: 'Merge two strings by adding letters in alternating order.', difficulty: 'Easy', source: 'LeetCode', url: 'https://leetcode.com/problems/merge-strings-alternately/', tags: ['String', 'Two Pointers'] },
    { id: 'lc-1071', title: 'Greatest Common Divisor of Strings', description: 'Find the largest string that divides both strings.', difficulty: 'Easy', source: 'LeetCode', url: 'https://leetcode.com/problems/greatest-common-divisor-of-strings/', tags: ['String', 'Math'] },
    { id: 'lc-1431', title: 'Kids With the Greatest Number of Candies', description: 'Determine which kids can have the greatest number of candies.', difficulty: 'Easy', source: 'LeetCode', url: 'https://leetcode.com/problems/kids-with-the-greatest-number-of-candies/', tags: ['Array'] },
    { id: 'lc-605', title: 'Can Place Flowers', description: 'Check if n flowers can be planted in a flowerbed without violating no-adjacent-flowers rule.', difficulty: 'Easy', source: 'LeetCode', url: 'https://leetcode.com/problems/can-place-flowers/', tags: ['Array', 'Greedy'] },
    { id: 'lc-345', title: 'Reverse Vowels of a String', description: 'Reverse only the vowels of a string.', difficulty: 'Easy', source: 'LeetCode', url: 'https://leetcode.com/problems/reverse-vowels-of-a-string/', tags: ['String', 'Two Pointers'] },
    { id: 'lc-151', title: 'Reverse Words in a String', description: 'Reverse the order of words in a string.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/reverse-words-in-a-string/', tags: ['String', 'Two Pointers'] },
    { id: 'lc-238', title: 'Product of Array Except Self', description: 'Return an array where each element is the product of all other elements.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/product-of-array-except-self/', tags: ['Array', 'Prefix Sum'] },
    { id: 'lc-334', title: 'Increasing Triplet Subsequence', description: 'Check if there exists a triplet with increasing values.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/increasing-triplet-subsequence/', tags: ['Array', 'Greedy'] },
    { id: 'lc-443', title: 'String Compression', description: 'Compress a string in-place using character counts.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/string-compression/', tags: ['String', 'Two Pointers'] },
    // Two Pointers
    { id: 'lc-283', title: 'Move Zeroes', description: 'Move all 0s to the end while maintaining relative order of non-zero elements.', difficulty: 'Easy', source: 'LeetCode', url: 'https://leetcode.com/problems/move-zeroes/', tags: ['Array', 'Two Pointers'] },
    { id: 'lc-392', title: 'Is Subsequence', description: 'Check if s is a subsequence of t.', difficulty: 'Easy', source: 'LeetCode', url: 'https://leetcode.com/problems/is-subsequence/', tags: ['String', 'Two Pointers', 'DP'] },
    { id: 'lc-11', title: 'Container With Most Water', description: 'Find two lines that together with the x-axis form a container with most water.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/container-with-most-water/', tags: ['Array', 'Two Pointers', 'Greedy'] },
    { id: 'lc-1679', title: 'Max Number of K-Sum Pairs', description: 'Find max pairs with sum equal to k.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/max-number-of-k-sum-pairs/', tags: ['Array', 'Hash Table', 'Two Pointers', 'Sorting'] },
    // Sliding Window
    { id: 'lc-643', title: 'Maximum Average Subarray I', description: 'Find contiguous subarray of length k with maximum average.', difficulty: 'Easy', source: 'LeetCode', url: 'https://leetcode.com/problems/maximum-average-subarray-i/', tags: ['Array', 'Sliding Window'] },
    { id: 'lc-1456', title: 'Maximum Number of Vowels in a Substring', description: 'Return max vowels in any substring of length k.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/maximum-number-of-vowels-in-a-substring-of-given-length/', tags: ['String', 'Sliding Window'] },
    { id: 'lc-1004', title: 'Max Consecutive Ones III', description: 'Return max consecutive 1s after flipping at most k 0s.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/max-consecutive-ones-iii/', tags: ['Array', 'Sliding Window', 'Binary Search', 'Prefix Sum'] },
    { id: 'lc-1493', title: 'Longest Subarray of 1s After Deleting One Element', description: 'Return longest subarray of 1s after deleting exactly one element.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/longest-subarray-of-1s-after-deleting-one-element/', tags: ['Array', 'Sliding Window', 'DP'] },
    // Hash Map / Set
    { id: 'lc-2215', title: 'Find the Difference of Two Arrays', description: 'Return two lists of distinct integers.', difficulty: 'Easy', source: 'LeetCode', url: 'https://leetcode.com/problems/find-the-difference-of-two-arrays/', tags: ['Array', 'Hash Table'] },
    { id: 'lc-1207', title: 'Unique Number of Occurrences', description: 'Check if number of occurrences of each value is unique.', difficulty: 'Easy', source: 'LeetCode', url: 'https://leetcode.com/problems/unique-number-of-occurrences/', tags: ['Array', 'Hash Table'] },
    { id: 'lc-1657', title: 'Determine if Two Strings Are Close', description: 'Two strings are close if you can transform one to other using swap/transform operations.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/determine-if-two-strings-are-close/', tags: ['String', 'Hash Table', 'Sorting'] },
    { id: 'lc-2352', title: 'Equal Row and Column Pairs', description: 'Return number of pairs where row i equals column j.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/equal-row-and-column-pairs/', tags: ['Array', 'Hash Table', 'Matrix', 'Simulation'] },
    // Stack
    { id: 'lc-2390', title: 'Removing Stars From a String', description: 'Remove stars and character to their left.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/removing-stars-from-a-string/', tags: ['String', 'Stack', 'Simulation'] },
    { id: 'lc-735', title: 'Asteroid Collision', description: 'Find state of asteroids after all collisions.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/asteroid-collision/', tags: ['Array', 'Stack', 'Simulation'] },
    { id: 'lc-394', title: 'Decode String', description: 'Decode an encoded string like "3[a2[c]]" = "accaccacc".', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/decode-string/', tags: ['String', 'Stack', 'Recursion'] },
    // Queue
    { id: 'lc-933', title: 'Number of Recent Calls', description: 'Count requests in the past 3000 milliseconds.', difficulty: 'Easy', source: 'LeetCode', url: 'https://leetcode.com/problems/number-of-recent-calls/', tags: ['Queue', 'Design', 'Data Stream'] },
    { id: 'lc-649', title: 'Dota2 Senate', description: 'Predict which party will announce victory.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/dota2-senate/', tags: ['String', 'Queue', 'Greedy'] },
    // Linked List
    { id: 'lc-2095', title: 'Delete the Middle Node of a Linked List', description: 'Delete the middle node and return modified list.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/delete-the-middle-node-of-a-linked-list/', tags: ['Linked List', 'Two Pointers'] },
    { id: 'lc-328', title: 'Odd Even Linked List', description: 'Reorder so odd nodes come before even nodes.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/odd-even-linked-list/', tags: ['Linked List'] },
    { id: 'lc-206', title: 'Reverse Linked List', description: 'Reverse a singly linked list.', difficulty: 'Easy', source: 'LeetCode', url: 'https://leetcode.com/problems/reverse-linked-list/', tags: ['Linked List', 'Recursion'] },
    { id: 'lc-2130', title: 'Maximum Twin Sum of a Linked List', description: 'Find maximum twin sum in a linked list.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/maximum-twin-sum-of-a-linked-list/', tags: ['Linked List', 'Two Pointers', 'Stack'] },
    // Binary Tree - DFS
    { id: 'lc-104', title: 'Maximum Depth of Binary Tree', description: 'Return maximum depth of a binary tree.', difficulty: 'Easy', source: 'LeetCode', url: 'https://leetcode.com/problems/maximum-depth-of-binary-tree/', tags: ['Tree', 'DFS', 'BFS', 'Binary Tree'] },
    { id: 'lc-872', title: 'Leaf-Similar Trees', description: 'Check if two trees have same leaf value sequence.', difficulty: 'Easy', source: 'LeetCode', url: 'https://leetcode.com/problems/leaf-similar-trees/', tags: ['Tree', 'DFS', 'Binary Tree'] },
    { id: 'lc-1448', title: 'Count Good Nodes in Binary Tree', description: 'Count nodes where path from root has no greater value.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/count-good-nodes-in-binary-tree/', tags: ['Tree', 'DFS', 'BFS', 'Binary Tree'] },
    { id: 'lc-437', title: 'Path Sum III', description: 'Count paths that sum to targetSum.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/path-sum-iii/', tags: ['Tree', 'DFS', 'Binary Tree'] },
    { id: 'lc-1372', title: 'Longest ZigZag Path in a Binary Tree', description: 'Find longest zigzag path.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/longest-zigzag-path-in-a-binary-tree/', tags: ['Tree', 'DFS', 'DP', 'Binary Tree'] },
    { id: 'lc-236', title: 'Lowest Common Ancestor of a Binary Tree', description: 'Find LCA of two nodes.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/', tags: ['Tree', 'DFS', 'Binary Tree'] },
    // Binary Tree - BFS
    { id: 'lc-199', title: 'Binary Tree Right Side View', description: 'Return values visible from the right side.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/binary-tree-right-side-view/', tags: ['Tree', 'DFS', 'BFS', 'Binary Tree'] },
    { id: 'lc-1161', title: 'Maximum Level Sum of a Binary Tree', description: 'Find level with maximum sum.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/maximum-level-sum-of-a-binary-tree/', tags: ['Tree', 'DFS', 'BFS', 'Binary Tree'] },
    // Binary Search Tree
    { id: 'lc-700', title: 'Search in a Binary Search Tree', description: 'Find node with given value in BST.', difficulty: 'Easy', source: 'LeetCode', url: 'https://leetcode.com/problems/search-in-a-binary-search-tree/', tags: ['Tree', 'BST', 'Binary Search', 'Binary Tree'] },
    { id: 'lc-450', title: 'Delete Node in a BST', description: 'Delete a node with given key from BST.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/delete-node-in-a-bst/', tags: ['Tree', 'BST', 'Binary Tree'] },
    // Graphs - DFS
    { id: 'lc-841', title: 'Keys and Rooms', description: 'Check if you can visit all rooms starting from room 0.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/keys-and-rooms/', tags: ['Graph', 'DFS', 'BFS'] },
    { id: 'lc-547', title: 'Number of Provinces', description: 'Count number of connected components.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/number-of-provinces/', tags: ['Graph', 'DFS', 'BFS', 'Union Find'] },
    { id: 'lc-1466', title: 'Reorder Routes to Make All Paths Lead to City Zero', description: 'Minimum reorders so all paths lead to city 0.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/reorder-routes-to-make-all-paths-lead-to-the-city-zero/', tags: ['Graph', 'DFS', 'BFS'] },
    { id: 'lc-399', title: 'Evaluate Division', description: 'Evaluate equations given variable values.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/evaluate-division/', tags: ['Graph', 'DFS', 'BFS', 'Union Find', 'Shortest Path'] },
    // Graphs - BFS
    { id: 'lc-1926', title: 'Nearest Exit from Entrance in Maze', description: 'Find shortest path to nearest exit.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/nearest-exit-from-entrance-in-maze/', tags: ['Array', 'BFS', 'Matrix'] },
    { id: 'lc-994', title: 'Rotting Oranges', description: 'Find minimum time for all oranges to rot.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/rotting-oranges/', tags: ['Array', 'BFS', 'Matrix'] },
    // Heap / Priority Queue
    { id: 'lc-215', title: 'Kth Largest Element in an Array', description: 'Find the kth largest element.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/kth-largest-element-in-an-array/', tags: ['Array', 'Divide and Conquer', 'Sorting', 'Heap', 'Quickselect'] },
    { id: 'lc-2336', title: 'Smallest Number in Infinite Set', description: 'Design a class to manage an infinite set.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/smallest-number-in-infinite-set/', tags: ['Hash Table', 'Design', 'Heap'] },
    { id: 'lc-2542', title: 'Maximum Subsequence Score', description: 'Select k elements to maximize score.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/maximum-subsequence-score/', tags: ['Array', 'Greedy', 'Sorting', 'Heap'] },
    { id: 'lc-2462', title: 'Total Cost to Hire K Workers', description: 'Find minimum cost to hire k workers.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/total-cost-to-hire-k-workers/', tags: ['Array', 'Two Pointers', 'Simulation', 'Heap'] },
    // Binary Search
    { id: 'lc-374', title: 'Guess Number Higher or Lower', description: 'Guess a number using binary search.', difficulty: 'Easy', source: 'LeetCode', url: 'https://leetcode.com/problems/guess-number-higher-or-lower/', tags: ['Binary Search', 'Interactive'] },
    { id: 'lc-2300', title: 'Successful Pairs of Spells and Potions', description: 'Count successful pairs using binary search.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/successful-pairs-of-spells-and-potions/', tags: ['Array', 'Two Pointers', 'Binary Search', 'Sorting'] },
    { id: 'lc-162', title: 'Find Peak Element', description: 'Find a peak element in O(log n).', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/find-peak-element/', tags: ['Array', 'Binary Search'] },
    { id: 'lc-875', title: 'Koko Eating Bananas', description: 'Find minimum eating speed.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/koko-eating-bananas/', tags: ['Array', 'Binary Search'] },
    // Backtracking
    { id: 'lc-17', title: 'Letter Combinations of a Phone Number', description: 'Return all letter combinations for digits.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/letter-combinations-of-a-phone-number/', tags: ['String', 'Hash Table', 'Backtracking'] },
    { id: 'lc-216', title: 'Combination Sum III', description: 'Find combinations of k numbers that sum to n.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/combination-sum-iii/', tags: ['Array', 'Backtracking'] },
    // DP - 1D
    { id: 'lc-1137', title: 'N-th Tribonacci Number', description: 'Find nth tribonacci number.', difficulty: 'Easy', source: 'LeetCode', url: 'https://leetcode.com/problems/n-th-tribonacci-number/', tags: ['Math', 'DP', 'Memoization'] },
    { id: 'lc-746', title: 'Min Cost Climbing Stairs', description: 'Find minimum cost to reach the top.', difficulty: 'Easy', source: 'LeetCode', url: 'https://leetcode.com/problems/min-cost-climbing-stairs/', tags: ['Array', 'DP'] },
    { id: 'lc-198', title: 'House Robber', description: 'Maximum money without robbing adjacent houses.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/house-robber/', tags: ['Array', 'DP'] },
    { id: 'lc-790', title: 'Domino and Tromino Tiling', description: 'Count ways to tile a 2xn board.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/domino-and-tromino-tiling/', tags: ['DP'] },
    // DP - Multidimensional
    { id: 'lc-62', title: 'Unique Paths', description: 'Count unique paths from top-left to bottom-right.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/unique-paths/', tags: ['Math', 'DP', 'Combinatorics'] },
    { id: 'lc-1143', title: 'Longest Common Subsequence', description: 'Find LCS of two strings.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/longest-common-subsequence/', tags: ['String', 'DP'] },
    { id: 'lc-714', title: 'Best Time to Buy and Sell Stock with Transaction Fee', description: 'Maximize profit with transaction fee.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/best-time-to-buy-and-sell-stock-with-transaction-fee/', tags: ['Array', 'DP', 'Greedy'] },
    { id: 'lc-72', title: 'Edit Distance', description: 'Minimum edits to transform one string to another.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/edit-distance/', tags: ['String', 'DP'] },
    // Bit Manipulation
    { id: 'lc-338', title: 'Counting Bits', description: 'Count 1s in binary for 0 to n.', difficulty: 'Easy', source: 'LeetCode', url: 'https://leetcode.com/problems/counting-bits/', tags: ['DP', 'Bit Manipulation'] },
    { id: 'lc-136', title: 'Single Number', description: 'Find element that appears only once.', difficulty: 'Easy', source: 'LeetCode', url: 'https://leetcode.com/problems/single-number/', tags: ['Array', 'Bit Manipulation'] },
    { id: 'lc-1318', title: 'Minimum Flips to Make a OR b Equal to c', description: 'Minimum bit flips for a OR b = c.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/minimum-flips-to-make-a-or-b-equal-to-c/', tags: ['Bit Manipulation'] },
    // Trie
    { id: 'lc-208', title: 'Implement Trie (Prefix Tree)', description: 'Implement a trie with insert, search, startsWith.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/implement-trie-prefix-tree/', tags: ['Hash Table', 'String', 'Design', 'Trie'] },
    { id: 'lc-1268', title: 'Search Suggestions System', description: 'Return suggested products for each prefix.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/search-suggestions-system/', tags: ['Array', 'String', 'Binary Search', 'Trie', 'Sorting', 'Heap'] },
    // Intervals
    { id: 'lc-435', title: 'Non-overlapping Intervals', description: 'Minimum intervals to remove for no overlap.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/non-overlapping-intervals/', tags: ['Array', 'DP', 'Greedy', 'Sorting'] },
    { id: 'lc-452', title: 'Minimum Number of Arrows to Burst Balloons', description: 'Minimum arrows to burst all balloons.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/minimum-number-of-arrows-to-burst-balloons/', tags: ['Array', 'Greedy', 'Sorting'] },
    // Monotonic Stack
    { id: 'lc-739', title: 'Daily Temperatures', description: 'Days until warmer temperature.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/daily-temperatures/', tags: ['Array', 'Stack', 'Monotonic Stack'] },
    { id: 'lc-901', title: 'Online Stock Span', description: 'Calculate stock price span.', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/online-stock-span/', tags: ['Stack', 'Design', 'Monotonic Stack', 'Data Stream'] },
    // Additional classics
    { id: 'lc-1', title: 'Two Sum', description: 'Return indices of two numbers that add up to target.', difficulty: 'Easy', source: 'LeetCode', url: 'https://leetcode.com/problems/two-sum/', tags: ['Array', 'Hash Table'] },
    { id: 'lc-75', title: 'Sort Colors', description: 'Sort an array with values 0, 1, 2 in-place (Dutch National Flag).', difficulty: 'Medium', source: 'LeetCode', url: 'https://leetcode.com/problems/sort-colors/', tags: ['Array', 'Two Pointers', 'Sorting'] },
  ];

  /**
   * Fallback LeetCode problems when API fails - uses curated LeetCode 75 list
   */
  private getFallbackLeetCodeProblems(
    query: string,
    difficulty?: string
  ): CodingProblem[] {
    const queryLower = query.toLowerCase();
    let filteredProblems = [...this.leetcode75Problems];

    // Filter by difficulty if specified
    if (difficulty) {
      filteredProblems = filteredProblems.filter(p => 
        p.difficulty.toLowerCase() === difficulty.toLowerCase()
      );
    }

    // Filter by query keywords
    if (queryLower.includes('string')) {
      filteredProblems = filteredProblems.filter(p => 
        p.tags.some(t => t.toLowerCase().includes('string')) || 
        p.title.toLowerCase().includes('string')
      );
    } else if (queryLower.includes('array')) {
      filteredProblems = filteredProblems.filter(p => 
        p.tags.some(t => t.toLowerCase().includes('array'))
      );
    } else if (queryLower.includes('tree') || queryLower.includes('binary')) {
      filteredProblems = filteredProblems.filter(p => 
        p.tags.some(t => t.toLowerCase().includes('tree') || t.toLowerCase().includes('binary'))
      );
    } else if (queryLower.includes('graph')) {
      filteredProblems = filteredProblems.filter(p => 
        p.tags.some(t => t.toLowerCase().includes('graph'))
      );
    } else if (queryLower.includes('dp') || queryLower.includes('dynamic')) {
      filteredProblems = filteredProblems.filter(p => 
        p.tags.some(t => t.toLowerCase().includes('dp') || t.toLowerCase() === 'dynamic programming')
      );
    } else if (queryLower.includes('stack')) {
      filteredProblems = filteredProblems.filter(p => 
        p.tags.some(t => t.toLowerCase().includes('stack'))
      );
    } else if (queryLower.includes('heap') || queryLower.includes('priority')) {
      filteredProblems = filteredProblems.filter(p => 
        p.tags.some(t => t.toLowerCase().includes('heap'))
      );
    } else if (queryLower.includes('75') || queryLower.includes('top')) {
      // Return all 75 problems for "75" or "top" queries
      filteredProblems = this.leetcode75Problems;
    }

    // Return up to 20 problems
    return filteredProblems.slice(0, 20);
  }

  /**
   * Search HackerRank problems
   */
  private async searchHackerRank(
    query: string,
    difficulty?: string
  ): Promise<CodingProblem[]> {
    try {
      // HackerRank doesn't have a public API, so we'll use web scraping or return curated problems
      // For now, return some popular problems based on query
      const problems: CodingProblem[] = [];
      const queryLower = query.toLowerCase();

      if (queryLower.includes('string') || queryLower.includes('array')) {
        problems.push({
          id: 'hackerrank-strings-1',
          title: 'String Manipulation',
          description: 'Practice string manipulation problems commonly asked in interviews.',
          difficulty: 'Medium',
          source: 'HackerRank',
          url: 'https://www.hackerrank.com/domains/algorithms?filters%5Bdifficulty%5D%5B%5D=medium',
          tags: ['Strings', 'Algorithms'],
          company: undefined
        });
      }

      return problems;
    } catch (error: any) {
      console.error('❌ HackerRank search failed:', error.message);
      return [];
    }
  }

  /**
   * Search for company-specific problems using AI
   */
  private async searchCompanyProblems(
    query: string,
    company: string,
    difficulty?: string
  ): Promise<CodingProblem[]> {
    const problems: CodingProblem[] = [];
    
    // First, get problems from curated lists tagged with this company
    const companyProblems = getProblemsByCompany(company);
    const queryLower = query.toLowerCase();
    
    // Filter by query relevance
    let relevantProblems = companyProblems.filter(p =>
      p.title.toLowerCase().includes(queryLower) ||
      p.tags.some(t => t.toLowerCase().includes(queryLower)) ||
      p.category.toLowerCase().includes(queryLower) ||
      queryLower.split(' ').some(word => 
        p.title.toLowerCase().includes(word) ||
        p.tags.some(t => t.toLowerCase().includes(word))
      )
    );

    // If no specific query match, return top problems for this company
    if (relevantProblems.length === 0) {
      relevantProblems = companyProblems;
    }

    // Filter by difficulty if specified
    if (difficulty) {
      relevantProblems = relevantProblems.filter(p => p.difficulty === difficulty);
    }

    // Add curated problems
    problems.push(...relevantProblems.slice(0, 10).map(p => this.curatedToCodingProblem(p)));

    // Get company profile for context
    const companyProfile = getCompanyProfile(company);
    
    // If we have less than 5 problems, use AI to generate more
    if (problems.length < 5 && companyProfile) {
      this.initializeAnthropic();

      if (!this.anthropicClient) {
        return problems;
      }

      try {
        const message = await this.anthropicClient.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{
            role: 'user',
            content: `Generate coding interview problems commonly asked by ${companyProfile.name} related to "${query}".

Company Interview Profile:
- Focus Areas: ${companyProfile.focusAreas.join(', ')}
- Top Categories: ${companyProfile.topCategories.join(', ')}
- Common Tags: ${companyProfile.topTags.join(', ')}
- Interview Style: ${companyProfile.interviewStyle}
- Difficulty Distribution: Easy ${companyProfile.difficultyDistribution.easy}%, Medium ${companyProfile.difficultyDistribution.medium}%, Hard ${companyProfile.difficultyDistribution.hard}%

Generate 3-5 realistic interview problems that match ${companyProfile.name}'s style.
${difficulty ? `Difficulty: ${difficulty}` : 'Match the company distribution'}

Format as JSON array with fields: title, description, difficulty, tags.
Return only valid JSON array, no markdown.`
          }]
        });

        const firstBlock = message.content[0];
        const responseText = firstBlock.type === 'text' ? firstBlock.text : '';
        const cleanText = responseText.replace(/```json|```/g, '').trim();
        
        try {
          const aiProblems = JSON.parse(cleanText);
          const generatedProblems = aiProblems.map((p: any, idx: number) => ({
            id: `company-${company.toLowerCase()}-ai-${idx}`,
            title: p.title,
            description: p.description,
            difficulty: p.difficulty || 'Medium',
            source: 'Custom' as const,
            tags: p.tags || [],
            company: company
          }));
          problems.push(...generatedProblems);
        } catch (parseError) {
          console.warn('⚠️ Failed to parse AI response for company problems');
        }
      } catch (error: any) {
        console.error('❌ AI company problem generation failed:', error.message);
      }
    }

    return problems;
  }

  /**
   * Fallback company problems
   */
  private getFallbackCompanyProblems(
    query: string,
    company: string,
    difficulty?: string
  ): CodingProblem[] {
    const problems: CodingProblem[] = [];
    const queryLower = query.toLowerCase();

    // Common problems for top companies
    if (queryLower.includes('string') || queryLower.includes('75')) {
      problems.push({
        id: `company-${company}-1`,
        title: `${company} - String/Array Problem`,
        description: `Common ${company} interview problem related to ${query}. Practice string manipulation and array algorithms.`,
        difficulty: (difficulty || 'Medium') as 'Easy' | 'Medium' | 'Hard',
        source: 'Glassdoor',
        url: `https://www.glassdoor.com/Interview/${company}-interview-questions-SRCH_KE0,${company.length}.htm`,
        tags: ['Strings', 'Arrays', 'Algorithms'],
        company: company
      });
    }

    return problems;
  }

  /**
   * Generate hints for a problem using AI
   */
  async generateHints(problemTitle: string, problemDescription: string): Promise<string[]> {
    this.initializeAnthropic();

    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    try {
      console.log(`💡 Generating hints for: ${problemTitle}`);

      const message = await this.anthropicClient.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are a coding interview coach. For this problem, provide helpful hints that guide the student without giving away the solution.

Problem: ${problemTitle}
Description: ${problemDescription}

Provide 3-5 progressive hints:
1. First hint: General approach or data structure to consider
2. Second hint: More specific technique or pattern
3. Third hint: Edge cases or optimization considerations
4. Additional hints if needed

Format as a JSON array of hint strings. Each hint should be progressively more helpful but not reveal the complete solution.

Return only valid JSON array, no markdown.`
        }]
      });

      const firstBlock = message.content[0];
      const responseText = firstBlock.type === 'text' ? firstBlock.text : '';
      const cleanText = responseText.replace(/```json|```/g, '').trim();
      
      try {
        const hints = JSON.parse(cleanText);
        return Array.isArray(hints) ? hints : [hints];
      } catch (parseError) {
        // Fallback hints
        return [
          'Consider what data structures might be useful for this problem.',
          'Think about the time and space complexity trade-offs.',
          'Consider edge cases: empty inputs, single elements, duplicates.',
          'Try to break the problem into smaller subproblems.'
        ];
      }
    } catch (error: any) {
      console.error('❌ Hint generation failed:', error.message);
      return [
        'Consider what data structures might be useful for this problem.',
        'Think about the time and space complexity trade-offs.',
        'Consider edge cases: empty inputs, single elements, duplicates.'
      ];
    }
  }

  /**
   * Evaluate submitted code for a problem
   * Returns a score 0-100 with detailed feedback
   */
  async evaluateCode(
    problemTitle: string,
    problemDescription: string,
    code: string,
    language: string
  ): Promise<{
    score: number;
    correctness: number;
    timeComplexity: { score: number; analysis: string };
    spaceComplexity: { score: number; analysis: string };
    codeQuality: { score: number; feedback: string[] };
    overallFeedback: string;
    suggestions: string[];
    testCases?: { input: string; expected: string; passed: boolean }[];
  }> {
    this.initializeAnthropic();

    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    try {
      console.log(`📝 Evaluating code for: ${problemTitle}`);

      const message = await this.anthropicClient.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `You are an expert coding interview evaluator. Analyze this code solution and provide a detailed evaluation.

PROBLEM: ${problemTitle}
DESCRIPTION: ${problemDescription}

SUBMITTED CODE (${language}):
\`\`\`${language}
${code}
\`\`\`

Evaluate the code and return a JSON object with these fields:

{
  "score": <overall score 0-100>,
  "correctness": <0-100 based on whether the solution solves the problem correctly>,
  "timeComplexity": {
    "score": <0-100 based on optimal time complexity>,
    "analysis": "<Big O analysis, e.g., O(n log n)>"
  },
  "spaceComplexity": {
    "score": <0-100 based on optimal space complexity>,
    "analysis": "<Big O analysis, e.g., O(n)>"
  },
  "codeQuality": {
    "score": <0-100 for code style, readability, best practices>,
    "feedback": ["<specific feedback point 1>", "<feedback point 2>", ...]
  },
  "overallFeedback": "<2-3 sentence summary of the solution quality>",
  "suggestions": ["<improvement suggestion 1>", "<suggestion 2>", ...],
  "testCases": [
    {"input": "<example input>", "expected": "<expected output>", "passed": <true/false if code would pass>}
  ]
}

Scoring guidelines:
- 90-100: Optimal solution, clean code, handles edge cases
- 70-89: Correct solution, good complexity, minor improvements possible
- 50-69: Works but not optimal, or has code quality issues
- 30-49: Partially correct, significant issues
- 0-29: Incorrect or incomplete solution

Return ONLY valid JSON, no markdown formatting.`
        }]
      });

      const firstBlock = message.content[0];
      const responseText = firstBlock.type === 'text' ? firstBlock.text : '';
      const cleanText = responseText.replace(/```json|```/g, '').trim();
      
      try {
        const evaluation = JSON.parse(cleanText);
        return {
          score: evaluation.score || 0,
          correctness: evaluation.correctness || 0,
          timeComplexity: evaluation.timeComplexity || { score: 0, analysis: 'Unable to analyze' },
          spaceComplexity: evaluation.spaceComplexity || { score: 0, analysis: 'Unable to analyze' },
          codeQuality: evaluation.codeQuality || { score: 0, feedback: [] },
          overallFeedback: evaluation.overallFeedback || 'Unable to provide feedback',
          suggestions: evaluation.suggestions || [],
          testCases: evaluation.testCases || []
        };
      } catch (parseError) {
        console.warn('⚠️ Failed to parse AI evaluation response');
        return {
          score: 50,
          correctness: 50,
          timeComplexity: { score: 50, analysis: 'Unable to analyze - please check code syntax' },
          spaceComplexity: { score: 50, analysis: 'Unable to analyze - please check code syntax' },
          codeQuality: { score: 50, feedback: ['Code could not be fully analyzed'] },
          overallFeedback: 'The code could not be fully evaluated. Please ensure proper syntax and try again.',
          suggestions: ['Ensure code is syntactically correct', 'Add comments to explain your approach'],
          testCases: []
        };
      }
    } catch (error: any) {
      console.error('❌ Code evaluation failed:', error.message);
      throw new Error(`Failed to evaluate code: ${error.message}`);
    }
  }

  /**
   * Generate problem-specific method signature
   */
  async generateSignature(
    problemTitle: string,
    problemDescription: string,
    language: string
  ): Promise<string> {
    this.initializeAnthropic();

    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    try {
      console.log(`🔧 Generating method signature for: ${problemTitle} (${language})`);

      const languageExamples: Record<string, string> = {
        javascript: 'function twoSum(nums, target) {\n  // Your code here\n}',
        typescript: 'function twoSum(nums: number[], target: number): number[] {\n  // Your code here\n}',
        python: 'def two_sum(nums: List[int], target: int) -> List[int]:\n    # Your code here\n    pass',
        java: 'public int[] twoSum(int[] nums, int target) {\n    // Your code here\n}',
        cpp: 'vector<int> twoSum(vector<int>& nums, int target) {\n    // Your code here\n}',
        csharp: 'public int[] TwoSum(int[] nums, int target) {\n    // Your code here\n}',
        go: 'func twoSum(nums []int, target int) []int {\n    // Your code here\n}'
      };

      const message = await this.anthropicClient.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Generate a complete, ready-to-use code template for this coding problem in ${language}.

PROBLEM: ${problemTitle}
DESCRIPTION: ${problemDescription}

The template should include:
1. A properly named function/method that matches the problem (e.g., twoSum, maxProfit, reverseList)
2. Correct parameter types based on the problem description
3. Correct return type
4. Helpful comments explaining what each parameter is
5. A placeholder comment where the solution should go
6. For class-based languages (Python, Java, C#), wrap in a Solution class

Example format for ${language}:
${languageExamples[language] || languageExamples.javascript}

Return ONLY the code template, no explanations or markdown.`
        }]
      });

      const firstBlock = message.content[0];
      let signature = firstBlock.type === 'text' ? firstBlock.text : '';
      
      // Clean up any markdown code blocks
      signature = signature
        .replace(/^```\w*\n?/gm, '')
        .replace(/```$/gm, '')
        .trim();

      return signature;
    } catch (error: any) {
      console.error('❌ Signature generation failed:', error.message);
      throw new Error(`Failed to generate signature: ${error.message}`);
    }
  }

  /**
   * Generate improved code based on suggestions
   */
  async generateImprovedCode(
    problemTitle: string,
    problemDescription: string,
    currentCode: string,
    language: string,
    suggestions: string[]
  ): Promise<string> {
    this.initializeAnthropic();

    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    try {
      console.log(`✨ Generating improved code for: ${problemTitle}`);

      const message = await this.anthropicClient.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `You are an expert code reviewer. Apply the following suggestions to improve the given code.

PROBLEM: ${problemTitle}
DESCRIPTION: ${problemDescription}

CURRENT CODE (${language}):
\`\`\`${language}
${currentCode}
\`\`\`

SUGGESTIONS TO APPLY:
${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Generate the improved version of the code that applies these suggestions.
Keep the same general structure and approach, but improve:
- Variable naming if suggested
- Algorithm efficiency if suggested
- Code readability
- Error handling if applicable
- Edge case handling if suggested

Return ONLY the improved code, no explanations or markdown code blocks.`
        }]
      });

      const firstBlock = message.content[0];
      let improvedCode = firstBlock.type === 'text' ? firstBlock.text : '';
      
      // Clean up any markdown code blocks
      improvedCode = improvedCode
        .replace(/^```\w*\n?/gm, '')
        .replace(/```$/gm, '')
        .trim();

      return improvedCode;
    } catch (error: any) {
      console.error('❌ Code improvement failed:', error.message);
      throw new Error(`Failed to improve code: ${error.message}`);
    }
  }
}

export default new ProblemSolvingService();


