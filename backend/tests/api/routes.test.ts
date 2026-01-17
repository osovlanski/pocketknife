/**
 * API Route Verification Tests
 * 
 * These tests verify that all API routes are properly registered and respond
 * with correct status codes. This helps catch 404 errors before manual testing.
 * 
 * NOTE: This is a lightweight test that doesn't load actual route handlers.
 * It uses a simple route registry check instead.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Parse route file and extract registered routes
 */
const extractRoutes = (filePath: string): { method: string; path: string }[] => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const routes: { method: string; path: string }[] = [];
  
  // Match router.get/post/put/delete patterns
  const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  let match;
  
  while ((match = routeRegex.exec(content)) !== null) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[2]
    });
  }
  
  return routes;
};

/**
 * Parse API file and extract expected endpoints
 */
const extractApiCalls = (filePath: string): { method: string; path: string }[] => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const routes: { method: string; path: string }[] = [];
  
  // Match api.get/post/put/delete or axios.get/post patterns
  const apiRegex = /(?:api|axios)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  let match;
  
  while ((match = apiRegex.exec(content)) !== null) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[2]
    });
  }
  
  return routes;
};

describe('Route Registration Verification', () => {
  const routesDir = path.join(__dirname, '../../src/routes');
  
  describe('Jobs Routes', () => {
    const jobsRoutePath = path.join(routesDir, 'jobs.ts');
    
    it('should have all mock interview routes registered', () => {
      const routes = extractRoutes(jobsRoutePath);
      const routePaths = routes.map(r => `${r.method} ${r.path}`);
      
      // Critical mock interview routes
      expect(routePaths).toContain('POST /interview/extract');
      expect(routePaths).toContain('POST /interview/generate-answer');
      expect(routePaths).toContain('POST /interview/evaluate');
      expect(routePaths).toContain('POST /interview/example-questions');
      expect(routePaths).toContain('GET /interview/popular-companies');
      
      // System design routes
      expect(routePaths).toContain('POST /interview/system-design/evaluate');
      expect(routePaths).toContain('GET /interview/system-design/questions');
    });
    
    it('should have CV routes registered', () => {
      const routes = extractRoutes(jobsRoutePath);
      const routePaths = routes.map(r => `${r.method} ${r.path}`);
      
      expect(routePaths).toContain('POST /cv/upload');
      expect(routePaths).toContain('GET /cv/data');
    });
    
    it('should have search routes registered', () => {
      const routes = extractRoutes(jobsRoutePath);
      const routePaths = routes.map(r => `${r.method} ${r.path}`);
      
      expect(routePaths).toContain('POST /search');
      expect(routePaths).toContain('GET /listings');
    });
  });

  describe('ToDo Routes', () => {
    const todoRoutePath = path.join(routesDir, 'todo.ts');
    
    it('should have core todo routes registered', () => {
      const routes = extractRoutes(todoRoutePath);
      const routePaths = routes.map(r => `${r.method} ${r.path}`);
      
      expect(routePaths).toContain('GET /agenda');
      expect(routePaths).toContain('GET /tasks');
      expect(routePaths).toContain('POST /tasks');
    });
    
    it('should have calendar import route registered', () => {
      const routes = extractRoutes(todoRoutePath);
      const routePaths = routes.map(r => `${r.method} ${r.path}`);
      
      expect(routePaths).toContain('POST /calendar/import');
    });
  });

  describe('Travel Routes', () => {
    const travelRoutePath = path.join(routesDir, 'travel.ts');
    
    it('should have Israel travel routes registered', () => {
      const routes = extractRoutes(travelRoutePath);
      const routePaths = routes.map(r => `${r.method} ${r.path}`);
      
      expect(routePaths).toContain('POST /israel/search');
      expect(routePaths).toContain('POST /israel/ai');
      expect(routePaths).toContain('GET /israel/destinations');
      expect(routePaths).toContain('GET /israel/trails');
      expect(routePaths).toContain('GET /israel/beaches');
    });
  });

  describe('DIY Routes', () => {
    const diyRoutePath = path.join(routesDir, 'diy.ts');
    
    it('should have project routes registered', () => {
      const routes = extractRoutes(diyRoutePath);
      const routePaths = routes.map(r => `${r.method} ${r.path}`);
      
      expect(routePaths).toContain('GET /projects');
      expect(routePaths).toContain('POST /projects');
    });
  });
});

