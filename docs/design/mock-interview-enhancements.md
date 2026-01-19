# Mock Interview Enhancements - Design Document

## Overview

This document outlines the design for enhancing the Mock Interview feature with:
1. **Code Question Integration** - Monaco Editor with Problems Agent features
2. **System Design Whiteboard** - Excalidraw-based diagram tool with AI evaluation

---

## 1. Code Questions Integration

### Problem
- Current textbox is not suitable for coding questions
- Problems Agent already has a full-featured IDE
- Need to avoid code duplication

### Solution Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Shared Components Layer                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  CodeEditor     │  │  TestRunner     │  │  HintSystem     │ │
│  │  (Monaco-based) │  │  (Execute code) │  │  (AI hints)     │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │           │
│           └────────────────────┴────────────────────┘           │
│                              │                                   │
├──────────────────────────────┼──────────────────────────────────┤
│                              │                                   │
│  ┌───────────────────────────┴──────────────────────────────┐   │
│  │                    CodeEditorModal                        │   │
│  │  - Receives question context                              │   │
│  │  - Returns code + test results                            │   │
│  │  - Used by both Mock Interview and Problems Agent         │   │
│  └───────────────────────────────────────────────────────────┘   │
│                              │                                   │
├──────────────────────────────┼──────────────────────────────────┤
│                              │                                   │
│  ┌──────────────────┐   ┌────┴───────────────┐                  │
│  │  MockInterview   │   │  ProblemsAgent     │                  │
│  │  Panel           │   │  Panel             │                  │
│  │                  │   │                    │                  │
│  │  [Code Question] │   │  [Full IDE]        │                  │
│  │  Opens Modal ────┼───┤                    │                  │
│  └──────────────────┘   └────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Steps

#### Step 1: Create Shared Code Editor Component

```typescript
// frontend/src/components/shared/CodeEditorModal.tsx

interface CodeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: {
    title: string;
    description: string;
    starterCode?: string;
    language: 'javascript' | 'typescript' | 'python';
    testCases?: TestCase[];
  };
  onSubmit: (result: CodeSubmission) => void;
  mode: 'interview' | 'practice';  // Different UI for each context
}

interface CodeSubmission {
  code: string;
  language: string;
  testResults?: TestResult[];
  executionTime?: number;
}
```

#### Step 2: Extract Code Execution Logic

```typescript
// frontend/src/services/codeExecutionService.ts

export const codeExecutionService = {
  // Execute code in browser sandbox (for simple cases)
  executeInBrowser: async (code: string, language: string) => {...},
  
  // Execute via backend (for complex cases)
  executeOnServer: async (code: string, language: string, testCases: TestCase[]) => {...},
  
  // Validate solution
  validateSolution: async (code: string, problemId: string) => {...}
};
```

#### Step 3: Update Mock Interview to Use Shared Component

```typescript
// In MockInterviewPanel.tsx

const handleCodeQuestion = (question: InterviewQuestion) => {
  if (question.category === 'coding') {
    setCodeEditorOpen(true);
    setCurrentCodeQuestion({
      title: question.original,
      description: question.context || '',
      starterCode: generateStarterCode(question),
      language: 'javascript',
      testCases: [] // Could be AI-generated
    });
  }
};

// Render
{codeEditorOpen && (
  <CodeEditorModal
    isOpen={codeEditorOpen}
    onClose={() => setCodeEditorOpen(false)}
    question={currentCodeQuestion}
    onSubmit={handleCodeSubmission}
    mode="interview"
  />
)}
```

### Cross-Agent Communication Pattern

For cases where we need both agents to communicate:

```typescript
// Option 1: Event Bus (Simple)
// frontend/src/services/agentEventBus.ts

type AgentEvent = 
  | { type: 'CODE_QUESTION_STARTED'; payload: { questionId: string; context: string } }
  | { type: 'CODE_SUBMITTED'; payload: { code: string; result: any } }
  | { type: 'REQUEST_HINT'; payload: { questionId: string } };

class AgentEventBus {
  private listeners: Map<string, Function[]> = new Map();
  
  emit(event: AgentEvent) {
    const handlers = this.listeners.get(event.type) || [];
    handlers.forEach(handler => handler(event.payload));
  }
  
  on(eventType: string, handler: Function) {
    const handlers = this.listeners.get(eventType) || [];
    handlers.push(handler);
    this.listeners.set(eventType, handlers);
  }
}

export const agentEventBus = new AgentEventBus();
```

```typescript
// Option 2: Context Provider (React-native)
// frontend/src/contexts/InterAgentContext.tsx

interface InterAgentState {
  activeCodeQuestion: CodeQuestion | null;
  activeDiagram: DiagramState | null;
  sharedContext: Record<string, any>;
}

const InterAgentContext = createContext<InterAgentState>(null);

export const InterAgentProvider: React.FC = ({ children }) => {
  const [state, dispatch] = useReducer(interAgentReducer, initialState);
  
  return (
    <InterAgentContext.Provider value={{ state, dispatch }}>
      {children}
    </InterAgentContext.Provider>
  );
};
```

