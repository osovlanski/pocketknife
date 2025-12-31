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

interface LinkedInConfig {
  accessToken?: string;
  isPremium?: boolean;
}

// Popular tech newsletters with RSS feeds or APIs
const NEWSLETTER_SOURCES = {
  'systemdesign': {
    name: 'System Design Newsletter',
    rssUrl: 'https://newsletter.systemdesign.one/feed',
    website: 'https://newsletter.systemdesign.one',
    tags: ['system-design', 'architecture', 'distributed-systems']
  },
  'bytebytego': {
    name: 'ByteByteGo',
    rssUrl: 'https://blog.bytebytego.com/feed',
    website: 'https://blog.bytebytego.com',
    tags: ['system-design', 'architecture', 'interviews']
  },
  'tldr': {
    name: 'TLDR Newsletter',
    rssUrl: 'https://tldr.tech/rss',
    website: 'https://tldr.tech',
    tags: ['tech-news', 'startups', 'programming']
  },
  'pragmaticengineer': {
    name: 'The Pragmatic Engineer',
    rssUrl: 'https://newsletter.pragmaticengineer.com/feed',
    website: 'https://newsletter.pragmaticengineer.com',
    tags: ['engineering', 'career', 'tech-industry']
  },
  'quastor': {
    name: 'Quastor',
    rssUrl: 'https://blog.quastor.org/feed',
    website: 'https://blog.quastor.org',
    tags: ['system-design', 'engineering', 'big-tech']
  },
  'weeklydev': {
    name: 'Weekly Dev Tips',
    website: 'https://weeklydevtips.com',
    tags: ['development', 'tips', 'best-practices']
  }
};

class LearningService {
  private anthropicClient: Anthropic | null = null;
  private linkedInConfig: LinkedInConfig = {};

  private initializeAnthropic() {
    if (this.anthropicClient) return;
    
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    
    this.anthropicClient = new Anthropic({ apiKey });
  }

