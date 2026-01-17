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
  Circle
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

export interface SystemDesignWhiteboardProps {
  isOpen: boolean;
  onClose: () => void;
  question: SystemDesignQuestion;
  onSubmit: (result: DiagramSubmission) => void;
}

// =============================================================================
// COMPONENT TEMPLATES
// =============================================================================

interface ComponentTemplate {
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const COMPONENT_TEMPLATES: ComponentTemplate[] = [
  { name: 'Load Balancer', icon: <Network className="w-4 h-4" />, color: '#22c55e', description: 'Distributes traffic' },
  { name: 'Web Server', icon: <Globe className="w-4 h-4" />, color: '#3b82f6', description: 'Handles HTTP requests' },
  { name: 'API Gateway', icon: <Shield className="w-4 h-4" />, color: '#a855f7', description: 'API routing & auth' },
  { name: 'Database', icon: <Database className="w-4 h-4" />, color: '#f59e0b', description: 'Data storage' },
  { name: 'Cache', icon: <Cpu className="w-4 h-4" />, color: '#ef4444', description: 'Redis/Memcached' },
  { name: 'Message Queue', icon: <MessageSquare className="w-4 h-4" />, color: '#06b6d4', description: 'Kafka/RabbitMQ' },
  { name: 'CDN', icon: <Cloud className="w-4 h-4" />, color: '#8b5cf6', description: 'Content delivery' },
  { name: 'Storage', icon: <HardDrive className="w-4 h-4" />, color: '#64748b', description: 'S3/Blob storage' },
  { name: 'Microservice', icon: <Server className="w-4 h-4" />, color: '#10b981', description: 'Service container' },
  { name: 'Worker', icon: <Layers className="w-4 h-4" />, color: '#f97316', description: 'Background jobs' },
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
  type: 'rect' | 'ellipse' | 'text' | 'arrow' | 'line' | 'path';
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
}

const SimpleCanvas: React.FC<{
  onElementsChange: (elements: CanvasElement[]) => void;
}> = ({ onElementsChange }) => {
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
  const textInputRef = useRef<HTMLInputElement>(null);

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
        ctx.fillText(el.text || '', el.x, el.y);
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

    ctx.restore();
    onElementsChange(elements);
  }, [elements, onElementsChange, canvasSize, zoom, isDrawing, currentPath, selectedTool, selectedColor, strokeWidth]);

  // Get accurate mouse position on canvas
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

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getMousePos(e);
    
    if (selectedTool === 'text') {
      setTextInputPos(pos);
      setTextInputValue('');
      setShowTextInput(true);
      setTimeout(() => textInputRef.current?.focus(), 10);
      return;
    }
    
    if (selectedTool === 'pen') {
      setCurrentPath([pos]);
    }
    
    setStartPos(pos);
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    
    if (selectedTool === 'pen') {
      const pos = getMousePos(e);
      setCurrentPath(prev => [...prev, pos]);
    } else if (selectedTool === 'eraser') {
      const pos = getMousePos(e);
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
    setShowTextInput(false);
    setTextInputValue('');
  };

  const addComponent = (template: ComponentTemplate) => {
    const newElement: CanvasElement = {
      id: `el-${Date.now()}`,
      type: 'rect',
      x: 100 + Math.random() * 400,
      y: 100 + Math.random() * 300,
      width: 130,
      height: 70,
      color: template.color,
      strokeColor: '#fff',
      strokeWidth: 2,
      text: template.name,
      fontSize: 13
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    saveToHistory(newElements);
  };

  const clearCanvas = () => {
    saveToHistory([]);
    setElements([]);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  const tools: { id: ToolType; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <Move className="w-4 h-4" />, label: 'Select' },
    { id: 'pen', icon: <Pencil className="w-4 h-4" />, label: 'Pen' },
    { id: 'rect', icon: <Square className="w-4 h-4" />, label: 'Rectangle' },
    { id: 'ellipse', icon: <Circle className="w-4 h-4" />, label: 'Ellipse' },
    { id: 'line', icon: <Minus className="w-4 h-4" />, label: 'Line' },
    { id: 'arrow', icon: <ArrowRight className="w-4 h-4" />, label: 'Arrow' },
    { id: 'text', icon: <Type className="w-4 h-4" />, label: 'Text' },
    { id: 'eraser', icon: <Trash2 className="w-4 h-4" />, label: 'Eraser' },
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
              title={tool.label}
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

      {/* Component Templates Bar */}
      <div className="flex items-center gap-1 p-2 bg-slate-900/50 border-b border-white/5 overflow-x-auto">
        <span className="text-xs text-slate-500 mr-2 whitespace-nowrap">Components:</span>
        {COMPONENT_TEMPLATES.map(template => (
          <button
            key={template.name}
            onClick={() => addComponent(template)}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-white/10 transition-colors whitespace-nowrap border border-white/5"
            style={{ color: template.color }}
            title={template.description}
          >
            {template.icon}
            <span>{template.name}</span>
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 overflow-hidden relative bg-slate-900">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className={`absolute inset-0 ${
            selectedTool === 'eraser' ? 'cursor-cell' : 
            selectedTool === 'text' ? 'cursor-text' : 
            selectedTool === 'select' ? 'cursor-move' : 'cursor-crosshair'
          }`}
          style={{ width: '100%', height: '100%' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => setIsDrawing(false)}
        />
        
        {/* Text Input Overlay */}
        {showTextInput && (
          <div
            className="absolute"
            style={{ left: textInputPos.x * zoom, top: textInputPos.y * zoom }}
          >
            <input
              ref={textInputRef}
              type="text"
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTextSubmit();
                if (e.key === 'Escape') setShowTextInput(false);
              }}
              onBlur={handleTextSubmit}
              className="bg-slate-700 text-white px-2 py-1 rounded border border-blue-500 outline-none text-sm min-w-[150px]"
              placeholder="Type text..."
              style={{ color: selectedColor }}
              autoFocus
            />
          </div>
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
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [canvasElements, setCanvasElements] = useState<CanvasElement[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['requirements']));
  const [currentHintIndex, setCurrentHintIndex] = useState(-1);

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
    if (question.hints && currentHintIndex < question.hints.length - 1) {
      setCurrentHintIndex(prev => prev + 1);
    }
  }, [question.hints, currentHintIndex]);

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

      onSubmit(submission);
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
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <Layers className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{question.title}</h2>
              <div className="flex items-center gap-3 mt-1">
                {question.category && (
                  <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">
                    {question.category}
                  </span>
                )}
                <span className="text-xs text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(elapsedTime)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close whiteboard"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Question Details */}
          <div className="w-80 border-r border-white/10 overflow-y-auto p-4 space-y-4">
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
                    {question.description}
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
                  Requirements ({question.requirements.length})
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
                    {question.requirements.map((req, idx) => (
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
            {question.constraints && question.constraints.length > 0 && (
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
            {question.hints && question.hints.length > 0 && (
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

            {/* Component Legend */}
            <div className="bg-white/5 rounded-lg p-3">
              <h4 className="text-sm font-medium text-slate-300 mb-2">Component Legend</h4>
              <div className="grid grid-cols-2 gap-2">
                {COMPONENT_TEMPLATES.map(template => (
                  <div key={template.name} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: template.color }}
                    />
                    <span className="text-slate-400">{template.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Whiteboard */}
          <div className="flex-1 flex flex-col">
            <SimpleCanvas onElementsChange={setCanvasElements} />

            {/* Actions */}
            <div className="border-t border-white/10 bg-slate-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>Components: {canvasElements.filter(e => e.type === 'rect').length}</span>
                <span>•</span>
                <span>Connections: {canvasElements.filter(e => e.type === 'arrow').length}</span>
              </div>

              <div className="flex items-center gap-2">
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemDesignWhiteboard;

