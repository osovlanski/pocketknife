/**
 * LeetCode GraphQL Service
 * 
 * Fetches coding problems directly from LeetCode using their GraphQL API.
 * No authentication required for reading public problem data.
 * 
 * Note: LeetCode's API is unofficial and may change without notice.
 */

import axios from 'axios';
import { cacheService } from '../core/cacheService';
import { configService } from '../core/configService';
import logger from '../../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface LeetCodeProblem {
  id: string;
  titleSlug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  content: string;
  exampleTestcaseList: string[];
  topicTags: { name: string; slug: string }[];
  companyTagStats: string | null;
  hints: string[];
  stats: {
    totalAccepted: string;
    totalSubmission: string;
    acRate: string;
  };
  isPaidOnly: boolean;
  likes: number;
  dislikes: number;
}

export interface LeetCodeProblemSummary {
  id: string;
  titleSlug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  acRate: number;
  topicTags: string[];
  isPaidOnly: boolean;
}

export interface ProblemListFilters {
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  tags?: string[];
  searchKeywords?: string;
  limit?: number;
  skip?: number;
}

// =============================================================================
// LEETCODE SERVICE
// =============================================================================

class LeetCodeService {
  private readonly baseUrl = configService.get('problems.leetcode.graphqlUrl', 'https://leetcode.com/graphql');
  private readonly timeout = configService.get('problems.leetcode.timeoutMs', 10000);

  /**
   * Check if LeetCode API is available
   */
  isAvailable(): boolean {
    return true; // LeetCode GraphQL is always accessible
  }

  /**
   * Fetch a specific problem by its slug
   */
  async getProblem(titleSlug: string): Promise<LeetCodeProblem | null> {
    const cacheKey = `leetcode:problem:${titleSlug}`;
    const cached = await cacheService.get<LeetCodeProblem>(cacheKey);
    if (cached) {
      logger.cache('LeetCode problem cache hit');
      return cached;
    }

    const query = `
      query questionData($titleSlug: String!) {
        question(titleSlug: $titleSlug) {
          questionId
          titleSlug
          title
          difficulty
          content
          exampleTestcaseList
          topicTags {
            name
            slug
          }
          companyTagStats
          hints
          stats
          isPaidOnly
          likes
          dislikes
        }
      }
    `;

    try {
      const response = await axios.post(this.baseUrl, {
        query,
        variables: { titleSlug }
      }, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com'
        }
      });

      const data = response.data?.data?.question;
      if (!data) return null;

      const problem: LeetCodeProblem = {
        id: data.questionId,
        titleSlug: data.titleSlug,
        title: data.title,
        difficulty: data.difficulty,
        content: data.content,
        exampleTestcaseList: data.exampleTestcaseList || [],
        topicTags: data.topicTags || [],
        companyTagStats: data.companyTagStats,
        hints: data.hints || [],
        stats: JSON.parse(data.stats || '{}'),
        isPaidOnly: data.isPaidOnly,
        likes: data.likes,
        dislikes: data.dislikes
      };

      // Cache for 24 hours (problems don't change often)
      await cacheService.set(cacheKey, problem, { ttl: 86400 });