  /**
   * Configure LinkedIn Premium access
   */
  configureLinkedIn(config: LinkedInConfig) {
    this.linkedInConfig = config;
    console.log(`🔗 LinkedIn configured: Premium=${config.isPremium ? 'Yes' : 'No'}`);
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
   * If LinkedIn Premium is configured, use enhanced API features
   */
  async searchLinkedInStyle(query: string): Promise<LearningResource[]> {
    try {
      console.log('🔍 Searching for professional content:', query);
      
      const results: LearningResource[] = [];

      // If LinkedIn Premium is configured with access token, use LinkedIn API
      if (this.linkedInConfig.accessToken && this.linkedInConfig.isPremium) {
        console.log('🔗 Using LinkedIn Premium API...');
        try {
          // LinkedIn Marketing API for content search (requires approved app)
          // Note: LinkedIn API requires OAuth 2.0 and approved application
          // This shows the structure - actual implementation requires LinkedIn Developer account
          const linkedInResults = await this.searchLinkedInPremium(query);
          results.push(...linkedInResults);
        } catch (linkedInError: any) {
          console.warn('⚠️ LinkedIn Premium API failed, falling back to alternatives:', linkedInError.message);
        }
      }

      // Search professional/career focused content from Dev.to as fallback/supplement
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
      
      const devToResults = filtered.slice(0, 10).map((article: any) => ({
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

      results.push(...devToResults);
      return results;
    } catch (error: any) {
      console.error('❌ LinkedIn-style search failed:', error.message);
      return [];
    }
  }

  /**
   * Search LinkedIn Premium API (requires OAuth token)
   * LinkedIn Premium features:
   * - Access to LinkedIn Learning courses
   * - InMail messaging for networking
   * - Who viewed your profile (for content ideas)
   * - Premium insights on posts
   */
  private async searchLinkedInPremium(query: string): Promise<LearningResource[]> {
    if (!this.linkedInConfig.accessToken) {
      throw new Error('LinkedIn access token not configured');
    }

    try {
      // LinkedIn API endpoints for premium users
      // Note: These require a LinkedIn Developer application with proper permissions
      
      // Option 1: LinkedIn Marketing API for content discovery
      // POST https://api.linkedin.com/v2/search with authorization

      // Option 2: Use LinkedIn's Share API to find popular posts
      // GET https://api.linkedin.com/v2/shares

      // For now, simulate what premium access would provide
      console.log('🔗 LinkedIn Premium: Searching for posts related to:', query);
      
      // In production, you would:
      // 1. Register app at https://www.linkedin.com/developers/
      // 2. Get OAuth 2.0 access token with proper scopes
      // 3. Use Marketing API or Content Suggestions API
      
      return [];
    } catch (error: any) {
      console.error('❌ LinkedIn Premium API error:', error.message);
      return [];
    }
  }

  /**
   * Search tech newsletters (System Design, ByteByteGo, TLDR, etc.)
   */
  async searchNewsletters(query: string): Promise<LearningResource[]> {
    try {
      console.log('📰 Searching tech newsletters for:', query);
      const results: LearningResource[] = [];
      const queryWords = query.toLowerCase().split(/\s+/);

      // Search each newsletter source
      for (const [key, newsletter] of Object.entries(NEWSLETTER_SOURCES)) {
        if (!newsletter.rssUrl) continue;

        try {
          // Fetch RSS feed
          const response = await axios.get(newsletter.rssUrl, {
            timeout: 10000,
            headers: {
              'Accept': 'application/rss+xml, application/xml, text/xml'
            }
          });

          // Parse RSS XML (simple regex extraction for common RSS formats)
          const items = this.parseRSSItems(response.data, newsletter.name, newsletter.tags);
          
          // Filter by query relevance
          const relevant = items.filter(item => {
            const text = `${item.title} ${item.description}`.toLowerCase();
            return queryWords.some(word => text.includes(word));
          });

          results.push(...relevant.slice(0, 5));
        } catch (feedError: any) {
          console.warn(`⚠️ Failed to fetch ${newsletter.name}:`, feedError.message);
          
          // Add a placeholder link to the newsletter website
          if (queryWords.some(word => newsletter.tags.some(tag => tag.includes(word)))) {
            results.push({
              id: `newsletter-${key}-main`,
              title: `${newsletter.name} - Browse latest articles`,
              url: newsletter.website,
              source: newsletter.name,
              description: `Visit ${newsletter.name} for the latest content on ${newsletter.tags.join(', ')}`,
              tags: newsletter.tags,
              publishedAt: new Date().toISOString(),
              author: newsletter.name
            });
          }
        }
      }

      console.log(`✅ Found ${results.length} newsletter articles`);
      return results;
    } catch (error: any) {
      console.error('❌ Newsletter search failed:', error.message);
      return [];
    }
  }

  /**
   * Parse RSS XML to extract items
   */
  private parseRSSItems(xml: string, sourceName: string, defaultTags: string[]): LearningResource[] {
    const items: LearningResource[] = [];
    
    // Simple regex-based RSS parsing (works for most feeds)
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const titleRegex = /<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i;
    const linkRegex = /<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/i;
    const descRegex = /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i;
    const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/i;
    const authorRegex = /<(?:author|dc:creator)>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/(?:author|dc:creator)>/i;

    let match;
    let index = 0;
    while ((match = itemRegex.exec(xml)) !== null && index < 10) {
      const itemXml = match[1];
      
      const titleMatch = itemXml.match(titleRegex);
      const linkMatch = itemXml.match(linkRegex);
      const descMatch = itemXml.match(descRegex);
      const dateMatch = itemXml.match(pubDateRegex);
      const authorMatch = itemXml.match(authorRegex);

      if (titleMatch && linkMatch) {
        items.push({
          id: `newsletter-${sourceName.toLowerCase().replace(/\s+/g, '-')}-${index}`,
          title: this.decodeHtmlEntities(titleMatch[1].trim()),
          url: linkMatch[1].trim(),
          source: sourceName,
          description: descMatch ? this.decodeHtmlEntities(descMatch[1].trim()).substring(0, 300) : '',
          tags: defaultTags,
          publishedAt: dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString(),
          author: authorMatch ? authorMatch[1].trim() : sourceName
        });
        index++;
      }
    }

    return items;
  }

  /**
   * Decode HTML entities
   */
  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/<[^>]+>/g, ''); // Remove any remaining HTML tags
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
    const sourceNames: string[] = [];

    if (sources.includes('devto')) {
      searchPromises.push(this.searchDevTo(query));
      sourceNames.push('Dev.to');
    }
    if (sources.includes('hackernews')) {
      searchPromises.push(this.searchHackerNews(query));
      sourceNames.push('Hacker News');
    }
    if (sources.includes('reddit')) {
      searchPromises.push(this.searchReddit(query));
      sourceNames.push('Reddit');
    }
    if (sources.includes('linkedin')) {
      searchPromises.push(this.searchLinkedInStyle(query));
      sourceNames.push('LinkedIn' + (this.linkedInConfig.isPremium ? ' Premium' : ''));
    }
    if (sources.includes('medium')) {
      searchPromises.push(this.searchMedium(query));
      sourceNames.push('Medium');
    }
    // Newsletter sources
    if (sources.includes('newsletters') || sources.includes('systemdesign') || 
        sources.includes('bytebytego') || sources.includes('tldr')) {
      searchPromises.push(this.searchNewsletters(query));
      sourceNames.push('Newsletters');
    }

    const results = await Promise.allSettled(searchPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allResources.push(...result.value);
        if (io && result.value.length > 0) {
          io.emit('learning-log', {
            message: `✅ Found ${result.value.length} resources from ${sourceNames[index] || `source ${index + 1}`}`,
            type: 'success'
          });
        }
      } else {
        if (io) {
          io.emit('learning-log', {
            message: `⚠️ ${sourceNames[index] || `Source ${index + 1}`} search failed`,
            type: 'warning'
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
   * Summarize an article using Claude AI - Expert Level Summary
   * Like a student summarizing for a professor: structured, detailed, actionable
   */
  async summarizeArticle(url: string, title: string): Promise<string> {
    this.initializeAnthropic();

    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    try {
      console.log(`📝 Creating expert summary: ${title}`);

      // Fetch article content
      let articleContent = '';
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          timeout: 15000
        });
        
        // Extract text content from HTML (improved extraction)
        articleContent = response.data
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
          .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
          .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
          .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .substring(0, 8000); // Increased for better context
      } catch (fetchError) {
        console.warn('⚠️ Could not fetch article content, using title only');
        articleContent = `Article: ${title}\nURL: ${url}\n\nNote: Full content could not be fetched. Please provide a general overview based on the title.`;
      }

      const message = await this.anthropicClient.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `You are an expert technical educator creating a study summary for senior developers. 
Analyze this article and create a comprehensive, structured summary like a graduate student preparing notes for a professor.

FORMAT REQUIREMENTS:
1. Start with a 2-sentence TL;DR (executive summary)
2. Use bullet points (•) for key takeaways - aim for 4-6 points
3. If applicable, include a simple ASCII diagram showing architecture/flow
4. Mark any ⚠️ IMPORTANT notes or gotchas
5. End with 💡 ACTIONABLE INSIGHTS - what can the reader immediately apply

EXAMPLE FORMAT:
📋 TL;DR: [2-sentence summary]

🔑 KEY TAKEAWAYS:
• Point 1
• Point 2
• Point 3

📊 CONCEPT DIAGRAM (if applicable):
\`\`\`
[Simple ASCII diagram]
\`\`\`

⚠️ IMPORTANT NOTES:
• Critical point 1
• Watch out for...

💡 ACTIONABLE INSIGHTS:
• Apply this by...
• Start with...

---

Title: ${title}
URL: ${url}

Content:
${articleContent}

Create the expert summary:`
        }]
      });

      const firstBlock = message.content[0];
      return firstBlock.type === 'text' ? firstBlock.text.trim() : 'Summary not available';
    } catch (error: any) {
      console.error('❌ Summarization failed:', error.message);
      throw new Error('Failed to summarize article');
    }
  }

