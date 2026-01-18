/**
 * System Design Whiteboard Component
 * 
 * An Excalidraw-based whiteboard for system design interview questions.
 * Features:
 * - Full-featured drawing canvas
 * - Pre-made architecture component templates
 * - Export to PNG (for AI vision evaluation) and JSON (for structured analysis)
 * - Dark theme support
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Loader2,
  Database,
  Server,
  Cloud,
  HardDrive,
  Layers,
  Globe,
  Shield,
  RotateCcw,
  Clock,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Cpu,
  Network,
  Pencil,
  Type,
  Square,
  ArrowRight,
  Trash2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Move,
  Minus,
  Circle,
  // Additional component icons
  Monitor,
  Smartphone,
  Wifi,
  Lock,
  Search,
  Bell,
  FileText,
  GitBranch,
  Activity,
  Zap
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface SystemDesignQuestion {
  title: string;
  description: string;
  requirements: string[];
  constraints?: string[];
  hints?: string[];
  timeLimit?: number; // in minutes
  category?: string;
}

export interface DiagramSubmission {
  imageBase64: string;
  jsonData: string;
  textAnnotations: string[];
  elapsedTime: number;
}

export type WhiteboardMode = 'sandbox' | 'system-design';

export interface SavedCanvas {
  id: string;
  name: string;
  elements: CanvasElement[];
  createdAt: string;
  updatedAt: string;
}

export interface SystemDesignWhiteboardProps {
  isOpen: boolean;
  onClose: () => void;
  // For system-design mode
  question?: SystemDesignQuestion;
  onSubmit?: (result: DiagramSubmission) => void;
  // Mode control
  mode?: WhiteboardMode;
  // For sandbox mode - save/load
  initialElements?: CanvasElement[];
  canvasName?: string;
  onSave?: (elements: CanvasElement[], name: string) => void;
}

// =============================================================================
// COMPONENT TEMPLATES
// =============================================================================

interface ComponentTemplate {
  name: string;
  icon: React.ReactNode;
  iconName: string; // For canvas rendering
  color: string;
  description: string;
  shortcut: string;
}

const COMPONENT_TEMPLATES: ComponentTemplate[] = [
  // Core Infrastructure (1-5)
  { name: 'Client', icon: <Monitor className="w-4 h-4" />, iconName: 'client', color: '#60a5fa', description: 'Web/Desktop client', shortcut: '1' },
  { name: 'Mobile App', icon: <Smartphone className="w-4 h-4" />, iconName: 'mobile', color: '#818cf8', description: 'Mobile application', shortcut: '2' },
  { name: 'Load Balancer', icon: <Network className="w-4 h-4" />, iconName: 'network', color: '#22c55e', description: 'Distributes traffic', shortcut: '3' },
  { name: 'API Gateway', icon: <Shield className="w-4 h-4" />, iconName: 'shield', color: '#a855f7', description: 'API routing & auth', shortcut: '4' },
  { name: 'Web Server', icon: <Globe className="w-4 h-4" />, iconName: 'globe', color: '#3b82f6', description: 'Handles HTTP', shortcut: '5' },
  
  // Data Layer (6-9, 0)
  { name: 'Database', icon: <Database className="w-4 h-4" />, iconName: 'database', color: '#f59e0b', description: 'SQL/NoSQL DB', shortcut: '6' },
  { name: 'Cache', icon: <Zap className="w-4 h-4" />, iconName: 'cache', color: '#ef4444', description: 'Redis/Memcached', shortcut: '7' },
  { name: 'Message Queue', icon: <MessageSquare className="w-4 h-4" />, iconName: 'message', color: '#06b6d4', description: 'Kafka/RabbitMQ', shortcut: '8' },
  { name: 'Storage', icon: <HardDrive className="w-4 h-4" />, iconName: 'storage', color: '#64748b', description: 'S3/Blob storage', shortcut: '9' },
  { name: 'CDN', icon: <Cloud className="w-4 h-4" />, iconName: 'cloud', color: '#8b5cf6', description: 'Content delivery', shortcut: '0' },
  
  // Services (no shortcuts - click to use)
  { name: 'Microservice', icon: <Server className="w-4 h-4" />, iconName: 'server', color: '#10b981', description: 'Service container', shortcut: '' },
  { name: 'Worker', icon: <Layers className="w-4 h-4" />, iconName: 'layers', color: '#f97316', description: 'Background jobs', shortcut: '' },
  { name: 'Auth Service', icon: <Lock className="w-4 h-4" />, iconName: 'auth', color: '#dc2626', description: 'Authentication', shortcut: '' },
  { name: 'Search', icon: <Search className="w-4 h-4" />, iconName: 'search', color: '#0891b2', description: 'Elasticsearch', shortcut: '' },
  { name: 'Notification', icon: <Bell className="w-4 h-4" />, iconName: 'notification', color: '#eab308', description: 'Push/Email/SMS', shortcut: '' },
  { name: 'Logging', icon: <FileText className="w-4 h-4" />, iconName: 'logging', color: '#78716c', description: 'Log aggregation', shortcut: '' },
  { name: 'DNS', icon: <Wifi className="w-4 h-4" />, iconName: 'dns', color: '#14b8a6', description: 'Domain resolution', shortcut: '' },
  { name: 'Monitoring', icon: <Activity className="w-4 h-4" />, iconName: 'monitoring', color: '#f43f5e', description: 'Metrics/Alerts', shortcut: '' },
];

// =============================================================================
// COLOR PALETTE
// =============================================================================

const COLOR_PALETTE = [
  '#ffffff', // White
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#84cc16', // Lime
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#64748b', // Slate
  '#000000', // Black
];

// =============================================================================
// ENHANCED CANVAS COMPONENT
// =============================================================================

type ToolType = 'select' | 'rect' | 'ellipse' | 'text' | 'arrow' | 'line' | 'pen' | 'eraser';
type LineStyle = 'solid' | 'dashed' | 'dotted';

interface CanvasElement {
  id: string;
  type: 'rect' | 'ellipse' | 'text' | 'arrow' | 'line' | 'path' | 'component';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  lineStyle?: LineStyle;
  points?: { x: number; y: number }[];
  fontSize?: number;
  // Component specific
  componentName?: string;      // Name of component template
  iconName?: string;           // Icon identifier for rendering
  // Connection info for arrows (graph-like behavior)
  sourceElementId?: string;    // ID of source component
  sourceHandlePos?: 'top' | 'right' | 'bottom' | 'left';
  targetElementId?: string;    // ID of target component
  targetHandlePos?: 'top' | 'right' | 'bottom' | 'left';
}

// Pending component for drag-and-drop
interface PendingComponent {
  template: ComponentTemplate;
  x: number;
  y: number;
}

const SimpleCanvas: React.FC<{
  onElementsChange: (elements: CanvasElement[]) => void;
  pendingComponent: PendingComponent | null;
  onPendingComponentPlaced: () => void;
  onComponentSelect: (template: ComponentTemplate) => void;
}> = ({ onElementsChange, pendingComponent, onPendingComponentPlaced, onComponentSelect }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [history, setHistory] = useState<CanvasElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selectedTool, setSelectedTool] = useState<ToolType>('rect');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });
  const [selectedColor, setSelectedColor] = useState('#3b82f6');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [lineStyle, setLineStyle] = useState<LineStyle>('solid');
  const [zoom, setZoom] = useState(1);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputPos, setTextInputPos] = useState({ x: 0, y: 0 });
  const [textInputValue, setTextInputValue] = useState('');
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Selection and dragging state
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Ghost preview position for pending component
  const [ghostPosition, setGhostPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Connection drawing state (for creating arrows between components)
  const [isDrawingConnection, setIsDrawingConnection] = useState(false);
  const [connectionStart, setConnectionStart] = useState<{ elementId: string; x: number; y: number } | null>(null);
  const [connectionEnd, setConnectionEnd] = useState<{ x: number; y: number } | null>(null);
  
  // Hovered handle for visual feedback (like webwhiteboard.com)
  const [hoveredHandle, setHoveredHandle] = useState<{ elementId: string; x: number; y: number } | null>(null);
  
  // Suggested arrow to nearest component (shown when hovering a handle)
  const [suggestedArrow, setSuggestedArrow] = useState<{
    fromX: number; fromY: number;
    toX: number; toY: number;
    targetElementId: string;
  } | null>(null);
  
  // Screen position for text input (not canvas coordinates)
  const [textInputScreenPos, setTextInputScreenPos] = useState({ x: 0, y: 0 });
  
  // Track which text element is being edited (null = creating new)
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // Save to history when elements change
  const saveToHistory = useCallback((newElements: CanvasElement[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push([...newElements]);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setElements(history[historyIndex - 1] || []);
    }
  }, [historyIndex, history]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setElements(history[historyIndex + 1] || []);
    }
  }, [historyIndex, history]);

  // Resize canvas to match container
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      
      if (width > 0 && height > 0 && (canvas.width !== width || canvas.height !== height)) {
        setCanvasSize({ width, height });
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    // Use ResizeObserver for more accurate size tracking
    const resizeObserver = new ResizeObserver(updateCanvasSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      resizeObserver.disconnect();
    };
  }, []);

  // Set line style on context
  const setLineStyleOnContext = (ctx: CanvasRenderingContext2D, style: LineStyle) => {
    switch (style) {
      case 'dashed':
        ctx.setLineDash([10, 5]);
        break;
      case 'dotted':
        ctx.setLineDash([2, 4]);
        break;
      default:
        ctx.setLineDash([]);
    }
  };

  // Redraw canvas when elements change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Update canvas internal size to match display size
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Apply zoom
    ctx.save();
    ctx.scale(zoom, zoom);

    // Clear canvas
    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(0, 0, canvas.width / zoom, canvas.height / zoom);

    // Draw grid
    ctx.strokeStyle = '#2a2a3e';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    const gridSize = 30;
    for (let x = 0; x < canvas.width / zoom; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height / zoom);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height / zoom; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width / zoom, y);
      ctx.stroke();
    }

    // Draw elements
    elements.forEach(el => {
      ctx.setLineDash([]);
      
      if (el.type === 'rect') {
        ctx.fillStyle = el.color || '#3b82f6';
        ctx.fillRect(el.x, el.y, el.width || 100, el.height || 60);
        ctx.strokeStyle = el.strokeColor || '#fff';
        ctx.lineWidth = el.strokeWidth || 2;
        setLineStyleOnContext(ctx, el.lineStyle || 'solid');
        ctx.strokeRect(el.x, el.y, el.width || 100, el.height || 60);
        
        if (el.text) {
          ctx.fillStyle = '#fff';
          ctx.font = `${el.fontSize || 14}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(el.text, el.x + (el.width || 100) / 2, el.y + (el.height || 60) / 2);
        }
      } else if (el.type === 'ellipse') {
        const w = el.width || 100;
        const h = el.height || 60;
        const cx = el.x + w / 2;
        const cy = el.y + h / 2;
        
        ctx.fillStyle = el.color || '#3b82f6';
        ctx.beginPath();
        ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = el.strokeColor || '#fff';
        ctx.lineWidth = el.strokeWidth || 2;
        setLineStyleOnContext(ctx, el.lineStyle || 'solid');
        ctx.stroke();
        
        if (el.text) {
          ctx.fillStyle = '#fff';
          ctx.font = `${el.fontSize || 14}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(el.text, cx, cy);
        }
      } else if (el.type === 'text') {
        ctx.fillStyle = el.color || '#fff';
        ctx.font = `${el.fontSize || 16}px Inter, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Support multi-line text
        const lines = (el.text || '').split('\n');
        const lineHeight = (el.fontSize || 16) * 1.3;
        lines.forEach((line, index) => {
          ctx.fillText(line, el.x, el.y + index * lineHeight);
        });
      } else if (el.type === 'arrow' || el.type === 'line') {
        const endX = el.width || el.x + 100;
        const endY = el.height || el.y;
        
        ctx.strokeStyle = el.color || '#fff';
        ctx.lineWidth = el.strokeWidth || 2;
        setLineStyleOnContext(ctx, el.lineStyle || 'solid');
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Arrow head (only for arrows)
        if (el.type === 'arrow') {
          ctx.setLineDash([]);
          const angle = Math.atan2(endY - el.y, endX - el.x);
          const headLen = 12;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - headLen * Math.cos(angle - Math.PI / 6),
            endY - headLen * Math.sin(angle - Math.PI / 6)
          );
          ctx.lineTo(
            endX - headLen * Math.cos(angle + Math.PI / 6),
            endY - headLen * Math.sin(angle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fillStyle = el.color || '#fff';
          ctx.fill();
        }
      } else if (el.type === 'path' && el.points) {
        if (el.points.length < 2) return;
        
        ctx.strokeStyle = el.color || '#fff';
        ctx.lineWidth = el.strokeWidth || 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        setLineStyleOnContext(ctx, el.lineStyle || 'solid');
        
        ctx.beginPath();
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      } else if (el.type === 'component') {
        // Draw component with icon and rounded corners
        const w = el.width || 130;
        const h = el.height || 70;
        const radius = 8;
        
        // Icon mapping for canvas rendering
        const iconEmojis: Record<string, string> = {
          'client': '💻',
          'mobile': '📱',
          'network': '🔀',
          'globe': '🌐',
          'shield': '🛡️',
          'database': '🗄️',
          'cache': '⚡',
          'message': '📨',
          'cloud': '☁️',
          'storage': '💾',
          'server': '📦',
          'layers': '⚙️',
          'auth': '🔐',
          'search': '🔍',
          'notification': '🔔',
          'logging': '📝',
          'dns': '📡',
          'monitoring': '📊'
        };
        
        // Draw rounded rectangle background
        ctx.fillStyle = el.color || '#3b82f6';
        ctx.beginPath();
        ctx.moveTo(el.x + radius, el.y);
        ctx.lineTo(el.x + w - radius, el.y);
        ctx.quadraticCurveTo(el.x + w, el.y, el.x + w, el.y + radius);
        ctx.lineTo(el.x + w, el.y + h - radius);
        ctx.quadraticCurveTo(el.x + w, el.y + h, el.x + w - radius, el.y + h);
        ctx.lineTo(el.x + radius, el.y + h);
        ctx.quadraticCurveTo(el.x, el.y + h, el.x, el.y + h - radius);
        ctx.lineTo(el.x, el.y + radius);
        ctx.quadraticCurveTo(el.x, el.y, el.x + radius, el.y);
        ctx.closePath();
        ctx.fill();
        
        // Draw border
        ctx.strokeStyle = el.strokeColor || '#fff';
        ctx.lineWidth = el.strokeWidth || 2;
        ctx.stroke();
        
        // Draw icon circle at top
        const iconSize = 24;
        const iconX = el.x + w / 2;
        const iconY = el.y + 20;
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(iconX, iconY, iconSize / 2 + 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw icon emoji
        const emoji = iconEmojis[el.iconName || ''] || '📦';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, iconX, iconY);
        
        // Draw component name
        if (el.text) {
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${el.fontSize || 12}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(el.text, el.x + w / 2, el.y + h - 18);
        }
      }
    });

    // Draw current path while drawing
    if (isDrawing && selectedTool === 'pen' && currentPath.length > 1) {
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([]);
      
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (let i = 1; i < currentPath.length; i++) {
        ctx.lineTo(currentPath[i].x, currentPath[i].y);
      }
      ctx.stroke();
    }

    // Draw selection highlight and connection handles
    if (selectedElementId) {
      const selectedEl = elements.find(el => el.id === selectedElementId);
      if (selectedEl) {
        // Selection border
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        if (selectedEl.type === 'rect' || selectedEl.type === 'ellipse' || selectedEl.type === 'text' || selectedEl.type === 'component') {
          const w = selectedEl.width || (selectedEl.type === 'text' ? (selectedEl.text?.length || 0) * 8 : 100);
          const h = selectedEl.height || (selectedEl.type === 'text' ? 20 : 60);
          ctx.strokeRect(selectedEl.x - 4, selectedEl.y - 4, w + 8, h + 8);
        }
      }
    }

    // Draw connection handles on all rect/ellipse/component elements (always visible for easy arrow creation)
    // This mimics webwhiteboard.com behavior where you can drag from handles to create connections
    elements.forEach(el => {
      if (el.type !== 'rect' && el.type !== 'ellipse' && el.type !== 'component') return;
      
      const width = el.width || 130;
      const height = el.height || 70;
      const handles = [
        { x: el.x + width / 2, y: el.y },           // top
        { x: el.x + width, y: el.y + height / 2 },  // right
        { x: el.x + width / 2, y: el.y + height },  // bottom
        { x: el.x, y: el.y + height / 2 }           // left
      ];
      
      ctx.setLineDash([]);
      handles.forEach(h => {
        // Check if this handle is hovered
        const isHovered = hoveredHandle && 
          Math.abs(hoveredHandle.x - h.x) < 2 && 
          Math.abs(hoveredHandle.y - h.y) < 2;
        
        if (isHovered) {
          // Larger glowing handle when hovered (like webwhiteboard.com)
          ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
          ctx.beginPath();
          ctx.arc(h.x, h.y, 14, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.strokeStyle = '#00d4ff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(h.x, h.y, 10, 0, Math.PI * 2);
          ctx.stroke();
        }
        
        // Outer circle (border)
        ctx.fillStyle = isHovered ? '#00d4ff' : '#1e293b';
        ctx.beginPath();
        ctx.arc(h.x, h.y, isHovered ? 7 : 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner circle - cyan color
        ctx.fillStyle = isHovered ? '#ffffff' : '#00d4ff';
        ctx.beginPath();
        ctx.arc(h.x, h.y, isHovered ? 4 : 5, 0, Math.PI * 2);
        ctx.fill();
      });
    });

    // Draw connection preview while dragging
    if (isDrawingConnection && connectionStart && connectionEnd) {
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(connectionStart.x, connectionStart.y);
      ctx.lineTo(connectionEnd.x, connectionEnd.y);
      ctx.stroke();
      
      // Draw arrow head
      ctx.setLineDash([]);
      const angle = Math.atan2(connectionEnd.y - connectionStart.y, connectionEnd.x - connectionStart.x);
      const headLen = 12;
      ctx.beginPath();
      ctx.moveTo(connectionEnd.x, connectionEnd.y);
      ctx.lineTo(
        connectionEnd.x - headLen * Math.cos(angle - Math.PI / 6),
        connectionEnd.y - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        connectionEnd.x - headLen * Math.cos(angle + Math.PI / 6),
        connectionEnd.y - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = '#00d4ff';
      ctx.fill();
    }

    // Draw ghost preview for pending component
    if (pendingComponent && ghostPosition) {
      const gx = ghostPosition.x - 65;
      const gy = ghostPosition.y - 35;
      const gw = 130;
      const gh = 70;
      const radius = 8;
      
      // Icon mapping
      const iconEmojis: Record<string, string> = {
        'client': '💻', 'mobile': '📱', 'network': '🔀', 'globe': '🌐',
        'shield': '🛡️', 'database': '🗄️', 'cache': '⚡', 'message': '📨',
        'cloud': '☁️', 'storage': '💾', 'server': '📦', 'layers': '⚙️',
        'auth': '🔐', 'search': '🔍', 'notification': '🔔', 'logging': '📝',
        'dns': '📡', 'monitoring': '📊'
      };
      
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = pendingComponent.template.color;
      
      // Rounded rectangle
      ctx.beginPath();
      ctx.moveTo(gx + radius, gy);
      ctx.lineTo(gx + gw - radius, gy);
      ctx.quadraticCurveTo(gx + gw, gy, gx + gw, gy + radius);
      ctx.lineTo(gx + gw, gy + gh - radius);
      ctx.quadraticCurveTo(gx + gw, gy + gh, gx + gw - radius, gy + gh);
      ctx.lineTo(gx + radius, gy + gh);
      ctx.quadraticCurveTo(gx, gy + gh, gx, gy + gh - radius);
      ctx.lineTo(gx, gy + radius);
      ctx.quadraticCurveTo(gx, gy, gx + radius, gy);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw icon
      const emoji = iconEmojis[pendingComponent.template.iconName || ''] || '📦';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, ghostPosition.x, gy + 20);
      
      // Draw name
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText(pendingComponent.template.name, ghostPosition.x, gy + gh - 18);
      
      ctx.globalAlpha = 1;
    }

    // Draw suggested arrow to nearest component (when hovering a handle)
    if (suggestedArrow && !isDrawingConnection) {
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#22c55e'; // Green for suggestion
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(suggestedArrow.fromX, suggestedArrow.fromY);
      ctx.lineTo(suggestedArrow.toX, suggestedArrow.toY);
      ctx.stroke();
      
      // Draw arrow head
      ctx.setLineDash([]);
      const angle = Math.atan2(suggestedArrow.toY - suggestedArrow.fromY, suggestedArrow.toX - suggestedArrow.fromX);
      const headLen = 10;
      ctx.beginPath();
      ctx.moveTo(suggestedArrow.toX, suggestedArrow.toY);
      ctx.lineTo(
        suggestedArrow.toX - headLen * Math.cos(angle - Math.PI / 6),
        suggestedArrow.toY - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        suggestedArrow.toX - headLen * Math.cos(angle + Math.PI / 6),
        suggestedArrow.toY - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = '#22c55e';
      ctx.fill();
      
      // Draw "Click to connect" hint near the target
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = '#22c55e';
      ctx.textAlign = 'center';
      ctx.fillText('Click to connect', suggestedArrow.toX, suggestedArrow.toY - 15);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
    onElementsChange(elements);
  }, [elements, onElementsChange, canvasSize, zoom, isDrawing, currentPath, selectedTool, selectedColor, strokeWidth, selectedElementId, pendingComponent, ghostPosition, isDrawingConnection, connectionStart, connectionEnd, hoveredHandle, suggestedArrow]);

  // Get accurate mouse position on canvas (in canvas coordinates)
  const getMousePos = (e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Calculate position accounting for any CSS scaling and zoom
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = ((e.clientX - rect.left) * scaleX) / zoom;
    const y = ((e.clientY - rect.top) * scaleY) / zoom;
    
    return { x: Math.round(x), y: Math.round(y) };
  };

  // Get screen position relative to container (for overlay positioning)
  const getScreenPos = (e: React.MouseEvent): { x: number; y: number } => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return { 
      x: e.clientX - rect.left, 
      y: e.clientY - rect.top 
    };
  };

  // Get connection handle positions for an element (top, right, bottom, left)
  const getConnectionHandles = (el: CanvasElement): { position: string; x: number; y: number }[] => {
    const width = el.width || 130;
    const height = el.height || 70;
    return [
      { position: 'top', x: el.x + width / 2, y: el.y },
      { position: 'right', x: el.x + width, y: el.y + height / 2 },
      { position: 'bottom', x: el.x + width / 2, y: el.y + height },
      { position: 'left', x: el.x, y: el.y + height / 2 }
    ];
  };

  // Check if position is near a connection handle
  const getHandleAtPosition = (x: number, y: number): { elementId: string; handleX: number; handleY: number } | null => {
    for (const el of elements) {
      if (el.type !== 'rect' && el.type !== 'ellipse' && el.type !== 'component') continue;
      const handles = getConnectionHandles(el);
      for (const handle of handles) {
        const dist = Math.sqrt(Math.pow(x - handle.x, 2) + Math.pow(y - handle.y, 2));
        if (dist < 15) { // 15px hit area for handles
          return { elementId: el.id, handleX: handle.x, handleY: handle.y };
        }
      }
    }
    return null;
  };

  // Find closest handle on target element
  const getClosestHandle = (targetEl: CanvasElement, x: number, y: number): { x: number; y: number; position: string } => {
    const handles = getConnectionHandles(targetEl);
    let closest = handles[0];
    let minDist = Infinity;
    for (const handle of handles) {
      const dist = Math.sqrt(Math.pow(x - handle.x, 2) + Math.pow(y - handle.y, 2));
      if (dist < minDist) {
        minDist = dist;
        closest = handle;
      }
    }
    return { x: closest.x, y: closest.y, position: closest.position };
  };

  // Find the nearest component to a given handle (for arrow suggestion)
  const findNearestComponent = (sourceElementId: string, handleX: number, handleY: number): { 
    element: CanvasElement; 
    handleX: number; 
    handleY: number;
    handlePos: string;
    distance: number;
  } | null => {
    let nearest: { element: CanvasElement; handleX: number; handleY: number; handlePos: string; distance: number } | null = null;
    
    for (const el of elements) {
      // Skip the source element and non-component elements
      if (el.id === sourceElementId || (el.type !== 'rect' && el.type !== 'ellipse' && el.type !== 'component')) continue;
      
      // Get the closest handle on this element
      const closestHandle = getClosestHandle(el, handleX, handleY);
      const dist = Math.sqrt(Math.pow(closestHandle.x - handleX, 2) + Math.pow(closestHandle.y - handleY, 2));
      
      if (!nearest || dist < nearest.distance) {
        nearest = { 
          element: el, 
          handleX: closestHandle.x, 
          handleY: closestHandle.y,
          handlePos: closestHandle.position,
          distance: dist 
        };
      }
    }
    
    return nearest;
  };

  // Find element at position (for selection and dragging)
  const getElementAtPosition = (x: number, y: number): CanvasElement | null => {
    // Search in reverse order (top elements first)
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      
      if (el.type === 'rect' || el.type === 'ellipse' || el.type === 'component') {
        const elWidth = el.width || 100;
        const elHeight = el.height || 60;
        if (x >= el.x && x <= el.x + elWidth && y >= el.y && y <= el.y + elHeight) {
          return el;
        }
      } else if (el.type === 'text') {
        // Approximate text bounds (multi-line support)
        const lines = (el.text || '').split('\n');
        const maxLineLength = Math.max(...lines.map(l => l.length), 1);
        const textWidth = maxLineLength * 8;
        const lineHeight = (el.fontSize || 16) * 1.3;
        const textHeight = lines.length * lineHeight;
        if (x >= el.x && x <= el.x + textWidth && y >= el.y && y <= el.y + textHeight) {
          return el;
        }
      } else if (el.type === 'arrow' || el.type === 'line') {
        // Check if near the line
        const endX = el.width || el.x + 100;
        const endY = el.height || el.y;
        const dist = distanceToLine(x, y, el.x, el.y, endX, endY);
        if (dist < 10) {
          return el;
        }
      }
    }
    return null;
  };

  // Distance from point to line segment
  const distanceToLine = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    let xx, yy;
    if (param < 0) { xx = x1; yy = y1; }
    else if (param > 1) { xx = x2; yy = y2; }
    else { xx = x1 + param * C; yy = y1 + param * D; }
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    const screenPos = getScreenPos(e);
    
    // If there's a pending component, place it
    if (pendingComponent) {
      const newElement: CanvasElement = {
        id: `el-${Date.now()}`,
        type: 'component',
        x: pos.x - 65, // Center the component (130/2)
        y: pos.y - 35, // Center the component (70/2)
        width: 130,
        height: 70,
        color: pendingComponent.template.color,
        strokeColor: '#fff',
        strokeWidth: 2,
        text: pendingComponent.template.name,
        componentName: pendingComponent.template.name,
        iconName: pendingComponent.template.iconName,
        fontSize: 13
      };
      const newElements = [...elements, newElement];
      setElements(newElements);
      saveToHistory(newElements);
      setGhostPosition(null);
      onPendingComponentPlaced();
      return;
    }
    
    // Quick connect: If hovering a handle with suggested arrow, single click creates the arrow
    if (suggestedArrow && hoveredHandle) {
      // Get handle positions for connection tracking
      const sourceEl = elements.find(el => el.id === hoveredHandle.elementId);
      const targetEl = elements.find(el => el.id === suggestedArrow.targetElementId);
      
      if (sourceEl && targetEl) {
        const sourceHandles = getConnectionHandles(sourceEl);
        const targetHandles = getConnectionHandles(targetEl);
        const sourceHandleInfo = sourceHandles.find(h => 
          Math.abs(h.x - suggestedArrow.fromX) < 2 && Math.abs(h.y - suggestedArrow.fromY) < 2
        );
        const targetHandleInfo = targetHandles.find(h => 
          Math.abs(h.x - suggestedArrow.toX) < 2 && Math.abs(h.y - suggestedArrow.toY) < 2
        );
        
        const newArrow: CanvasElement = {
          id: `el-${Date.now()}`,
          type: 'arrow',
          x: suggestedArrow.fromX,
          y: suggestedArrow.fromY,
          width: suggestedArrow.toX,  // For arrows, width = end X position
          height: suggestedArrow.toY, // For arrows, height = end Y position
          color: selectedColor,
          strokeWidth: strokeWidth,
          // Store connection info for graph-like behavior
          sourceElementId: hoveredHandle.elementId,
          sourceHandlePos: sourceHandleInfo?.position as 'top' | 'right' | 'bottom' | 'left',
          targetElementId: suggestedArrow.targetElementId,
          targetHandlePos: targetHandleInfo?.position as 'top' | 'right' | 'bottom' | 'left'
        };
        const newElements = [...elements, newArrow];
        setElements(newElements);
        saveToHistory(newElements);
        setSuggestedArrow(null);
        setHoveredHandle(null);
        return;
      }
    }
    
    // Text tool - check if clicking on existing text to edit, or create new
    if (selectedTool === 'text') {
      // Check if clicking on an existing text element
      const clickedElement = getElementAtPosition(pos.x, pos.y);
      if (clickedElement && clickedElement.type === 'text') {
        // Edit existing text
        setTextInputPos({ x: clickedElement.x, y: clickedElement.y });
        setTextInputScreenPos(screenPos);
        setTextInputValue(clickedElement.text || '');
        setEditingTextId(clickedElement.id);
        setShowTextInput(true);
        setTimeout(() => textInputRef.current?.focus(), 50);
        return;
      }
      
      // Create new text
      setTextInputPos(pos);
      setTextInputScreenPos(screenPos);
      setTextInputValue('');
      setEditingTextId(null);
      setShowTextInput(true);
      setTimeout(() => textInputRef.current?.focus(), 50);
      return;
    }
    
    // Check if clicking on a connection handle (to start drawing an arrow)
    // Works with any tool except text - allows quick arrow creation from handles
    const handle = getHandleAtPosition(pos.x, pos.y);
    if (handle) {
      setIsDrawingConnection(true);
      setConnectionStart({ elementId: handle.elementId, x: handle.handleX, y: handle.handleY });
      setConnectionEnd(pos);
      return;
    }
    
    // Select tool - check if clicking on an element
    if (selectedTool === 'select') {
      const clickedElement = getElementAtPosition(pos.x, pos.y);
      if (clickedElement) {
        setSelectedElementId(clickedElement.id);
        setIsDragging(true);
        setDragOffset({ x: pos.x - clickedElement.x, y: pos.y - clickedElement.y });
        return;
      } else {
        setSelectedElementId(null);
      }
    }
    
    if (selectedTool === 'pen') {
      setCurrentPath([pos]);
    }
    
    setStartPos(pos);
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    
    // Update ghost position for pending component
    if (pendingComponent) {
      setGhostPosition(pos);
      return;
    }
    
    // Handle connection drawing - update endpoint and check for target handles
    if (isDrawingConnection && connectionStart) {
      // Check if hovering near a handle on another element (for snap preview)
      const handle = getHandleAtPosition(pos.x, pos.y);
      if (handle && handle.elementId !== connectionStart.elementId) {
        // Snap to the handle
        setConnectionEnd({ x: handle.handleX, y: handle.handleY });
        setHoveredHandle({ elementId: handle.elementId, x: handle.handleX, y: handle.handleY });
      } else {
        setConnectionEnd(pos);
        setHoveredHandle(null);
      }
      return;
    }
    
    // Handle dragging selected element (with graph-like arrow updates)
    if (isDragging && selectedElementId) {
      setElements(prev => {
        const draggedElement = prev.find(el => el.id === selectedElementId);
        if (!draggedElement) return prev;
        
        const newX = pos.x - dragOffset.x;
        const newY = pos.y - dragOffset.y;
        
        return prev.map(el => {
          // Update the dragged element position
          if (el.id === selectedElementId) {
            return { ...el, x: newX, y: newY };
          }
          
          // Update arrows connected to the dragged element (graph-like behavior)
          if (el.type === 'arrow') {
            const updatedElement = { ...el };
            let needsUpdate = false;
            
            // If this arrow starts from the dragged element
            if (el.sourceElementId === selectedElementId && el.sourceHandlePos) {
              const newDraggedEl = { ...draggedElement, x: newX, y: newY };
              const handles = getConnectionHandles(newDraggedEl);
              const handle = handles.find(h => h.position === el.sourceHandlePos);
              if (handle) {
                // For arrows: x,y = start; width,height = end (absolute)
                // Keep the end point the same, update start point
                updatedElement.x = handle.x;
                updatedElement.y = handle.y;
                needsUpdate = true;
              }
            }
            
            // If this arrow ends at the dragged element
            if (el.targetElementId === selectedElementId && el.targetHandlePos) {
              const newDraggedEl = { ...draggedElement, x: newX, y: newY };
              const handles = getConnectionHandles(newDraggedEl);
              const handle = handles.find(h => h.position === el.targetHandlePos);
              if (handle) {
                // For arrows: width,height = end position (absolute)
                updatedElement.width = handle.x;
                updatedElement.height = handle.y;
                needsUpdate = true;
              }
            }
            
            return needsUpdate ? updatedElement : el;
          }
          
          return el;
        });
      });
      return;
    }
    
    // Check if hovering over a handle (for visual feedback - like webwhiteboard.com)
    if (!isDrawing && selectedTool !== 'text') {
      const handle = getHandleAtPosition(pos.x, pos.y);
      if (handle) {
        setHoveredHandle({ elementId: handle.elementId, x: handle.handleX, y: handle.handleY });
        
        // Find nearest component and show suggested arrow
        const nearest = findNearestComponent(handle.elementId, handle.handleX, handle.handleY);
        if (nearest && nearest.distance < 400) { // Only suggest if within reasonable distance
          setSuggestedArrow({
            fromX: handle.handleX,
            fromY: handle.handleY,
            toX: nearest.handleX,
            toY: nearest.handleY,
            targetElementId: nearest.element.id
          });
        } else {
          setSuggestedArrow(null);
        }
      } else {
        setHoveredHandle(null);
        setSuggestedArrow(null);
      }
    }
    
    if (!isDrawing) return;
    
    if (selectedTool === 'pen') {
      setCurrentPath(prev => [...prev, pos]);
    } else if (selectedTool === 'eraser') {
      // Remove elements near the eraser position
      setElements(prev => prev.filter(el => {
        const centerX = el.x + (el.width || 0) / 2;
        const centerY = el.y + (el.height || 0) / 2;
        const dist = Math.sqrt(Math.pow(centerX - pos.x, 2) + Math.pow(centerY - pos.y, 2));
        return dist > 30; // 30px eraser radius
      }));
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    
    // Finish connection drawing
    if (isDrawingConnection && connectionStart) {
      // Find target element or use endpoint position
      const targetElement = getElementAtPosition(pos.x, pos.y);
      let endX = pos.x;
      let endY = pos.y;
      
      // If dropping on another component (not the source), snap to its closest handle
      if (targetElement && targetElement.id !== connectionStart.elementId) {
        const closestHandle = getClosestHandle(targetElement, pos.x, pos.y);
        endX = closestHandle.x;
        endY = closestHandle.y;
      }
      
      // Only create arrow if moved a minimum distance
      const dist = Math.sqrt(
        Math.pow(endX - connectionStart.x, 2) + 
        Math.pow(endY - connectionStart.y, 2)
      );
      
      if (dist > 30) {
        // Find source and target element info for graph-like behavior
        const sourceElement = elements.find(el => el.id === connectionStart.elementId);
        const sourceHandles = sourceElement ? getConnectionHandles(sourceElement) : [];
        const sourceHandleInfo = sourceHandles.find(h => 
          Math.abs(h.x - connectionStart.x) < 2 && Math.abs(h.y - connectionStart.y) < 2
        );
        
        let targetHandleInfo: { position: string } | undefined;
        if (targetElement) {
          const targetHandles = getConnectionHandles(targetElement);
          targetHandleInfo = targetHandles.find(h => 
            Math.abs(h.x - endX) < 2 && Math.abs(h.y - endY) < 2
          );
        }
        
        const newArrow: CanvasElement = {
          id: `el-${Date.now()}`,
          type: 'arrow',
          x: connectionStart.x,
          y: connectionStart.y,
          width: endX,  // For arrows, width/height store the end position
          height: endY,
          color: selectedColor,
          strokeWidth: strokeWidth,
          lineStyle: lineStyle,
          // Store connection info for graph-like behavior
          sourceElementId: connectionStart.elementId,
          sourceHandlePos: sourceHandleInfo?.position as 'top' | 'right' | 'bottom' | 'left' | undefined,
          targetElementId: targetElement?.id,
          targetHandlePos: targetHandleInfo?.position as 'top' | 'right' | 'bottom' | 'left' | undefined
        };
        const newElements = [...elements, newArrow];
        setElements(newElements);
        saveToHistory(newElements);
      }
      
      setIsDrawingConnection(false);
      setConnectionStart(null);
      setConnectionEnd(null);
      return;
    }
    
    // Finish dragging
    if (isDragging) {
      setIsDragging(false);
      saveToHistory([...elements]);
      return;
    }
    
    if (!isDrawing) return;

    const endPos = getMousePos(e);
    const endX = endPos.x;
    const endY = endPos.y;

    let newElement: CanvasElement | null = null;

    if (selectedTool === 'rect') {
      const width = Math.abs(endX - startPos.x);
      const height = Math.abs(endY - startPos.y);
      if (width > 5 && height > 5) {
        newElement = {
          id: `el-${Date.now()}`,
          type: 'rect',
          x: Math.min(startPos.x, endX),
          y: Math.min(startPos.y, endY),
          width,
          height,
          color: selectedColor,
          strokeColor: '#fff',
          strokeWidth,
          lineStyle
        };
      }
    } else if (selectedTool === 'ellipse') {
      const width = Math.abs(endX - startPos.x);
      const height = Math.abs(endY - startPos.y);
      if (width > 5 && height > 5) {
        newElement = {
          id: `el-${Date.now()}`,
          type: 'ellipse',
          x: Math.min(startPos.x, endX),
          y: Math.min(startPos.y, endY),
          width,
          height,
          color: selectedColor,
          strokeColor: '#fff',
          strokeWidth,
          lineStyle
        };
      }
    } else if (selectedTool === 'arrow') {
      newElement = {
        id: `el-${Date.now()}`,
        type: 'arrow',
        x: startPos.x,
        y: startPos.y,
        width: endX,
        height: endY,
        color: selectedColor,
        strokeWidth,
        lineStyle
      };
    } else if (selectedTool === 'line') {
      newElement = {
        id: `el-${Date.now()}`,
        type: 'line',
        x: startPos.x,
        y: startPos.y,
        width: endX,
        height: endY,
        color: selectedColor,
        strokeWidth,
        lineStyle
      };
    } else if (selectedTool === 'pen' && currentPath.length > 1) {
      newElement = {
        id: `el-${Date.now()}`,
        type: 'path',
        x: currentPath[0].x,
        y: currentPath[0].y,
        points: [...currentPath],
        color: selectedColor,
        strokeWidth,
        lineStyle
      };
      setCurrentPath([]);
    }

    if (newElement) {
      const newElements = [...elements, newElement];
      setElements(newElements);
      saveToHistory(newElements);
    }

    setIsDrawing(false);
  };

  const handleTextSubmit = () => {
    if (textInputValue.trim()) {
      if (editingTextId) {
        // Editing existing text
        const newElements = elements.map(el => 
          el.id === editingTextId 
            ? { ...el, text: textInputValue }
            : el
        );
        setElements(newElements);
        saveToHistory(newElements);
      } else {
        // Creating new text
        const newElement: CanvasElement = {
          id: `el-${Date.now()}`,
          type: 'text',
          x: textInputPos.x,
          y: textInputPos.y,
          text: textInputValue,
          color: selectedColor,
          fontSize: 16
        };
        const newElements = [...elements, newElement];
        setElements(newElements);
        saveToHistory(newElements);
      }
    }
    setShowTextInput(false);
    setTextInputValue('');
    setEditingTextId(null);
    // Auto-switch to select tool after adding/editing text (better UX)
    setSelectedTool('select');
  };

  const handleTextCancel = () => {
    setShowTextInput(false);
    setTextInputValue('');
    setEditingTextId(null);
    // Also switch to select on cancel
    setSelectedTool('select');
  };

  // Delete selected element
  const deleteSelected = useCallback(() => {
    if (selectedElementId) {
      const newElements = elements.filter(el => el.id !== selectedElementId);
      setElements(newElements);
      saveToHistory(newElements);
      setSelectedElementId(null);
    }
  }, [selectedElementId, elements, saveToHistory]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in text input
      if (showTextInput) {
        if (e.key === 'Escape') setShowTextInput(false);
        return;
      }
      
      // Delete selected element
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
        e.preventDefault();
      }
      
      // Escape - deselect
      if (e.key === 'Escape') {
        setSelectedElementId(null);
        onPendingComponentPlaced(); // Cancel pending component
      }
      
      // Ctrl+Z - Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        handleUndo();
        e.preventDefault();
      }
      
      // Ctrl+Y or Ctrl+Shift+Z - Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        handleRedo();
        e.preventDefault();
      }
      
      // Tool shortcuts (single keys, no modifiers)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'v': setSelectedTool('select'); break;
          case 'r': setSelectedTool('rect'); break;
          case 'o': setSelectedTool('ellipse'); break;
          case 'l': setSelectedTool('line'); break;
          case 'a': setSelectedTool('arrow'); break;
          case 't': setSelectedTool('text'); break;
          case 'p': setSelectedTool('pen'); break;
          case 'e': setSelectedTool('eraser'); break;
        }
        
        // Component shortcuts (1-9, 0)
        const componentIndex = '1234567890'.indexOf(e.key);
        if (componentIndex !== -1 && componentIndex < COMPONENT_TEMPLATES.length) {
          onComponentSelect(COMPONENT_TEMPLATES[componentIndex]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelected, showTextInput, handleUndo, handleRedo, onPendingComponentPlaced, onComponentSelect]);

  const clearCanvas = () => {
    saveToHistory([]);
    setElements([]);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  const tools: { id: ToolType; icon: React.ReactNode; label: string; shortcut: string }[] = [
    { id: 'select', icon: <Move className="w-4 h-4" />, label: 'Select', shortcut: 'V' },
    { id: 'pen', icon: <Pencil className="w-4 h-4" />, label: 'Pen', shortcut: 'P' },
    { id: 'rect', icon: <Square className="w-4 h-4" />, label: 'Rectangle', shortcut: 'R' },
    { id: 'ellipse', icon: <Circle className="w-4 h-4" />, label: 'Ellipse', shortcut: 'O' },
    { id: 'line', icon: <Minus className="w-4 h-4" />, label: 'Line', shortcut: 'L' },
    { id: 'arrow', icon: <ArrowRight className="w-4 h-4" />, label: 'Arrow', shortcut: 'A' },
    { id: 'text', icon: <Type className="w-4 h-4" />, label: 'Text', shortcut: 'T' },
    { id: 'eraser', icon: <Trash2 className="w-4 h-4" />, label: 'Eraser', shortcut: 'E' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Main Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-800 border-b border-white/10">
        {/* Drawing Tools */}
        <div className="flex items-center gap-0.5 border-r border-white/10 pr-2">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={`p-1.5 rounded transition-colors ${
                selectedTool === tool.id 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-300 hover:bg-white/10'
              }`}
              title={`${tool.label} (${tool.shortcut})`}
            >
              {tool.icon}
            </button>
          ))}
        </div>

        {/* Color Palette */}
        <div className="flex items-center gap-0.5 border-r border-white/10 pr-2">
          {COLOR_PALETTE.map(color => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                selectedColor === color ? 'border-white scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>

        {/* Stroke Width */}
        <div className="flex items-center gap-1 border-r border-white/10 pr-2">
          <span className="text-xs text-slate-400">Width:</span>
          <select
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="bg-slate-700 text-white text-xs rounded px-1 py-0.5 border border-white/10"
          >
            <option value={1}>1px</option>
            <option value={2}>2px</option>
            <option value={3}>3px</option>
            <option value={4}>4px</option>
            <option value={6}>6px</option>
            <option value={8}>8px</option>
          </select>
        </div>

        {/* Line Style */}
        <div className="flex items-center gap-1 border-r border-white/10 pr-2">
          <span className="text-xs text-slate-400">Style:</span>
          <div className="flex gap-0.5">
            {(['solid', 'dashed', 'dotted'] as LineStyle[]).map(style => (
              <button
                key={style}
                onClick={() => setLineStyle(style)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  lineStyle === style 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:bg-white/10'
                }`}
                title={style}
              >
                {style === 'solid' && '—'}
                {style === 'dashed' && '- -'}
                {style === 'dotted' && '···'}
              </button>
            ))}
          </div>
        </div>

        {/* Undo/Redo */}
        <div className="flex items-center gap-0.5 border-r border-white/10 pr-2">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-1.5 rounded text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1.5 rounded text-slate-300 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5 border-r border-white/10 pr-2">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= 0.5}
            className="p-1.5 rounded text-slate-300 hover:bg-white/10 disabled:opacity-30"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-300 min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={handleZoomIn}
            disabled={zoom >= 3}
            className="p-1.5 rounded text-slate-300 hover:bg-white/10 disabled:opacity-30"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Clear Button */}
        <button
          onClick={clearCanvas}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-400 hover:bg-red-500/20 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Clear All
        </button>
      </div>

      {/* Instruction banners for different modes */}
      {pendingComponent && (
        <div className="flex items-center justify-center gap-2 p-2 bg-cyan-500/20 border-b border-cyan-500/30">
          <span className="text-sm text-cyan-300 font-medium">
            👆 Click on the canvas to place: {pendingComponent.template.name}
          </span>
          <button
            onClick={onPendingComponentPlaced}
            className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-white/10"
          >
            Cancel
          </button>
        </div>
      )}
      
      {/* Text tool instruction */}
      {selectedTool === 'text' && !showTextInput && !pendingComponent && (
        <div className="flex items-center justify-center gap-2 p-2 bg-purple-500/20 border-b border-purple-500/30">
          <span className="text-sm text-purple-300 font-medium">
            📝 Click anywhere on the canvas to add text
          </span>
        </div>
      )}
      
      {/* Connection hint */}
      {!pendingComponent && selectedTool !== 'text' && (
        <div className="flex items-center justify-center gap-1 py-1 bg-slate-800/50 border-b border-white/5 text-xs text-slate-500">
          <span>💡 Drag from the cyan dots on components to create arrows</span>
        </div>
      )}

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 overflow-hidden relative bg-slate-900">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className={`absolute inset-0 ${
            pendingComponent ? 'cursor-copy' :
            isDragging ? 'cursor-grabbing' :
            isDrawingConnection ? 'cursor-crosshair' :
            hoveredHandle ? 'cursor-crosshair' :
            selectedTool === 'eraser' ? 'cursor-cell' : 
            selectedTool === 'text' ? 'cursor-text' : 
            selectedTool === 'select' ? 'cursor-grab' : 'cursor-crosshair'
          }`}
          style={{ width: '100%', height: '100%' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { setIsDrawing(false); setGhostPosition(null); }}
          onDoubleClick={(e) => {
            // Double-click to edit text elements (any tool)
            const pos = getMousePos(e);
            const clickedElement = getElementAtPosition(pos.x, pos.y);
            if (clickedElement && clickedElement.type === 'text') {
              const screenPos = getScreenPos(e);
              setTextInputPos({ x: clickedElement.x, y: clickedElement.y });
              setTextInputScreenPos(screenPos);
              setTextInputValue(clickedElement.text || '');
              setEditingTextId(clickedElement.id);
              setShowTextInput(true);
              setTimeout(() => textInputRef.current?.focus(), 50);
            }
          }}
        />
        
        {/* Text Input Overlay with backdrop */}
        {showTextInput && (
          <>
            {/* Invisible backdrop to catch clicks outside */}
            <div 
              className="absolute inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                handleTextSubmit(); // Submit on click outside
              }}
            />
            {/* Text input popup */}
            <div
              className="absolute z-50"
              style={{ left: textInputScreenPos.x, top: textInputScreenPos.y }}
              onClick={(e) => e.stopPropagation()} // Prevent backdrop click
            >
              <div className="bg-slate-800 rounded-lg shadow-xl border border-blue-500/50 p-3">
                <textarea
                  ref={textInputRef}
                  value={textInputValue}
                  onChange={(e) => setTextInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation(); // Prevent global keyboard shortcuts
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault(); // Prevent newline
                      handleTextSubmit();
                    }
                    if (e.key === 'Escape') handleTextCancel();
                  }}
                  className="bg-slate-700 text-white px-4 py-3 rounded border border-slate-600 outline-none text-sm 
                           w-[320px] min-h-[120px] resize focus:border-blue-500 leading-relaxed"
                  placeholder="Type your text here...&#10;Use Shift+Enter for new lines"
                  style={{ color: selectedColor }}
                  autoFocus
                  rows={5}
                />
                <div className="text-xs text-slate-500 mt-2 px-1 flex items-center justify-between">
                  <span>Enter to {editingTextId ? 'save' : 'add'} • Shift+Enter newline • Drag corner to resize</span>
                  <button 
                    onClick={handleTextSubmit}
                    className="text-blue-400 hover:text-blue-300 px-3 py-1 bg-blue-500/10 rounded"
                  >
                    {editingTextId ? 'Save' : 'Add'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const SystemDesignWhiteboard: React.FC<SystemDesignWhiteboardProps> = ({
  isOpen,
  onClose,
  question,
  onSubmit,
  mode = 'system-design',
  initialElements = [],
  canvasName: initialCanvasName = '',
  onSave,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>(initialElements);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['requirements']));
  const [currentHintIndex, setCurrentHintIndex] = useState(-1);
  
  // Sandbox mode state
  const [canvasName, setCanvasName] = useState(initialCanvasName);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Pending component for drag-and-drop placement
  const [pendingComponent, setPendingComponent] = useState<PendingComponent | null>(null);
  
  // Reset elements when initialElements change (for loading saved canvases)
  useEffect(() => {
    if (initialElements.length > 0) {
      setCanvasElements(initialElements);
    }
  }, [initialElements]);

  // Handle component selection from sidebar
  const handleComponentSelect = useCallback((template: ComponentTemplate) => {
    setPendingComponent({ template, x: 0, y: 0 });
  }, []);

  // Clear pending component (after placement or cancel)
  const handlePendingComponentPlaced = useCallback(() => {
    setPendingComponent(null);
  }, []);

  // Timer effect
  useEffect(() => {
    if (!isOpen) return;

    setElapsedTime(0);
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  // Format elapsed time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get next hint
  const handleGetHint = useCallback(() => {
    if (question?.hints && currentHintIndex < question.hints.length - 1) {
      setCurrentHintIndex(prev => prev + 1);
    }
  }, [question?.hints, currentHintIndex]);

  // Handle save (sandbox mode)
  const handleSave = useCallback(async () => {
    if (!onSave) return;
    
    const name = canvasName.trim() || `Canvas ${new Date().toLocaleDateString()}`;
    setIsSaving(true);
    try {
      await onSave(canvasElements, name);
      setShowSaveDialog(false);
    } finally {
      setIsSaving(false);
    }
  }, [canvasElements, canvasName, onSave]);

  // Handle close - save state for system-design mode before closing
  const handleClose = useCallback(() => {
    // For system-design mode, auto-save elements so user can resume
    if (mode === 'system-design' && onSave && canvasElements.length > 0) {
      onSave(canvasElements, question?.title || 'design');
    }
    onClose();
  }, [mode, onSave, canvasElements, onClose, question?.title]);

  // Export canvas to image
  const exportToImage = useCallback(async (): Promise<string> => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return '';

    return canvas.toDataURL('image/png').split(',')[1]; // Return base64 without prefix
  }, []);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);

    try {
      const imageBase64 = await exportToImage();

      // Extract text annotations from elements
      const textAnnotations = canvasElements
        .filter(el => el.text)
        .map(el => el.text as string);

      const submission: DiagramSubmission = {
        imageBase64,
        jsonData: JSON.stringify({ elements: canvasElements }),
        textAnnotations,
        elapsedTime,
      };

      onSubmit?.(submission);
    } finally {
      setIsSubmitting(false);
    }
  }, [canvasElements, elapsedTime, exportToImage, onSubmit]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-xl border border-white/10 w-full max-w-7xl h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-800/50">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${mode === 'sandbox' ? 'bg-purple-500/20' : 'bg-cyan-500/20'}`}>
              <Layers className={`w-5 h-5 ${mode === 'sandbox' ? 'text-purple-400' : 'text-cyan-400'}`} />
            </div>
            <div>
              {mode === 'sandbox' ? (
                <>
                  <h2 className="text-lg font-semibold text-white">
                    {canvasName || 'Untitled Canvas'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Free drawing canvas • Auto-saved to browser</p>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-white">{question?.title}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    {question?.category && (
                      <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">
                        {question.category}
                      </span>
                    )}
                    <span className="text-xs text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(elapsedTime)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Save button for sandbox mode */}
            {mode === 'sandbox' && onSave && (
              <button
                onClick={() => setShowSaveDialog(true)}
                className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors text-sm font-medium"
              >
                <HardDrive className="w-4 h-4" />
                Save
              </button>
            )}
            
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close whiteboard"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Question Details (system-design) or Instructions (sandbox) */}
          <div className="w-80 border-r border-white/10 overflow-y-auto p-4 space-y-4">
            {mode === 'sandbox' ? (
              /* Sandbox mode - simple instructions */
              <>
                <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
                  <h3 className="text-sm font-semibold text-purple-300 mb-2">🎨 Free Canvas</h3>
                  <p className="text-xs text-slate-400">
                    Use this canvas to sketch diagrams, architecture, or any visual ideas.
                  </p>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">Quick Tips</h4>
                  <ul className="space-y-2 text-xs text-slate-400">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400">•</span>
                      Use number keys <kbd className="bg-slate-700 px-1 rounded">1-0</kbd> for quick component placement
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400">•</span>
                      Hover component handles to see suggested connections
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400">•</span>
                      Press <kbd className="bg-slate-700 px-1 rounded">T</kbd> for text tool
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-400">•</span>
                      <kbd className="bg-slate-700 px-1 rounded">Ctrl+Z</kbd> to undo
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              /* System-design mode - question details */
              <>
                {/* Description */}
                <div className="bg-white/5 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('description')}
                    className="w-full flex items-center justify-between p-3 hover:bg-white/5"
                  >
                    <span className="text-sm font-medium text-slate-300">Description</span>
                    {expandedSections.has('description') ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  {expandedSections.has('description') && (
                    <div className="p-3 pt-0">
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">
                        {question?.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Requirements */}
                <div className="bg-white/5 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('requirements')}
                    className="w-full flex items-center justify-between p-3 hover:bg-white/5"
                  >
                    <span className="text-sm font-medium text-slate-300">
                      Requirements ({question?.requirements?.length || 0})
                    </span>
                    {expandedSections.has('requirements') ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                  {expandedSections.has('requirements') && (
                    <div className="p-3 pt-0">
                      <ul className="space-y-2">
                        {question?.requirements?.map((req, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                            <span className="text-cyan-400 font-bold">{idx + 1}.</span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Constraints */}
                {question?.constraints && question.constraints.length > 0 && (
                  <div className="bg-white/5 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection('constraints')}
                      className="w-full flex items-center justify-between p-3 hover:bg-white/5"
                    >
                      <span className="text-sm font-medium text-slate-300">
                        Constraints ({question.constraints.length})
                      </span>
                      {expandedSections.has('constraints') ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    {expandedSections.has('constraints') && (
                      <div className="p-3 pt-0">
                        <ul className="space-y-2">
                          {question.constraints.map((constraint, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-orange-300">
                              <span className="text-orange-400">⚡</span>
                              {constraint}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Hints */}
                {question?.hints && question.hints.length > 0 && (
                  <div className="bg-white/5 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection('hints')}
                      className="w-full flex items-center justify-between p-3 hover:bg-white/5"
                    >
                      <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        💡 Hints
                        {currentHintIndex >= 0 && (
                          <span className="text-xs text-slate-500">
                            ({currentHintIndex + 1}/{question.hints.length})
                          </span>
                        )}
                      </span>
                      {expandedSections.has('hints') ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    {expandedSections.has('hints') && (
                      <div className="p-3 pt-0 space-y-2">
                        {currentHintIndex >= 0 ? (
                          question.hints.slice(0, currentHintIndex + 1).map((hint, idx) => (
                            <div key={idx} className="text-sm text-yellow-200/80 bg-yellow-500/10 p-2 rounded">
                              💡 {hint}
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500">Click button below to reveal hints</p>
                    )}
                    {currentHintIndex < question.hints.length - 1 && (
                      <button
                        onClick={handleGetHint}
                        className="w-full px-3 py-2 bg-yellow-500/20 text-yellow-300 text-sm rounded-lg
                                 hover:bg-yellow-500/30 transition-colors"
                      >
                        {currentHintIndex < 0 ? 'Get First Hint' : 'Get Next Hint'}
                      </button>
                    )}
                  </div>
                )}
              </div>
                )}
              </>
            )}

            {/* Component Palette - Drag to Canvas (shown in both modes) */}
            <div className="bg-white/5 rounded-lg p-3">
              <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                🧩 Components
                <span className="text-xs text-slate-500 font-normal">(Click to place)</span>
              </h4>
              <div className="grid grid-cols-1 gap-1.5">
                {COMPONENT_TEMPLATES.map(template => (
                  <button
                    key={template.name}
                    onClick={() => handleComponentSelect(template)}
                    className={`flex items-center gap-2 text-xs p-2 rounded transition-all hover:bg-white/10 border ${
                      pendingComponent?.template.name === template.name
                        ? 'border-cyan-400 bg-cyan-500/20'
                        : 'border-transparent'
                    }`}
                    title={`${template.description} (${template.shortcut})`}
                  >
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center text-white"
                      style={{ backgroundColor: template.color }}
                    >
                      {template.icon}
                    </div>
                    <span className="text-slate-300 flex-1">{template.name}</span>
                    <span className="text-slate-500 text-[10px] bg-white/10 px-1 rounded">{template.shortcut}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Whiteboard */}
          <div className="flex-1 flex flex-col">
            <SimpleCanvas 
              onElementsChange={setCanvasElements}
              pendingComponent={pendingComponent}
              onPendingComponentPlaced={handlePendingComponentPlaced}
              onComponentSelect={handleComponentSelect}
            />

            {/* Actions */}
            <div className="border-t border-white/10 bg-slate-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>Components: {canvasElements.filter(e => e.type === 'rect' || e.type === 'component').length}</span>
                <span>•</span>
                <span>Connections: {canvasElements.filter(e => e.type === 'arrow').length}</span>
                <span>•</span>
                <span>Text: {canvasElements.filter(e => e.type === 'text').length}</span>
              </div>

              <div className="flex items-center gap-2">
                {mode === 'system-design' && onSubmit && (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || canvasElements.length === 0}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white text-sm rounded-lg
                             hover:bg-green-500 transition-colors disabled:opacity-50 font-medium"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Submit Design
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Save Dialog (sandbox mode) */}
        {showSaveDialog && mode === 'sandbox' && (
          <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center">
            <div className="bg-slate-800 rounded-xl border border-white/10 p-6 w-96 shadow-2xl">
              <h3 className="text-lg font-semibold text-white mb-4">Save Canvas</h3>
              <input
                type="text"
                value={canvasName}
                onChange={(e) => setCanvasName(e.target.value)}
                placeholder="Enter canvas name..."
                className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg border border-slate-600 
                         focus:border-purple-500 focus:outline-none mb-4"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white 
                           rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardDrive className="w-4 h-4" />}
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Export types for external use
export type { CanvasElement };

export default SystemDesignWhiteboard;