      return problem;
    } catch (error: any) {
      logger.fail('Failed to fetch LeetCode problem', { titleSlug, error: error.message });
      return null;
    }
  }

  /**
   * Get list of problems with optional filters
   */
  async getProblems(filters: ProblemListFilters = {}): Promise<LeetCodeProblemSummary[]> {
    const { difficulty, tags, searchKeywords, limit = 50, skip = 0 } = filters;

    const cacheKey = `leetcode:problems:${JSON.stringify(filters)}`;
    const cached = await cacheService.get<LeetCodeProblemSummary[]>(cacheKey);
    if (cached) {
      logger.cache('LeetCode problems list cache hit');
      return cached;
    }

    const query = `
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
              id
              slug
            }
          }
        }
      }
    `;

    const filterInput: Record<string, any> = {};
    if (difficulty) filterInput.difficulty = difficulty;
    if (tags?.length) filterInput.tags = tags;
    if (searchKeywords) filterInput.searchKeywords = searchKeywords;

    try {
      const response = await axios.post(this.baseUrl, {
        query,
        variables: {
          categorySlug: 'all-code-essentials',
          limit,
          skip,
          filters: filterInput
        }
      }, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com'
        }
      });

      const questions = response.data?.data?.problemsetQuestionList?.questions || [];

      const problems: LeetCodeProblemSummary[] = questions.map((q: any) => ({
        id: q.frontendQuestionId,
        titleSlug: q.titleSlug,
        title: q.title,
        difficulty: q.difficulty,
        acRate: parseFloat(q.acRate?.toFixed(1) || '0'),
        topicTags: q.topicTags?.map((t: any) => t.name) || [],
        isPaidOnly: q.paidOnly
      }));

      // Cache for 1 hour
      await cacheService.set(cacheKey, problems, { ttl: 3600 });

      logger.success('Fetched LeetCode problems', { count: problems.length });
      return problems;
    } catch (error: any) {
      logger.fail('Failed to fetch LeetCode problems', { error: error.message });
      return [];
    }
  }

  /**
   * Get daily challenge problem
   */
  async getDailyChallenge(): Promise<LeetCodeProblem | null> {
    const cacheKey = 'leetcode:daily';
    const cached = await cacheService.get<LeetCodeProblem>(cacheKey);
    if (cached) {
      logger.cache('LeetCode daily challenge cache hit');
      return cached;
    }

    const query = `
      query questionOfToday {
        activeDailyCodingChallengeQuestion {
          date
          userStatus
          link
          question {
            acRate
            difficulty
            freqBar
            frontendQuestionId: questionFrontendId
            isFavor
            paidOnly: isPaidOnly
            status
            title
            titleSlug
            hasVideoSolution
            hasSolution
            topicTags {
              name
              id
              slug
            }
          }
        }
      }
    `;

    try {
      const response = await axios.post(this.baseUrl, { query }, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com'
        }
      });

      const dailyData = response.data?.data?.activeDailyCodingChallengeQuestion;
      if (!dailyData?.question?.titleSlug) return null;

      // Get full problem details
      const problem = await this.getProblem(dailyData.question.titleSlug);

      if (problem) {
        // Cache until midnight UTC
        const now = new Date();
        const midnight = new Date(now);
        midnight.setUTCHours(24, 0, 0, 0);
        const ttl = Math.floor((midnight.getTime() - now.getTime()) / 1000);
        await cacheService.set(cacheKey, problem, { ttl });
      }

      return problem;
    } catch (error: any) {
      logger.fail('Failed to fetch daily challenge', { error: error.message });
      return null;
    }
  }

  /**
   * Get popular/curated problem lists (like Blind 75, NeetCode 150, etc.)
   */
  async getCuratedList(listName: string): Promise<LeetCodeProblemSummary[]> {
    // These are well-known curated lists with their problem slugs
    const curatedLists: Record<string, string[]> = {
      'blind75': [
        'two-sum', 'best-time-to-buy-and-sell-stock', 'contains-duplicate', 'product-of-array-except-self',
        'maximum-subarray', 'maximum-product-subarray', 'find-minimum-in-rotated-sorted-array',
        'search-in-rotated-sorted-array', 'container-with-most-water', 'sum-of-two-integers',
        'number-of-1-bits', 'counting-bits', 'missing-number', 'reverse-bits', 'climbing-stairs',
        'coin-change', 'longest-increasing-subsequence', 'longest-common-subsequence', 'word-break',
        'combination-sum', 'house-robber', 'house-robber-ii', 'decode-ways', 'unique-paths', 'jump-game'
      ],
      'top-interview': [
        'two-sum', 'add-two-numbers', 'longest-substring-without-repeating-characters', 'median-of-two-sorted-arrays',
        'longest-palindromic-substring', 'zigzag-conversion', 'reverse-integer', 'string-to-integer-atoi',
        'palindrome-number', 'regular-expression-matching', 'container-with-most-water', 'integer-to-roman'
      ],
      'dynamic-programming': [
        'climbing-stairs', 'house-robber', 'coin-change', 'longest-increasing-subsequence',
        'word-break', 'decode-ways', 'unique-paths', 'jump-game', 'maximum-subarray'
      ]
    };

    const slugs = curatedLists[listName.toLowerCase()];
    if (!slugs) {
      return [];
    }

    const cacheKey = `leetcode:list:${listName}`;
    const cached = await cacheService.get<LeetCodeProblemSummary[]>(cacheKey);
    if (cached) return cached;

    // Fetch each problem (we could optimize with parallel requests)
    const problems: LeetCodeProblemSummary[] = [];
    
    for (const slug of slugs.slice(0, 25)) { // Limit to avoid rate limiting
      const problem = await this.getProblem(slug);
      if (problem && !problem.isPaidOnly) {
        problems.push({
          id: problem.id,
          titleSlug: problem.titleSlug,
          title: problem.title,
          difficulty: problem.difficulty,
          acRate: parseFloat(problem.stats.acRate || '0'),
          topicTags: problem.topicTags.map(t => t.name),
          isPaidOnly: problem.isPaidOnly
        });
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Cache for 24 hours
    await cacheService.set(cacheKey, problems, { ttl: 86400 });

    return problems;
  }

  /**
   * Get all available topic tags
   */
  async getTopicTags(): Promise<{ name: string; slug: string; count: number }[]> {
    const cacheKey = 'leetcode:tags';
    const cached = await cacheService.get<{ name: string; slug: string; count: number }[]>(cacheKey);
    if (cached) return cached;

    const query = `
      query getTopicTags {
        topicTags {
          name
          slug
          questionCount: questions
        }
      }
    `;

    try {
      const response = await axios.post(this.baseUrl, { query }, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com'
        }
      });

      const tags = (response.data?.data?.topicTags || []).map((t: any) => ({
        name: t.name,
        slug: t.slug,
        count: t.questionCount
      }));

      await cacheService.set(cacheKey, tags, { ttl: 86400 });
      return tags;
    } catch (error: any) {
      logger.fail('Failed to fetch topic tags', { error: error.message });
      return [];
    }
  }

  /**
   * Get problems by company tag
   */
  async getProblemsByCompany(company: string, limit: number = 20): Promise<LeetCodeProblemSummary[]> {
    // Company-tagged problems require premium, so we search by keywords instead
    return this.getProblems({
      searchKeywords: company,
      limit
    });
  }
}

// Export singleton
export const leetcodeService = new LeetCodeService();
export default leetcodeService;