  /**
   * Get LinkedIn Premium integration status and instructions
   */
  getLinkedInIntegrationInfo(): { 
    configured: boolean; 
    isPremium: boolean; 
    instructions: string;
    features: string[];
  } {
    const configured = !!this.linkedInConfig.accessToken;
    const isPremium = this.linkedInConfig.isPremium || false;

    return {
      configured,
      isPremium,
      instructions: configured 
        ? 'LinkedIn Premium is configured and active.'
        : `To integrate LinkedIn Premium:
1. Go to https://www.linkedin.com/developers/apps and create an app
2. Request access to Marketing API or Content Suggestions API
3. Get OAuth 2.0 access token with proper scopes:
   - r_liteprofile
   - r_emailaddress
   - w_member_social
4. Add to your .env file:
   LINKEDIN_ACCESS_TOKEN=your_token
   LINKEDIN_IS_PREMIUM=true
5. Restart the backend server`,
      features: [
        '📊 Access to LinkedIn Learning courses metadata',
        '🔍 Search LinkedIn posts and articles directly',
        '👥 Find content from industry leaders in your network',
        '📈 Get insights on trending topics in your industry',
        '🎯 Personalized content recommendations',
        '📬 Save articles to LinkedIn for later reading'
      ]
    };
  }
}

export default new LearningService();

export default new LearningService();

