import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';

interface LearningResource {
  id: string;
  title: string;
  url: string;
  source: string;
  description: string;
  summary?: string;
  tags: string[];
  publishedAt: string;
  author?: string;
  readTime?: string;
}

interface SearchOptions {
  query: string;
  sources: string[];
  timeRange: 'day' | 'week' | 'month' | 'all';
}

class LearningService {
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
   * Search Dev.to for technical articles
   */
  async searchDevTo(query: string): Promise<LearningResource[]> {
    try {
      console.log('🔍 Searching Dev.to for:', query);
      
      const response = await axios.get('https://dev.to/api/articles', {
        params: {
          tag: query.toLowerCase().replace(/\s+/g, ''),
          per_page: 15,
          top: 7 // Top articles from last 7 days
        },
        timeout: 10000
      });

      const articles = response.data || [];
      
      return articles.map((article: any) => ({
        id: `devto-${article.id}`,
        title: article.title,
        url: article.url,
        source: 'Dev.to',
        description: article.description || article.title,
        tags: article.tag_list || [],
        publishedAt: article.published_at,
        author: article.user?.name || article.user?.username,
        readTime: `${article.reading_time_minutes} min read`
      }));
    } catch (error: any) {
      console.error('❌ Dev.to search failed:', error.message);
      return [];
    }
  }

  /**
   * Search Hacker News for tech discussions
   */
  async searchHackerNews(query: string): Promise<LearningResource[]> {
    try {
      console.log('🔍 Searching Hacker News for:', query);
      
      const response = await axios.get('https://hn.algolia.com/api/v1/search', {
        params: {
          query,
          tags: 'story',
          hitsPerPage: 15
        },
        timeout: 10000
      });

      const hits = response.data.hits || [];
      
      return hits
        .filter((hit: any) => hit.url) // Only include stories with URLs
        .map((hit: any) => ({
          id: `hn-${hit.objectID}`,
          title: hit.title,
          url: hit.url,
          source: 'Hacker News',
          description: `${hit.points} points | ${hit.num_comments} comments`,
          tags: ['tech', 'programming'],
          publishedAt: new Date(hit.created_at).toISOString(),
          author: hit.author
        }));
    } catch (error: any) {
      console.error('❌ Hacker News search failed:', error.message);
      return [];
    }
  }

  /**
   * Search Reddit for programming content
   */
  async searchReddit(query: string): Promise<LearningResource[]> {
    try {
      console.log('🔍 Searching Reddit for:', query);
      
      const response = await axios.get('https://www.reddit.com/search.json', {
        params: {
          q: query,
          sort: 'relevance',
          t: 'week',
          limit: 15,
          restrict_sr: false
        },
        headers: {
          'User-Agent': 'Pocketknife-Learning-Agent/1.0'
        },
        timeout: 10000
      });

      const posts = response.data?.data?.children || [];
      
      return posts
        .filter((post: any) => !post.data.is_self || post.data.selftext) // Has content
        .map((post: any) => ({
          id: `reddit-${post.data.id}`,
          title: post.data.title,
          url: post.data.url.startsWith('http') 
            ? post.data.url 
            : `https://reddit.com${post.data.permalink}`,
          source: `Reddit r/${post.data.subreddit}`,
          description: post.data.selftext?.substring(0, 200) || `${post.data.score} upvotes`,
          tags: [post.data.subreddit, 'reddit'],
          publishedAt: new Date(post.data.created_utc * 1000).toISOString(),
          author: post.data.author
        }));
    } catch (error: any) {
      console.error('❌ Reddit search failed:', error.message);
      return [];
    }
  }

  /**
   * Search Medium-like content (using RSS feeds or APIs)
   */
  async searchMedium(query: string): Promise<LearningResource[]> {
    try {
      console.log('🔍 Searching Medium-style content for:', query);
      
      // Medium doesn't have a public API, so we use alternative sources
      // that aggregate Medium content or similar platforms
      
      // Using Google Custom Search or alternative
      // For now, return empty and rely on other sources
      return [];
    } catch (error: any) {
      console.error('❌ Medium search failed:', error.message);
      return [];
    }
  }

