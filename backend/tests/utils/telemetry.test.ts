/**
 * Telemetry Service Tests
 * 
 * Tests for the metrics collection and telemetry functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';

describe('TelemetryService', () => {
  beforeEach(async () => {
    // Reset telemetry before each test
    const { telemetryService } = await import('../../src/utils/telemetry');
    telemetryService.reset();
  });

  describe('Counters', () => {
    it('should increment counter', async () => {
      const { telemetryService } = await import('../../src/utils/telemetry');
      
      telemetryService.incrementCounter('test_counter', { agent: 'test' });
      telemetryService.incrementCounter('test_counter', { agent: 'test' });
      
      const metrics = telemetryService.getAllMetrics();
      const counter = metrics.get('test_counter');
      
      expect(counter).toBeDefined();
      expect(counter?.type).toBe('counter');
      expect(counter?.total).toBe(2);
    });

    it('should track different labels separately', async () => {
      const { telemetryService } = await import('../../src/utils/telemetry');
      
      telemetryService.incrementCounter('test_counter', { agent: 'agent1' });
      telemetryService.incrementCounter('test_counter', { agent: 'agent2' });
      telemetryService.incrementCounter('test_counter', { agent: 'agent1' });
      
      const metrics = telemetryService.getAllMetrics();
      const counter = metrics.get('test_counter');
      
      expect(counter?.values.length).toBe(2);
      expect(counter?.total).toBe(3);
    });
  });

  describe('Gauges', () => {
    it('should set gauge value', async () => {
      const { telemetryService } = await import('../../src/utils/telemetry');
      
      telemetryService.setGauge('test_gauge', { agent: 'test' }, 42);
      
      const metrics = telemetryService.getAllMetrics();
      const gauge = metrics.get('test_gauge');
      
      expect(gauge).toBeDefined();
      expect(gauge?.type).toBe('gauge');
      expect(gauge?.values[0].value).toBe(42);
    });

    it('should overwrite gauge value', async () => {
      const { telemetryService } = await import('../../src/utils/telemetry');
      
      telemetryService.setGauge('test_gauge', { agent: 'test' }, 10);
      telemetryService.setGauge('test_gauge', { agent: 'test' }, 20);
      
      const metrics = telemetryService.getAllMetrics();
      const gauge = metrics.get('test_gauge');
      
      expect(gauge?.values[0].value).toBe(20);
    });
  });

  describe('Histograms', () => {
    it('should record histogram values', async () => {
      const { telemetryService } = await import('../../src/utils/telemetry');
      
      telemetryService.recordHistogram('test_histogram', { agent: 'test' }, 100);
      telemetryService.recordHistogram('test_histogram', { agent: 'test' }, 200);
      telemetryService.recordHistogram('test_histogram', { agent: 'test' }, 300);
      
      const metrics = telemetryService.getAllMetrics();
      const histogram = metrics.get('test_histogram');
      
      expect(histogram).toBeDefined();
      expect(histogram?.type).toBe('histogram');
      expect(histogram?.total).toBe(3);
      expect(histogram?.avg).toBe(200);
      expect(histogram?.min).toBe(100);
      expect(histogram?.max).toBe(300);
    });
  });

  describe('Agent-Specific Metrics', () => {
    it('should record agent execution', async () => {
      const { telemetryService } = await import('../../src/utils/telemetry');
      
      telemetryService.recordAgentExecution('test-agent', 'search', 150, true);
      
      const metrics = telemetryService.getAllMetrics();
      
      expect(metrics.has('agent_executions_total')).toBe(true);
      expect(metrics.has('agent_execution_duration_ms')).toBe(true);
      expect(metrics.has('agent_executions_success_total')).toBe(true);
    });

    it('should record failed agent execution', async () => {
      const { telemetryService } = await import('../../src/utils/telemetry');
      
      telemetryService.recordAgentExecution('test-agent', 'search', 150, false);
      
      const metrics = telemetryService.getAllMetrics();
      
      expect(metrics.has('agent_executions_failed_total')).toBe(true);
    });

    it('should record rate limit hit', async () => {
      const { telemetryService } = await import('../../src/utils/telemetry');
      
      telemetryService.recordRateLimitHit('test-agent');
      
      const metrics = telemetryService.getAllMetrics();
      
      expect(metrics.has('agent_rate_limit_hits_total')).toBe(true);
    });

    it('should record retry attempt', async () => {
      const { telemetryService } = await import('../../src/utils/telemetry');
      
      telemetryService.recordRetry('test-agent', 'search', 1);
      
      const metrics = telemetryService.getAllMetrics();
      
      expect(metrics.has('agent_retries_total')).toBe(true);
    });

    it('should record circuit breaker trip', async () => {
      const { telemetryService } = await import('../../src/utils/telemetry');
      
      telemetryService.recordCircuitBreakerTrip('test-agent');
      
      const metrics = telemetryService.getAllMetrics();
      
      expect(metrics.has('agent_circuit_breaker_trips_total')).toBe(true);
    });

    it('should set agent state', async () => {
      const { telemetryService } = await import('../../src/utils/telemetry');
      
      telemetryService.setAgentState('test-agent', 'running');
      
      const metrics = telemetryService.getAllMetrics();
      
      expect(metrics.has('agent_state')).toBe(true);
    });

    it('should record external API call', async () => {
      const { telemetryService } = await import('../../src/utils/telemetry');
      
      telemetryService.recordExternalApiCall('test-agent', 'github', 200, true, 200);
      
      const metrics = telemetryService.getAllMetrics();
      
      expect(metrics.has('external_api_calls_total')).toBe(true);
      expect(metrics.has('external_api_duration_ms')).toBe(true);
    });
  });

  describe('Prometheus Format', () => {
    it('should return prometheus format', async () => {
      const { telemetryService } = await import('../../src/utils/telemetry');
      
      telemetryService.incrementCounter('test_counter', { agent: 'test' });
      
      const prometheus = telemetryService.getPrometheusMetrics();
      
      expect(typeof prometheus).toBe('string');
      expect(prometheus).toContain('# TYPE test_counter counter');
      expect(prometheus).toContain('test_counter{agent="test"}');
    });
  });

  describe('Agent Metrics Summary', () => {
    it('should return agent-specific metrics summary', async () => {
      const { telemetryService } = await import('../../src/utils/telemetry');
      
      telemetryService.recordAgentExecution('test-agent', 'search', 150, true);
      telemetryService.recordAgentExecution('other-agent', 'fetch', 100, true);
      
      const summary = telemetryService.getAgentMetricsSummary('test-agent');
      
      expect(Object.keys(summary).length).toBeGreaterThan(0);
    });
  });

  describe('Reset', () => {
    it('should reset all metrics', async () => {
      const { telemetryService } = await import('../../src/utils/telemetry');
      
      telemetryService.incrementCounter('test_counter', {});
      telemetryService.reset();
      
      const metrics = telemetryService.getAllMetrics();
      
      expect(metrics.size).toBe(0);
    });
  });
});