---

## 2. System Design Whiteboard

### Problem
- System design questions need visual diagrams
- Text descriptions are hard to evaluate
- Need to convert diagrams to AI-evaluatable format

### Solution: Excalidraw Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                    System Design Flow                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌───────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│   │ Mock Interview│───▶│ Excalidraw      │───▶│ Export       │ │
│   │ Question      │    │ Whiteboard      │    │ (PNG + JSON) │ │
│   └───────────────┘    └─────────────────┘    └──────┬───────┘ │
│                                                       │         │
│                                               ┌───────┴───────┐ │
│                                               │               │ │
│                                          ┌────▼────┐   ┌──────▼─┐
│                                          │ Claude  │   │ JSON   │
│                                          │ Vision  │   │ Parser │
│                                          │ (Image) │   │(Struct)│
│                                          └────┬────┘   └────┬───┘
│                                               │              │   │
│                                               └──────┬───────┘   │
│                                                      │           │
│                                               ┌──────▼───────┐   │
│                                               │ Combined     │   │
│                                               │ Evaluation   │   │
│                                               └──────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Steps

#### Step 1: Install Excalidraw

```bash
npm install @excalidraw/excalidraw
```

#### Step 2: Create System Design Whiteboard Component

```typescript
// frontend/src/components/shared/SystemDesignWhiteboard.tsx

import { Excalidraw, exportToBlob, serializeAsJSON } from '@excalidraw/excalidraw';

interface SystemDesignWhiteboardProps {
  isOpen: boolean;
  onClose: () => void;
  question: {
    title: string;
    requirements: string[];
    hints?: string[];
  };
  onSubmit: (result: DiagramSubmission) => void;
}

interface DiagramSubmission {
  imageBlob: Blob;           // For Claude Vision evaluation
  jsonData: string;          // For structured analysis
  elements: ExcalidrawElement[]; // Raw elements for parsing
  textAnnotations: string[]; // Extracted text labels
}

const SystemDesignWhiteboard: React.FC<SystemDesignWhiteboardProps> = ({
  isOpen, onClose, question, onSubmit
}) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);

  const handleSubmit = async () => {
    if (!excalidrawAPI) return;
    
    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();
    
    // Export as image for AI Vision
    const imageBlob = await exportToBlob({
      elements,
      appState,
      files: excalidrawAPI.getFiles(),
      mimeType: 'image/png',
      quality: 0.9,
    });
    
    // Export as JSON for structured analysis
    const jsonData = serializeAsJSON(elements, appState, excalidrawAPI.getFiles(), 'local');
    
    // Extract text annotations from elements
    const textAnnotations = elements
      .filter(el => el.type === 'text')
      .map(el => (el as any).text);
    
    onSubmit({
      imageBlob,
      jsonData,
      elements,
      textAnnotations
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="fullscreen">
      <div className="flex flex-col h-full">
        {/* Question Panel */}
        <div className="p-4 bg-slate-800 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">{question.title}</h2>
          <div className="mt-2 text-slate-300">
            <h3 className="font-semibold">Requirements:</h3>
            <ul className="list-disc ml-5">
              {question.requirements.map((req, i) => (
                <li key={i}>{req}</li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Excalidraw Canvas */}
        <div className="flex-1">
          <Excalidraw
            ref={(api) => setExcalidrawAPI(api)}
            theme="dark"
            initialData={{
              elements: getSystemDesignTemplateElements(), // Pre-made shapes
              appState: { viewBackgroundColor: '#1e1e1e' }
            }}
            UIOptions={{
              canvasActions: {
                loadScene: false,
                export: false,
              }
            }}
          />
        </div>
        
        {/* Toolbar */}
        <div className="p-4 bg-slate-800 border-t border-slate-700 flex justify-between">
          <div className="flex gap-2">
            <button onClick={() => addTemplate('database')}>
              🗄️ Database
            </button>
            <button onClick={() => addTemplate('server')}>
              🖥️ Server
            </button>
            <button onClick={() => addTemplate('loadBalancer')}>
              ⚖️ Load Balancer
            </button>
            <button onClick={() => addTemplate('cache')}>
              💨 Cache
            </button>
            <button onClick={() => addTemplate('queue')}>
              📬 Queue
            </button>
          </div>
          <button 
            onClick={handleSubmit}
            className="px-6 py-2 bg-green-600 text-white rounded-lg"
          >
            Submit Design
          </button>
        </div>
      </div>
    </Modal>
  );
};
```

#### Step 3: Backend Evaluation Service