  /**
   * Search for LinkedIn-style professional content
   * Note: LinkedIn doesn't have a public content API, so we aggregate from other sources
   */
  async searchLinkedInStyle(query: string): Promise<LearningResource[]> {
    try {
      console.log('🔍 Searching for professional content:', query);
      
      // Search professional/career focused content from Dev.to
      const response = await axios.get('https://dev.to/api/articles', {
        params: {
          tag: 'career',
          per_page: 10
        },
        timeout: 10000
      });

      const articles = response.data || [];
      
      // Filter for query relevance
      const queryWords = query.toLowerCase().split(/\s+/);
      const filtered = articles.filter((article: any) => {
        const text = `${article.title} ${article.description}`.toLowerCase();
        return queryWords.some(word => text.includes(word));
      });
      
      return filtered.slice(0, 10).map((article: any) => ({
        id: `linkedin-style-${article.id}`,
        title: article.title,
        url: article.url,
        source: 'LinkedIn-style',
        description: article.description || article.title,
        tags: ['career', 'professional', ...(article.tag_list || [])],
        publishedAt: article.published_at,
        author: article.user?.name,
        readTime: `${article.reading_time_minutes} min read`
      }));
    } catch (error: any) {
      console.error('❌ LinkedIn-style search failed:', error.message);
      return [];
    }
  }

  /**
   * Search all configured sources
   */
  async searchAllSources(options: SearchOptions, io?: any): Promise<LearningResource[]> {
    const { query, sources } = options;
    const allResources: LearningResource[] = [];

    if (io) {
      io.emit('learning-log', {
        message: `🔍 Searching for "${query}" across ${sources.length} sources...`,
        type: 'info'
      });
    }

    const searchPromises: Promise<LearningResource[]>[] = [];

    if (sources.includes('devto')) {
      searchPromises.push(this.searchDevTo(query));
    }
    if (sources.includes('hackernews')) {
      searchPromises.push(this.searchHackerNews(query));
    }
    if (sources.includes('reddit')) {
      searchPromises.push(this.searchReddit(query));
    }
    if (sources.includes('linkedin')) {
      searchPromises.push(this.searchLinkedInStyle(query));
    }
    if (sources.includes('medium')) {
      searchPromises.push(this.searchMedium(query));
    }

    const results = await Promise.allSettled(searchPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allResources.push(...result.value);
        if (io && result.value.length > 0) {
          io.emit('learning-log', {
            message: `✅ Found ${result.value.length} resources from source ${index + 1}`,
            type: 'success'
          });
        }
      }
    });

    // Remove duplicates by URL
    const uniqueResources = allResources.filter((resource, index, self) =>
      index === self.findIndex(r => r.url === resource.url)
    );

    // Sort by relevance (simple scoring based on query match)
    const queryWords = query.toLowerCase().split(/\s+/);
    uniqueResources.sort((a, b) => {
      const scoreA = queryWords.filter(word => 
        a.title.toLowerCase().includes(word) || 
        a.description.toLowerCase().includes(word)
      ).length;
      const scoreB = queryWords.filter(word => 
        b.title.toLowerCase().includes(word) || 
        b.description.toLowerCase().includes(word)
      ).length;
      return scoreB - scoreA;
    });

    console.log(`✅ Total learning resources found: ${uniqueResources.length}`);
    
    if (io) {
      io.emit('learning-log', {
        message: `✅ Found ${uniqueResources.length} unique learning resources`,
        type: 'success'
      });
    }

    return uniqueResources;
  }

  /**
   * Summarize an article using Claude AI
   */
  async summarizeArticle(url: string, title: string): Promise<string> {
    this.initializeAnthropic();

    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    try {
      console.log(`📝 Summarizing: ${title}`);

      // Fetch article content
      let articleContent = '';
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 10000
        });
        
        // Extract text content from HTML (simple extraction)
        articleContent = response.data
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .substring(0, 5000);
      } catch (fetchError) {
        console.warn('⚠️ Could not fetch article content, using title only');
        articleContent = `Article: ${title}\nURL: ${url}\n\nNote: Full content could not be fetched.`;
      }

      const message = await this.anthropicClient.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Please provide a concise, informative summary of this article in 3-4 sentences. Focus on the key takeaways and main points that would be valuable for a senior developer.

Title: ${title}
URL: ${url}

Content:
${articleContent}

Summary:`
        }]
      });

      const firstBlock = message.content[0];
      return firstBlock.type === 'text' ? firstBlock.text.trim() : 'Summary not available';
    } catch (error: any) {
      console.error('❌ Summarization failed:', error.message);
      throw new Error('Failed to summarize article');
    }
  }
}

export default new LearningService();

