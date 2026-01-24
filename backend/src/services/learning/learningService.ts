import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';
import { configService } from '../core/configService';

// Get timeout from config
const LEARNING_TIMEOUT = () => configService.get('learning.api.timeoutMs', 10000);

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
interface NewsletterSource {
  name: string;
  rssUrl?: string;
  website: string;
  tags: string[];
}

const NEWSLETTER_SOURCES: Record<string, NewsletterSource> = {
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
   * 
   * ⚠️ FUTURE ENHANCEMENT: LinkedIn API integration is not yet implemented.
   * Currently, LinkedIn jobs are accessed via JSearch API (RapidAPI) which works without OAuth.
   * Direct LinkedIn API would require approved developer app with Marketing API access.
   */
  configureLinkedIn(config: LinkedInConfig) {
    this.linkedInConfig = config;
    console.log(`🔗 LinkedIn config saved (Note: Direct API not yet implemented, using JSearch for jobs)`);
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
        timeout: LEARNING_TIMEOUT()
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
        timeout: LEARNING_TIMEOUT()
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
        timeout: LEARNING_TIMEOUT()
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
   * Search for professional/career content
   * 
   * Note: This searches DEV.to career articles as LinkedIn API is not implemented.
   * LinkedIn JOBS are available via JSearch API in the Jobs Agent.
   */
  async searchLinkedInStyle(query: string): Promise<LearningResource[]> {
    try {
      console.log('🔍 Searching for professional/career content:', query);
      
      const results: LearningResource[] = [];

      // Note: LinkedIn Premium API is a future enhancement
      // For now, we use DEV.to career content as an alternative

      // Search professional/career focused content from Dev.to
      const response = await axios.get('https://dev.to/api/articles', {
        params: {
          tag: 'career',
          per_page: 10
        },
        timeout: LEARNING_TIMEOUT()
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
   * 
   * ⚠️ FUTURE ENHANCEMENT - NOT YET IMPLEMENTED
   * 
   * LinkedIn API requires:
   * 1. Approved LinkedIn Developer App (takes weeks for approval)
   * 2. Marketing API or Community Management API access
   * 3. OAuth 2.0 with specific scopes
   * 
   * Current alternative: JSearch API provides LinkedIn job data without OAuth.
   * For learning content: DEV.to, GitHub, and newsletters are used instead.
   */
  private async searchLinkedInPremium(_query: string): Promise<LearningResource[]> {
    // Not implemented - would require approved LinkedIn Developer App
    // LinkedIn jobs are already available via JSearch API
    console.log('ℹ️ LinkedIn Premium API not implemented. Using alternative sources.');
    return [];
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
            timeout: LEARNING_TIMEOUT(),
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
      io.emit('log', {
        message: `🔍 Searching for "${query}" across ${sources.length} sources...`,
        type: 'info',
        agent: 'learning'
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
          const msg = `✅ Found ${result.value.length} resources from ${sourceNames[index] || `source ${index + 1}`}`;
          io.emit('learning-log', { message: msg, type: 'success' });
          io.emit('log', { message: msg, type: 'success', agent: 'learning' });
        }
      } else {
        if (io) {
          const msg = `⚠️ ${sourceNames[index] || `Source ${index + 1}`} search failed`;
          io.emit('learning-log', { message: msg, type: 'warning' });
          io.emit('log', { message: msg, type: 'warning', agent: 'learning' });
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
      const msg = `✅ Found ${uniqueResources.length} unique learning resources`;
      io.emit('learning-log', { message: msg, type: 'success' });
      io.emit('log', { message: msg, type: 'success', agent: 'learning' });
    }

    return uniqueResources;
  }

  /**
   * Generate AI-powered topic summary for improving developer skills
   * Uses Claude Sonnet 4.5 to provide comprehensive topic overview
   */
  async generateTopicSummary(topic: string): Promise<string> {
    this.initializeAnthropic();

    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    try {
      console.log(`📚 Generating topic summary for: ${topic}`);

      const message = await this.anthropicClient.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `You are a senior software engineer and expert technical educator. We would like to improve skills in some features for developers from both technical and design perspectives.

For the topic: "${topic}"

Please provide a comprehensive summary that includes:

1. **Overview** - A brief introduction to the topic and why it matters for developers
2. **Key Concepts** - Bullet points covering the fundamental concepts and principles
3. **Technical Deep Dive** - Important technical details, patterns, and best practices
4. **Design & Architecture** - High-level design flows, architectural patterns, and system design considerations
5. **Common Pitfalls** - What to watch out for and common mistakes
6. **Practical Applications** - Real-world use cases and examples
7. **Learning Path** - Recommended steps to master this topic

Format the response with clear sections using emojis and bullet points for easy reading. Make it actionable and comprehensive, suitable for developers looking to improve their skills in this area.`
        }]
      });

      const firstBlock = message.content[0];
      return firstBlock.type === 'text' ? firstBlock.text.trim() : 'Summary not available';
    } catch (error: any) {
      console.error('❌ Topic summary generation failed:', error.message);
      throw new Error('Failed to generate topic summary');
    }
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
          timeout: LEARNING_TIMEOUT()
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
   * Get LinkedIn integration status and instructions
   * 
   * ⚠️ Note: Direct LinkedIn API is a FUTURE ENHANCEMENT.
   * LinkedIn jobs are currently accessed via JSearch API (working).
   */
  getLinkedInIntegrationInfo(): { 
    configured: boolean; 
    isPremium: boolean; 
    instructions: string;
    features: string[];
    currentStatus: string;
  } {
    const configured = !!this.linkedInConfig.accessToken;
    const isPremium = this.linkedInConfig.isPremium || false;

    return {
      configured,
      isPremium,
      currentStatus: '✅ LinkedIn JOBS work via JSearch API (no config needed). Direct LinkedIn API for learning content is a future enhancement.',
      instructions: `LinkedIn Integration Status:

✅ WORKING NOW:
• LinkedIn job listings via JSearch API (requires RAPIDAPI_KEY)
• No LinkedIn OAuth needed for job search

🔮 FUTURE ENHANCEMENT (not yet implemented):
• Direct LinkedIn API for posts/articles
• LinkedIn Learning course metadata
• Requires approved LinkedIn Developer App (complex approval process)`,
      features: [
        '✅ LinkedIn job search (via JSearch API - WORKING)',
        '🔮 LinkedIn Learning courses (future enhancement)',
        '🔮 LinkedIn posts/articles search (future enhancement)',
        '🔮 Industry insights from network (future enhancement)'
      ]
    };
  }
}

export default new LearningService();