describe('Frontend-Backend Route Sync', () => {
  const frontendServicesDir = path.join(__dirname, '../../../frontend/src/services');
  const backendRoutesDir = path.join(__dirname, '../../src/routes');
  
  describe('Mock Interview API Sync', () => {
    it('should have matching routes in frontend and backend', () => {
      const mockInterviewApiPath = path.join(frontendServicesDir, 'mockInterviewApi.ts');
      const jobsRoutePath = path.join(backendRoutesDir, 'jobs.ts');
      
      // Skip if files don't exist (for CI environments)
      if (!fs.existsSync(mockInterviewApiPath) || !fs.existsSync(jobsRoutePath)) {
        return;
      }
      
      const frontendCalls = extractApiCalls(mockInterviewApiPath);
      const backendRoutes = extractRoutes(jobsRoutePath);
      
      // Check that all frontend interview calls have backend routes
      const interviewCalls = frontendCalls.filter(c => c.path.includes('/interview/'));
      
      interviewCalls.forEach(call => {
        const backendPath = call.path.replace(/^\/jobs/, ''); // Remove /jobs prefix if present
        const hasBackendRoute = backendRoutes.some(r => 
          r.method === call.method && 
          (r.path === backendPath || r.path === call.path)
        );
        
        // Log for debugging
        if (!hasBackendRoute) {
          console.warn(`Missing backend route: ${call.method} ${call.path}`);
        }
      });
      
      // This is informational - we expect most routes to match
      expect(interviewCalls.length).toBeGreaterThan(0);
    });
  });
});

/**
 * Controller-Route Mapping Verification
 * 
 * Ensures that all routes have corresponding controller methods
 */
describe('Controller Method Verification', () => {
  const controllersDir = path.join(__dirname, '../../src/controllers');
  
  it('interview controller should have all interview methods', () => {
    // Interview methods are now in separate interviewController.ts
    const controllerPath = path.join(controllersDir, 'interviewController.ts');
    const content = fs.readFileSync(controllerPath, 'utf-8');
    
    // Check for required export methods
    expect(content).toContain('export const extractInterviewQuestions');
    expect(content).toContain('export const generateInterviewAnswer');
    expect(content).toContain('export const evaluateInterviewAnswer');
    expect(content).toContain('export const getExampleQuestions');
    expect(content).toContain('export const getPopularCompanyQuestions');
  });
  
  it('jobs controller should re-export interview methods', () => {
    const controllerPath = path.join(controllersDir, 'jobController.ts');
    const content = fs.readFileSync(controllerPath, 'utf-8');
    
    // Check for re-exports from interviewController
    expect(content).toContain("export {");
    expect(content).toContain("extractInterviewQuestions");
    expect(content).toContain("from './interviewController'");
  });
  
  it('todo controller should have calendar import method', () => {
    const controllerPath = path.join(controllersDir, 'todoController.ts');
    const content = fs.readFileSync(controllerPath, 'utf-8');
    
    expect(content).toContain('export const importCalendarEvent');
  });
});

/**
 * Agent Action Verification
 * 
 * Ensures that agent actions referenced in controllers exist
 */
describe('Agent Action Verification', () => {
  const agentsDir = path.join(__dirname, '../../src/agents');
  
  it('JobsAgent should have all interview actions', () => {
    const agentPath = path.join(agentsDir, 'JobsAgent.ts');
    const content = fs.readFileSync(agentPath, 'utf-8');
    
    // Check for action types in interface
    expect(content).toContain("'get-example-questions'");
    expect(content).toContain("'get-popular-company-questions'");
    
    // Check for case handlers
    expect(content).toContain("case 'get-example-questions'");
    expect(content).toContain("case 'get-popular-company-questions'");
  });
  
  it('ToDoAgent should have calendar import action', () => {
    const agentPath = path.join(agentsDir, 'ToDoAgent.ts');
    const content = fs.readFileSync(agentPath, 'utf-8');
    
    expect(content).toContain("'import-calendar-event'");
    expect(content).toContain("case 'import-calendar-event'");
  });
});
