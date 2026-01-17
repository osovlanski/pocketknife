/**
 * System Design Evaluation Service
 * 
 * Evaluates system design diagrams using Claude Vision and structured analysis.
 * Provides detailed feedback on architecture choices, scalability, and best practices.
 */

import claudeService from '../core/claudeService';
import { configService } from '../core/configService';
import logger from '../../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface SystemDesignQuestion {
  title: string;
  description: string;
  requirements: string[];
  constraints?: string[];
}

export interface DiagramElements {
  components: string[];
  connections: { from: string; to: string }[];
  labels: string[];
}

export interface SystemDesignEvaluation {
  score: number;           // 0-100
  strengths: string[];
  improvements: string[];
  missingComponents: string[];
  scalabilityScore: number;
  reliabilityScore: number;
  costEfficiencyScore: number;
  feedback: string;
  detailedAnalysis: {
    dataFlow: string;
    bottlenecks: string[];
    singlePointsOfFailure: string[];
    recommendations: string[];
  };
}

export interface EvaluationRequest {
  imageBase64: string;
  jsonData: string;
  textAnnotations: string[];
  question: SystemDesignQuestion;
  elapsedTime?: number;
}

// =============================================================================
// SERVICE
// =============================================================================

class SystemDesignEvaluationService {
  /**
   * Evaluate a system design diagram using Claude Vision
   */
  async evaluate(request: EvaluationRequest): Promise<SystemDesignEvaluation> {
    logger.start('Evaluating system design diagram');

    try {
      // 1. Parse JSON to understand structure
      const structuredAnalysis = this.parseElementsJSON(request.jsonData);
      
      // 2. Build evaluation prompt
      const prompt = this.buildEvaluationPrompt(
        request.question,
        structuredAnalysis,
        request.textAnnotations
      );

      // 3. Use Claude Vision for visual analysis
      let response: string;
      
      if (request.imageBase64) {
        // Use vision capabilities if image is provided
        response = await claudeService.analyzeImage(request.imageBase64, prompt);
      } else {
        // Fallback to text-only analysis
        const maxTokens = configService.get('mockInterview.ai.systemDesignMaxTokens', 2000);
        response = await claudeService.generateText(prompt, maxTokens);
      }

      // 4. Parse response
      const evaluation = this.parseEvaluationResponse(response);
      
      logger.success('System design evaluation completed', { score: evaluation.score });
      
      return evaluation;
    } catch (error: any) {
      logger.fail('System design evaluation failed', { error: error.message });
      
      return {
        score: 0,
        strengths: [],
        improvements: ['Evaluation failed: ' + error.message],
        missingComponents: [],
        scalabilityScore: 0,
        reliabilityScore: 0,
        costEfficiencyScore: 0,
        feedback: 'Unable to evaluate the design. Please try again.',
        detailedAnalysis: {
          dataFlow: '',
          bottlenecks: [],
          singlePointsOfFailure: [],
          recommendations: []
        }
      };
    }
  }

  /**
   * Parse elements JSON to extract components and connections
   */
  private parseElementsJSON(jsonData: string): DiagramElements {
    try {
      const data = JSON.parse(jsonData);
      const elements = data.elements || [];

      const components: string[] = [];
      const labels: string[] = [];
      const connections: { from: string; to: string }[] = [];

      elements.forEach((el: any) => {
        if (el.type === 'rect') {
          const label = el.text || 'Unknown Component';
          components.push(label);
          labels.push(label);
        }
        if (el.type === 'text' && el.text) {
          labels.push(el.text);
        }
        if (el.type === 'arrow') {
          connections.push({
            from: 'Component',
            to: 'Component'
          });
        }
      });

      return { components, connections, labels };
    } catch {
      return { components: [], connections: [], labels: [] };
    }
  }

  /**
   * Build the evaluation prompt for Claude
   */
  private buildEvaluationPrompt(
    question: SystemDesignQuestion,
    elements: DiagramElements,
    textAnnotations: string[]
  ): string {
    return `You are a senior system design interviewer at a top tech company (Google, Amazon, Meta level).
Evaluate this system design diagram for the following question.

## Question
${question.title}

${question.description}

## Requirements
${question.requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

${question.constraints ? `## Constraints
${question.constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}` : ''}

## Detected Components (from diagram)
${elements.components.length > 0 ? elements.components.join(', ') : 'Unable to detect components'}

## Text Labels
${textAnnotations.length > 0 ? textAnnotations.join(', ') : elements.labels.join(', ') || 'No labels detected'}

## Connections
${elements.connections.length} connections detected

## Evaluation Instructions

Analyze the system design and provide a comprehensive evaluation. Consider:

1. **Completeness**: Does the design address all requirements?
2. **Scalability**: Can the system handle increased load? Is it horizontally scalable?
3. **Reliability**: Are there single points of failure? Is there redundancy?
4. **Data Consistency**: How is data consistency maintained?
5. **Performance**: Are there appropriate caching layers? Load balancing?
6. **Cost Efficiency**: Is the architecture cost-effective?
7. **Security**: Are there proper security considerations?

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "score": <0-100>,
  "strengths": ["strength1", "strength2", ...],
  "improvements": ["improvement1", "improvement2", ...],
  "missingComponents": ["component1", "component2", ...],
  "scalabilityScore": <0-100>,
  "reliabilityScore": <0-100>,
  "costEfficiencyScore": <0-100>,
  "feedback": "Overall feedback as a string...",
  "detailedAnalysis": {
    "dataFlow": "Description of how data flows through the system...",
    "bottlenecks": ["potential bottleneck 1", "potential bottleneck 2"],
    "singlePointsOfFailure": ["SPOF 1", "SPOF 2"],
    "recommendations": ["recommendation 1", "recommendation 2"]
  }
}`;
  }

