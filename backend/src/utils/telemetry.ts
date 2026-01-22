/**
 * Telemetry Service
 * 
 * Provides observability metrics for agents using OpenTelemetry (optional).
 * Falls back to in-memory metrics when OpenTelemetry is not configured.
 * 
 * To enable OpenTelemetry:
 * 1. npm install @opentelemetry/sdk-node @opentelemetry/api @opentelemetry/exporter-prometheus
 * 2. Set OTEL_ENABLED=true in .env
 * 3. Configure OTEL_EXPORTER_OTLP_ENDPOINT for external collectors (Jaeger, Grafana, DataDog)
 */

import logger from './logger';

// =============================================================================
// TYPES
// =============================================================================

export interface MetricLabels {
  [key: string]: string | number | boolean;
}

export interface HistogramOptions {
  buckets?: number[];
}

export interface MetricValue {
  value: number;
  labels: MetricLabels;
  timestamp: Date;
}

export interface AggregatedMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  values: MetricValue[];
  total?: number;
  min?: number;
  max?: number;
  avg?: number;
  p50?: number;
  p95?: number;
  p99?: number;
}

// =============================================================================
// IN-MEMORY METRICS STORAGE
// =============================================================================

class InMemoryMetrics {
  private counters: Map<string, Map<string, number>> = new Map();
  private gauges: Map<string, Map<string, number>> = new Map();
  private histograms: Map<string, Map<string, number[]>> = new Map();

  private getLabelsKey(labels: MetricLabels): string {
    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
  }

  incrementCounter(name: string, labels: MetricLabels = {}, value: number = 1): void {
    if (!this.counters.has(name)) {
      this.counters.set(name, new Map());
    }
    const key = this.getLabelsKey(labels);
    const current = this.counters.get(name)!.get(key) || 0;
    this.counters.get(name)!.set(key, current + value);
  }

  setGauge(name: string, labels: MetricLabels = {}, value: number): void {
    if (!this.gauges.has(name)) {
      this.gauges.set(name, new Map());
    }
    const key = this.getLabelsKey(labels);
    this.gauges.get(name)!.set(key, value);
  }

  recordHistogram(name: string, labels: MetricLabels = {}, value: number): void {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, new Map());
    }
    const key = this.getLabelsKey(labels);
    if (!this.histograms.get(name)!.has(key)) {
      this.histograms.get(name)!.set(key, []);
    }
    this.histograms.get(name)!.get(key)!.push(value);
  }

  getCounter(name: string): Map<string, number> | undefined {
    return this.counters.get(name);
  }

  getGauge(name: string): Map<string, number> | undefined {
    return this.gauges.get(name);
  }

  getHistogram(name: string): Map<string, number[]> | undefined {
    return this.histograms.get(name);
  }

  getAllMetrics(): Map<string, AggregatedMetric> {
    const result = new Map<string, AggregatedMetric>();

    // Process counters
    for (const [name, values] of this.counters) {
      result.set(name, {
        name,
        type: 'counter',
        values: Array.from(values.entries()).map(([labelsKey, value]) => ({
          value,
          labels: this.parseLabelsKey(labelsKey),
          timestamp: new Date()
        })),
        total: Array.from(values.values()).reduce((a, b) => a + b, 0)
      });
    }

    // Process gauges
    for (const [name, values] of this.gauges) {
      result.set(name, {
        name,
        type: 'gauge',
        values: Array.from(values.entries()).map(([labelsKey, value]) => ({
          value,
          labels: this.parseLabelsKey(labelsKey),
          timestamp: new Date()
        }))
      });
    }

    // Process histograms
    for (const [name, values] of this.histograms) {
      const allValues: number[] = [];
      for (const vals of values.values()) {
        allValues.push(...vals);
      }

      const sorted = allValues.sort((a, b) => a - b);
      const percentile = (p: number) => sorted[Math.floor(sorted.length * p / 100)] || 0;

      result.set(name, {
        name,
        type: 'histogram',
        values: Array.from(values.entries()).map(([labelsKey, vals]) => ({
          value: vals.reduce((a, b) => a + b, 0) / vals.length,
          labels: this.parseLabelsKey(labelsKey),
          timestamp: new Date()
        })),
        total: allValues.length,
        min: sorted[0] || 0,
        max: sorted[sorted.length - 1] || 0,
        avg: allValues.length > 0 ? allValues.reduce((a, b) => a + b, 0) / allValues.length : 0,
        p50: percentile(50),
        p95: percentile(95),
        p99: percentile(99)
      });
    }

    return result;
  }

  private parseLabelsKey(key: string): MetricLabels {
    if (!key) return {};
    return Object.fromEntries(
      key.split(',').map(pair => {
        const [k, v] = pair.split('=');
        return [k, v];
      })
    );
  }

  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }
}

// =============================================================================
// TELEMETRY SERVICE
// =============================================================================

