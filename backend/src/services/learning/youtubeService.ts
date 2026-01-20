/**
 * YouTube Data API Service
 * 
 * Provides video search for tutorials and learning content.
 * 
 * API: https://developers.google.com/youtube/v3
 * Free tier: 10,000 units/day (search costs 100 units)
 */

import axios, { AxiosInstance } from 'axios';
import { cacheService } from '../core/cacheService';
import { configService } from '../core/configService';
import logger from '../../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelId: string;
  channelTitle: string;
  publishedAt: Date;
  duration?: string;
  viewCount?: number;
  likeCount?: number;
  url: string;
  embedUrl: string;
  tags?: string[];
}

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount?: number;
  videoCount?: number;
  url: string;
}

export interface YouTubeSearchParams {
  query: string;
  maxResults?: number;
  type?: 'video' | 'channel' | 'playlist';
  order?: 'date' | 'rating' | 'relevance' | 'viewCount';
  videoDuration?: 'short' | 'medium' | 'long';
  videoDefinition?: 'high' | 'standard';
  publishedAfter?: Date;
  channelId?: string;
}

// =============================================================================
// YOUTUBE SERVICE
// =============================================================================

class YouTubeService {
  private client: AxiosInstance | null = null;
  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    // YouTube API uses the same key as Google CSE
    const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_CSE_API_KEY;
    if (apiKey) {
      this.client = axios.create({
        baseURL: this.baseUrl,
        params: { key: apiKey },
        timeout: configService.get('learning.youtube.timeoutMs', 10000)
      });
      logger.init('YouTube API client initialized');
    }
  }

  /**
   * Check if YouTube API is available
   */
  isAvailable(): boolean {
    return !!this.client;
  }

  /**
   * Search for videos
   */
  async searchVideos(params: YouTubeSearchParams): Promise<YouTubeVideo[]> {
    if (!this.client) {
      logger.warn('YouTube API not available - YOUTUBE_API_KEY or GOOGLE_CSE_API_KEY not configured');
      return [];
    }

    const cacheKey = `youtube:search:${JSON.stringify(params)}`;
    const cached = await cacheService.get<YouTubeVideo[]>(cacheKey);
    if (cached) {
      logger.cache('YouTube search cache hit');
      return cached;
    }

    try {
      // First, search for video IDs
      const searchResponse = await this.client.get('/search', {
        params: {
          part: 'snippet',
          q: params.query,
          type: params.type || 'video',
          maxResults: params.maxResults || 10,
          order: params.order || 'relevance',
          videoDuration: params.videoDuration,
          videoDefinition: params.videoDefinition,
          publishedAfter: params.publishedAfter?.toISOString(),
          channelId: params.channelId,
          relevanceLanguage: 'en',
          safeSearch: 'moderate'
        }
      });

      const items = searchResponse.data.items || [];
      
      if (items.length === 0) {
        return [];
      }

      // Get video IDs for detailed info
      const videoIds = items
        .filter((item: any) => item.id?.videoId)
        .map((item: any) => item.id.videoId);

      if (videoIds.length === 0) {
        // For channels/playlists, just return basic info
        return items.map((item: any) => this.mapSearchResult(item));
      }

      // Get detailed video statistics
      const videosResponse = await this.client.get('/videos', {
        params: {
          part: 'snippet,statistics,contentDetails',
          id: videoIds.join(',')
        }
      });

      const videos: YouTubeVideo[] = (videosResponse.data.items || []).map((item: any) => 
        this.mapVideoResult(item)
      );

      // Cache for 1 hour
      await cacheService.set(cacheKey, videos, { ttl: 3600 });

      logger.success('YouTube search completed', { count: videos.length });
      return videos;
    } catch (error: any) {
      if (error.response?.status === 403) {
        logger.warn('YouTube API quota exceeded or access denied');
      } else {
        logger.fail('YouTube search failed', { error: error.message });
      }
      return [];
    }
  }

  /**
   * Search for programming tutorials
   */
  async searchTutorials(
    topic: string, 
    language?: string,
    options?: Partial<YouTubeSearchParams>
  ): Promise<YouTubeVideo[]> {
    // Optimize query for programming tutorials
    let query = topic;
    if (language) {
      query = `${topic} ${language} tutorial`;
    } else {
      query = `${topic} programming tutorial`;
    }

    return this.searchVideos({
      query,
      maxResults: options?.maxResults || 10,
      order: options?.order || 'relevance',
      videoDuration: options?.videoDuration || 'medium', // 4-20 minutes
      type: 'video',
      ...options
    });
  }

  /**
   * Get video details by ID
   */
  async getVideo(videoId: string): Promise<YouTubeVideo | null> {
    if (!this.client) return null;

    const cacheKey = `youtube:video:${videoId}`;
    const cached = await cacheService.get<YouTubeVideo>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get('/videos', {
        params: {
          part: 'snippet,statistics,contentDetails',
          id: videoId
        }
      });

      const items = response.data.items || [];
      if (items.length === 0) return null;

      const video = this.mapVideoResult(items[0]);
      await cacheService.set(cacheKey, video, { ttl: 86400 });

      return video;
    } catch (error: any) {
      logger.fail('Failed to get video', { videoId, error: error.message });
      return null;
    }
  }

  /**
   * Get channel info
   */
  async getChannel(channelId: string): Promise<YouTubeChannel | null> {
    if (!this.client) return null;

    const cacheKey = `youtube:channel:${channelId}`;
    const cached = await cacheService.get<YouTubeChannel>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get('/channels', {
        params: {
          part: 'snippet,statistics',
          id: channelId
        }
      });

      const items = response.data.items || [];
      if (items.length === 0) return null;

      const item = items[0];
      const channel: YouTubeChannel = {
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        subscriberCount: parseInt(item.statistics?.subscriberCount || '0'),
        videoCount: parseInt(item.statistics?.videoCount || '0'),
        url: `https://www.youtube.com/channel/${item.id}`
      };

      await cacheService.set(cacheKey, channel, { ttl: 86400 });
      return channel;
    } catch (error: any) {
      logger.fail('Failed to get channel', { channelId, error: error.message });
      return null;
    }
  }

  /**
   * Get popular tech channels for learning
   */
  getRecommendedTechChannels(): { name: string; id: string; focus: string }[] {
    return [
      { name: 'Traversy Media', id: 'UC29ju8bIPH5as8OGnQzwJyA', focus: 'Web Development' },
      { name: 'Fireship', id: 'UCsBjURrPoezykLs9EqgamOA', focus: 'Modern Web & Firebase' },
      { name: 'The Coding Train', id: 'UCvjgXvBlldQHFPArL9SHjQ', focus: 'Creative Coding' },
      { name: 'Academind', id: 'UCSJbGtTlrDami-tDGPUV9-w', focus: 'Full Stack' },
      { name: 'Web Dev Simplified', id: 'UCFbNIlppjAuEX4znoulh0Cw', focus: 'JavaScript & React' },
      { name: 'Tech With Tim', id: 'UC4JX40jDee_tINbkjycV4Sg', focus: 'Python & ML' },
      { name: 'Ben Awad', id: 'UC-8QAzbLcRglXeN_MY9blyw', focus: 'TypeScript & GraphQL' },
      { name: 'Hussein Nasser', id: 'UC_ML5xP23TOWKUcc-oAE_Eg', focus: 'Backend & System Design' },
      { name: 'ThePrimeagen', id: 'UC8ENHE5xdFSwx71u3fDH5Xw', focus: 'Performance & Vim' },
      { name: 'NetworkChuck', id: 'UC9x0AN7BWHpCDHSm9NiJFJQ', focus: 'DevOps & Networking' }
    ];
  }

  /**
   * Search videos from recommended channels
   */
  async searchFromRecommendedChannels(
    query: string, 
    maxResults: number = 10
  ): Promise<YouTubeVideo[]> {
    const channels = this.getRecommendedTechChannels();
    const allVideos: YouTubeVideo[] = [];

    // Search a few channels to avoid hitting rate limits
    const selectedChannels = channels.slice(0, 3);

    for (const channel of selectedChannels) {
      const videos = await this.searchVideos({
        query,
        channelId: channel.id,
        maxResults: Math.ceil(maxResults / 3),
        order: 'relevance'
      });
      allVideos.push(...videos);

      if (allVideos.length >= maxResults) break;
    }

    return allVideos.slice(0, maxResults);
  }

  /**
   * Map search result to YouTubeVideo
   */
  private mapSearchResult(item: any): YouTubeVideo {
    const videoId = item.id?.videoId || item.id;
    return {
      id: videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      publishedAt: new Date(item.snippet.publishedAt),
      url: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`
    };
  }

  /**
   * Map video result with statistics
   */
  private mapVideoResult(item: any): YouTubeVideo {
    const duration = item.contentDetails?.duration;
    return {
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      channelId: item.snippet.channelId,
      channelTitle: item.snippet.channelTitle,
      publishedAt: new Date(item.snippet.publishedAt),
      duration: this.formatDuration(duration),
      viewCount: parseInt(item.statistics?.viewCount || '0'),
      likeCount: parseInt(item.statistics?.likeCount || '0'),
      url: `https://www.youtube.com/watch?v=${item.id}`,
      embedUrl: `https://www.youtube.com/embed/${item.id}`,
      tags: item.snippet.tags
    };
  }

  /**
   * Format ISO 8601 duration to human readable
   */
  private formatDuration(isoDuration?: string): string | undefined {
    if (!isoDuration) return undefined;

    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return isoDuration;

    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    const seconds = match[3] ? parseInt(match[3]) : 0;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Export singleton
export const youtubeService = new YouTubeService();
export default youtubeService;



