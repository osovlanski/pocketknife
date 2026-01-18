/**
 * Canvas Tool
 * 
 * A standalone drawing canvas for sketching diagrams, architecture, and visual ideas.
 * Uses the same canvas component as SystemDesignWhiteboard but in sandbox mode.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Folder, 
  Trash2, 
  Loader2,
  Layers,
  Clock,
  FolderOpen
} from 'lucide-react';
import SystemDesignWhiteboard, { 
  type CanvasElement 
} from './shared/SystemDesignWhiteboard';

// =============================================================================
// TYPES
// =============================================================================

interface SavedCanvas {
  id: string;
  name: string;
  elements: CanvasElement[];
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// LOCAL STORAGE HELPERS
// =============================================================================

const STORAGE_KEY = 'pocketknife_canvases';

const loadCanvasesFromStorage = (): SavedCanvas[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveCanvasesToStorage = (canvases: SavedCanvas[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(canvases));
  } catch (error) {
    console.error('Failed to save canvases to storage:', error);
  }
};

// =============================================================================
// COMPONENT
// =============================================================================

const CanvasTool: React.FC = () => {
  // State
  const [savedCanvases, setSavedCanvases] = useState<SavedCanvas[]>([]);
  const [selectedCanvasId, setSelectedCanvasId] = useState<string | null>(null);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [currentElements, setCurrentElements] = useState<CanvasElement[]>([]);
  const [currentName, setCurrentName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Load canvases on mount
  useEffect(() => {
    const canvases = loadCanvasesFromStorage();
    setSavedCanvases(canvases);
  }, []);

  // Create new canvas
  const handleNewCanvas = useCallback(() => {
    setSelectedCanvasId(null);
    setCurrentElements([]);
    setCurrentName('');
    setIsWhiteboardOpen(true);
  }, []);

  // Open existing canvas
  const handleOpenCanvas = useCallback((canvas: SavedCanvas) => {
    setSelectedCanvasId(canvas.id);
    setCurrentElements(canvas.elements);
    setCurrentName(canvas.name);
    setIsWhiteboardOpen(true);
  }, []);

  // Save canvas
  const handleSaveCanvas = useCallback((elements: CanvasElement[], name: string) => {
    const now = new Date().toISOString();
    
    if (selectedCanvasId) {
      // Update existing
      const updated = savedCanvases.map(c => 
        c.id === selectedCanvasId 
          ? { ...c, elements, name, updatedAt: now }
          : c
      );
      setSavedCanvases(updated);
      saveCanvasesToStorage(updated);
    } else {
      // Create new
      const newCanvas: SavedCanvas = {
        id: `canvas-${Date.now()}`,
        name,
        elements,
        createdAt: now,
        updatedAt: now
      };
      const updated = [newCanvas, ...savedCanvases];
      setSavedCanvases(updated);
      saveCanvasesToStorage(updated);
      setSelectedCanvasId(newCanvas.id);
    }
    
    setIsWhiteboardOpen(false);
  }, [savedCanvases, selectedCanvasId]);

  // Delete canvas
  const handleDeleteCanvas = useCallback((id: string) => {
    const updated = savedCanvases.filter(c => c.id !== id);
    setSavedCanvases(updated);
    saveCanvasesToStorage(updated);
    setShowDeleteConfirm(null);
  }, [savedCanvases]);

  // Close whiteboard
  const handleClose = useCallback(() => {
    setIsWhiteboardOpen(false);
  }, []);

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-[80vh]">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
            <Layers className="w-8 h-8 text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
          Canvas Tool
        </h1>
        <p className="text-slate-400 mt-2">
          Create and manage visual diagrams, architecture sketches, and ideas
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-center mb-8">
        <button
          onClick={handleNewCanvas}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 
                   text-white rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all
                   shadow-lg shadow-purple-500/25 font-medium"
        >
          <Plus className="w-5 h-5" />
          New Canvas
        </button>
      </div>

      {/* Saved Canvases Grid */}
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Folder className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-200">
            Saved Canvases ({savedCanvases.length})
          </h2>
        </div>

        {savedCanvases.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl border border-white/10 p-12 text-center">
            <FolderOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">No saved canvases yet</h3>
            <p className="text-slate-500 mb-6">
              Create your first canvas to start drawing diagrams and ideas
            </p>
            <button
              onClick={handleNewCanvas}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600/20 text-purple-300
                       rounded-lg hover:bg-purple-600/30 transition-colors border border-purple-500/30"
            >
              <Plus className="w-4 h-4" />
              Create Canvas
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedCanvases.map(canvas => (
              <div
                key={canvas.id}
                className="group bg-slate-800/50 rounded-xl border border-white/10 overflow-hidden
                         hover:border-purple-500/50 transition-all cursor-pointer"
              >
                {/* Preview placeholder */}
                <div 
                  onClick={() => handleOpenCanvas(canvas)}
                  className="h-32 bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center"
                >
                  <div className="text-center">
                    <Layers className="w-8 h-8 text-purple-400/50 mx-auto mb-2" />
                    <span className="text-xs text-slate-500">
                      {canvas.elements.length} elements
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 
                    onClick={() => handleOpenCanvas(canvas)}
                    className="font-medium text-slate-200 truncate hover:text-purple-300 transition-colors"
                  >
                    {canvas.name}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(canvas.updatedAt)}
                  </div>
                </div>

                {/* Actions */}
                <div className="px-4 pb-4 flex gap-2">
                  <button
                    onClick={() => handleOpenCanvas(canvas)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 
                             bg-purple-600/20 text-purple-300 rounded-lg text-sm
                             hover:bg-purple-600/30 transition-colors"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Open
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(canvas.id)}
                    className="px-3 py-2 bg-red-500/10 text-red-400 rounded-lg
                             hover:bg-red-500/20 transition-colors"
                    title="Delete canvas"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Delete confirmation */}
                {showDeleteConfirm === canvas.id && (
                  <div className="px-4 pb-4 pt-2 border-t border-white/5">
                    <p className="text-xs text-slate-400 mb-2">Delete this canvas?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="flex-1 px-3 py-1.5 bg-slate-700 text-slate-300 rounded text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDeleteCanvas(canvas.id)}
                        className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Whiteboard Modal */}
      <SystemDesignWhiteboard
        isOpen={isWhiteboardOpen}
        onClose={handleClose}
        mode="sandbox"
        initialElements={currentElements}
        canvasName={currentName}
        onSave={handleSaveCanvas}
      />
    </div>
  );
};

export default CanvasTool;