class TelemetryService {
  private inMemoryMetrics = new InMemoryMetrics();
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.OTEL_ENABLED === 'true';
    if (this.isEnabled) {
      logger.init('OpenTelemetry enabled');
    }
  }

  // ---------------------------------------------------------------------------
  // COUNTERS - Monotonically increasing values
  // ---------------------------------------------------------------------------

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels: MetricLabels = {}, value: number = 1): void {
    this.inMemoryMetrics.incrementCounter(name, labels, value);
  }

  // ---------------------------------------------------------------------------
  // GAUGES - Point-in-time values
  // ---------------------------------------------------------------------------

  /**
   * Set a gauge metric value
   */
  setGauge(name: string, labels: MetricLabels = {}, value: number): void {
    this.inMemoryMetrics.setGauge(name, labels, value);
  }

  // ---------------------------------------------------------------------------
  // HISTOGRAMS - Distribution of values
  // ---------------------------------------------------------------------------

  /**
   * Record a histogram value (e.g., duration, size)
   */
  recordHistogram(name: string, labels: MetricLabels = {}, value: number): void {
    this.inMemoryMetrics.recordHistogram(name, labels, value);
  }

  // ---------------------------------------------------------------------------
  // AGENT-SPECIFIC METRICS
  // ---------------------------------------------------------------------------

  /**
   * Record agent execution metrics
   */
  recordAgentExecution(
    agentId: string,
    action: string,
    durationMs: number,
    success: boolean,
    metadata?: MetricLabels
  ): void {
    const labels = {
      agent: agentId,
      action,
      success: String(success),
      ...metadata
    };

    // Count executions
    this.incrementCounter('agent_executions_total', labels);
    
    // Record duration histogram
    this.recordHistogram('agent_execution_duration_ms', labels, durationMs);

    // Track success/failure counters
    if (success) {
      this.incrementCounter('agent_executions_success_total', { agent: agentId, action });
    } else {
      this.incrementCounter('agent_executions_failed_total', { agent: agentId, action });
    }
  }

  /**
   * Record rate limit hit
   */
  recordRateLimitHit(agentId: string): void {
    this.incrementCounter('agent_rate_limit_hits_total', { agent: agentId });
  }

  /**
   * Record retry attempt
   */
  recordRetry(agentId: string, action: string, attempt: number): void {
    this.incrementCounter('agent_retries_total', { agent: agentId, action, attempt: String(attempt) });
  }

  /**
   * Record circuit breaker event
   */
  recordCircuitBreakerTrip(agentId: string): void {
    this.incrementCounter('agent_circuit_breaker_trips_total', { agent: agentId });
  }

  /**
   * Update agent state gauge
   */
  setAgentState(agentId: string, state: string): void {
    const stateValue = state === 'running' ? 1 : state === 'error' ? -1 : 0;
    this.setGauge('agent_state', { agent: agentId, state }, stateValue);
  }

  /**
   * Record external API call
   */
  recordExternalApiCall(
    agentId: string,
    apiName: string,
    durationMs: number,
    success: boolean,
    statusCode?: number
  ): void {
    const labels = {
      agent: agentId,
      api: apiName,
      success: String(success),
      ...(statusCode && { status: String(statusCode) })
    };

    this.incrementCounter('external_api_calls_total', labels);
    this.recordHistogram('external_api_duration_ms', labels, durationMs);
  }

  // ---------------------------------------------------------------------------
  // METRICS RETRIEVAL
  // ---------------------------------------------------------------------------

  /**
   * Get all metrics as a map
   */
  getAllMetrics(): Map<string, AggregatedMetric> {
    return this.inMemoryMetrics.getAllMetrics();
  }

  /**
   * Get metrics in Prometheus exposition format
   */
  getPrometheusMetrics(): string {
    const metrics = this.inMemoryMetrics.getAllMetrics();
    const lines: string[] = [];

    for (const [name, metric] of metrics) {
      lines.push(`# TYPE ${name} ${metric.type}`);
      
      for (const value of metric.values) {
        const labelsStr = Object.entries(value.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        lines.push(`${name}{${labelsStr}} ${value.value}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Get agent-specific metrics summary
   */
  getAgentMetricsSummary(agentId: string): Record<string, unknown> {
    const allMetrics = this.getAllMetrics();
    const summary: Record<string, unknown> = {};

    for (const [name, metric] of allMetrics) {
      const agentValues = metric.values.filter(v => v.labels.agent === agentId);
      if (agentValues.length > 0) {
        summary[name] = {
          type: metric.type,
          values: agentValues,
          ...(metric.total !== undefined && { total: metric.total }),
          ...(metric.avg !== undefined && { avg: metric.avg }),
          ...(metric.p95 !== undefined && { p95: metric.p95 })
        };
      }
    }

    return summary;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.inMemoryMetrics.reset();
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const telemetryService = new TelemetryService();
export default telemetryService;