  /**
   * Parse the Claude response into structured evaluation
   */
  private parseEvaluationResponse(response: string): SystemDesignEvaluation {
    try {
      // Try to extract JSON from the response
      let jsonStr = response;
      
      // Remove markdown code blocks if present
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      
      // Clean up the string
      jsonStr = jsonStr.trim();
      
      const parsed = JSON.parse(jsonStr);
      
      return {
        score: parsed.score || 0,
        strengths: parsed.strengths || [],
        improvements: parsed.improvements || [],
        missingComponents: parsed.missingComponents || [],
        scalabilityScore: parsed.scalabilityScore || 0,
        reliabilityScore: parsed.reliabilityScore || 0,
        costEfficiencyScore: parsed.costEfficiencyScore || 0,
        feedback: parsed.feedback || '',
        detailedAnalysis: {
          dataFlow: parsed.detailedAnalysis?.dataFlow || '',
          bottlenecks: parsed.detailedAnalysis?.bottlenecks || [],
          singlePointsOfFailure: parsed.detailedAnalysis?.singlePointsOfFailure || [],
          recommendations: parsed.detailedAnalysis?.recommendations || []
        }
      };
    } catch {
      // If JSON parsing fails, extract what we can from the text
      return {
        score: 50,
        strengths: [],
        improvements: ['Could not parse detailed evaluation'],
        missingComponents: [],
        scalabilityScore: 50,
        reliabilityScore: 50,
        costEfficiencyScore: 50,
        feedback: response.slice(0, 500),
        detailedAnalysis: {
          dataFlow: '',
          bottlenecks: [],
          singlePointsOfFailure: [],
          recommendations: []
        }
      };
    }
  }

  /**
   * Generate example system design questions
   */
  getExampleQuestions(): SystemDesignQuestion[] {
    return [
      {
        title: 'Design a URL Shortening Service (like bit.ly)',
        description: 'Design a service that takes long URLs and creates short, unique aliases that redirect to the original URL.',
        requirements: [
          'Generate short unique URLs from long URLs',
          'Redirect short URLs to original URLs',
          'Handle 100M new URLs per month',
          'URLs should expire after configurable time',
          'Analytics: track click counts'
        ],
        constraints: [
          'Low latency for redirects (< 100ms)',
          'High availability (99.99% uptime)',
          'Short URLs should be 7-8 characters max'
        ]
      },
      {
        title: 'Design a Social Media News Feed',
        description: 'Design a news feed system like Facebook/Twitter that shows posts from followed users in real-time.',
        requirements: [
          'Users can post text, images, and videos',
          'Users can follow other users',
          'News feed shows posts from followed users',
          'Posts should appear in near real-time',
          'Support for likes, comments, and shares'
        ],
        constraints: [
          'Handle 500M daily active users',
          'Feed should load in < 2 seconds',
          'Support for celebrity accounts (millions of followers)'
        ]
      },
      {
        title: 'Design a Ride-Sharing Service (like Uber)',
        description: 'Design a ride-sharing platform that matches riders with drivers in real-time.',
        requirements: [
          'Riders can request rides from current location',
          'Match riders with nearby available drivers',
          'Real-time location tracking',
          'Estimated time of arrival (ETA)',
          'Payment processing',
          'Rating system for drivers and riders'
        ],
        constraints: [
          'Handle 1M concurrent rides',
          'Match should happen in < 30 seconds',
          'Location updates every 5 seconds'
        ]
      },
      {
        title: 'Design a Video Streaming Service (like Netflix)',
        description: 'Design a video streaming platform that delivers on-demand video content to millions of users.',
        requirements: [
          'Stream video content to users',
          'Support multiple video qualities (480p to 4K)',
          'Adaptive bitrate streaming',
          'Content recommendation system',
          'User profiles and watch history',
          'Offline downloads'
        ],
        constraints: [
          'Handle 200M subscribers',
          'Content library of 50,000+ titles',
          'Startup time < 5 seconds',
          'Buffer-free playback'
        ]
      },
      {
        title: 'Design a Distributed Cache System (like Redis)',
        description: 'Design a distributed in-memory caching system that provides fast data access.',
        requirements: [
          'Key-value storage with low latency',
          'Support for data expiration (TTL)',
          'Distributed across multiple nodes',
          'Data replication for reliability',
          'Support for various data types'
        ],
        constraints: [
          'Read latency < 1ms',
          'Write latency < 5ms',
          'Handle 1M operations per second',
          'No single point of failure'
        ]
      }
    ];
  }
}

export const systemDesignEvaluationService = new SystemDesignEvaluationService();
export default systemDesignEvaluationService;