```typescript
// backend/src/services/jobs/systemDesignEvaluationService.ts

import claudeService from '../core/claudeService';

interface DiagramEvaluation {
  score: number;           // 0-100
  strengths: string[];
  improvements: string[];
  missingComponents: string[];
  scalabilityNotes: string;
  feedback: string;
}

class SystemDesignEvaluationService {
  
  /**
   * Evaluate a system design diagram using Claude Vision
   */
  async evaluateDiagram(
    imageBase64: string,
    jsonData: string,
    question: string,
    requirements: string[]
  ): Promise<DiagramEvaluation> {
    
    // 1. Parse JSON to understand structure
    const structuredAnalysis = this.parseExcalidrawJSON(jsonData);
    
    // 2. Use Claude Vision for visual analysis
    const visionPrompt = `
You are a senior system design interviewer evaluating a candidate's architecture diagram.

## Question
${question}

## Requirements
${requirements.map((r, i) => `${i + 1}. ${r}`).join('\n')}

## Detected Components (from diagram JSON)
${JSON.stringify(structuredAnalysis, null, 2)}

## Instructions
Analyze this system design diagram and provide:
1. Overall score (0-100)
2. Strengths of the design
3. Areas for improvement
4. Missing critical components
5. Scalability assessment
6. Detailed feedback

Consider:
- Does it meet the requirements?
- Is it scalable?
- Are there single points of failure?
- Is data consistency handled?
- Are there appropriate caching strategies?
- Is the load balancing appropriate?

Respond in JSON format:
{
  "score": number,
  "strengths": ["..."],
  "improvements": ["..."],
  "missingComponents": ["..."],
  "scalabilityNotes": "...",
  "feedback": "..."
}
`;

    const response = await claudeService.analyzeImage(imageBase64, visionPrompt);
    
    try {
      return JSON.parse(response);
    } catch {
      return {
        score: 0,
        strengths: [],
        improvements: ['Could not parse AI response'],
        missingComponents: [],
        scalabilityNotes: '',
        feedback: response
      };
    }
  }
  
  /**
   * Parse Excalidraw JSON to extract components
   */
  private parseExcalidrawJSON(jsonData: string): {
    components: string[];
    connections: { from: string; to: string }[];
    labels: string[];
  } {
    const data = JSON.parse(jsonData);
    const elements = data.elements || [];
    
    const components: string[] = [];
    const labels: string[] = [];
    const connections: { from: string; to: string }[] = [];
    
    elements.forEach((el: any) => {
      if (el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond') {
        components.push(`${el.type} at (${el.x}, ${el.y})`);
      }
      if (el.type === 'text') {
        labels.push(el.text);
      }
      if (el.type === 'arrow' || el.type === 'line') {
        // Track connections based on bound elements
        if (el.boundElements) {
          connections.push({
            from: el.startBinding?.elementId || 'unknown',
            to: el.endBinding?.elementId || 'unknown'
          });
        }
      }
    });
    
    return { components, connections, labels };
  }
}

export default new SystemDesignEvaluationService();
```

---

## 3. File Structure

```
frontend/src/
├── components/
│   ├── shared/
│   │   ├── CodeEditorModal.tsx          # Shared code editor
│   │   ├── SystemDesignWhiteboard.tsx   # Excalidraw wrapper
│   │   ├── QuestionDisplay.tsx          # Common question display
│   │   └── EvaluationFeedback.tsx       # Common feedback display
│   ├── MockInterviewPanel.tsx           # Uses shared components
│   └── ProblemSolvingAgent.tsx          # Uses shared components
├── contexts/
│   └── InterAgentContext.tsx            # Cross-agent state
└── services/
    ├── codeExecutionService.ts          # Shared code execution
    └── agentEventBus.ts                 # Inter-agent events

backend/src/
├── services/
│   └── jobs/
│       ├── mockInterviewService.ts      # Existing
│       └── systemDesignEvaluationService.ts  # New
└── agents/
    └── JobsAgent.ts                     # Updated with new actions
```

---

## 4. Implementation Priority

| Phase | Feature | Effort | Impact |
|-------|---------|--------|--------|
| **1** | Shared CodeEditorModal | Medium | High |
| **2** | Excalidraw Integration | Medium | High |
| **3** | System Design Evaluation | Low | High |
| **4** | Inter-Agent Event Bus | Low | Medium |
| **5** | Template Library | Low | Medium |

---

## 5. Dependencies to Add

```json
{
  "dependencies": {
    "@excalidraw/excalidraw": "^0.17.0",
    "@monaco-editor/react": "^4.6.0"
  }
}
```

---

## 6. API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/jobs/interview/code/execute` | POST | Execute code submission |
| `/jobs/interview/code/validate` | POST | Validate solution |
| `/jobs/interview/design/evaluate` | POST | Evaluate system design |
| `/problems/hints` | GET | Get hints for problem |
| `/problems/solutions` | GET | Get solution for problem |



