/**
 * Email Agent
 * 
 * Processes Gmail inbox, classifies emails using AI, and takes actions
 * like archiving, notifying, or organizing invoices.
 * 
 * This agent wraps the existing email services and provides a unified interface.
 */

import { AbstractAgent } from './AbstractAgent';
import { AgentMetadata, AgentResult, AgentParams } from './types';
import { getManifest } from './manifests';
import { getPrisma } from '../services/core/databaseService';

interface EmailParams extends AgentParams {
  action: 'process' | 'get-stats';
  maxEmails?: number;
}

interface EmailResult {
  processed?: number;
  stats?: any;
}

export class EmailAgent extends AbstractAgent {
  readonly metadata: AgentMetadata = getManifest('email');

  protected async run(params: EmailParams): Promise<AgentResult<EmailResult>> {
    const { action } = params;

    switch (action) {
      case 'process':
        // Email processing is handled through the existing controller
        // This agent provides status tracking and lifecycle management
        this.emitLog('📧 Email processing is handled through the dedicated endpoint', 'info');
        return { success: true, data: {} };
      case 'get-stats':
        return this.getStats(params);
      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  }

  /**
   * Get email processing stats
   */
  private async getStats(params: EmailParams): Promise<AgentResult<EmailResult>> {
    const { userId } = params;

    const prisma = getPrisma();
    if (!prisma || !userId) {
      return { success: true, data: { stats: null } };
    }

    try {
      const stats = await prisma.emailStats.findUnique({
        where: { userId }
      });

      return {
        success: true,
        data: { stats }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const emailAgent = new EmailAgent();
export default emailAgent;
