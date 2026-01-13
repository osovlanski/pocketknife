/**
 * MarkdownRenderer Component
 * 
 * Renders markdown content with support for:
 * - Mermaid diagrams (rendered as SVG)
 * - Code blocks with syntax highlighting
 * - Basic markdown formatting
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';

// Initialize mermaid with theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit',
  flowchart: {
    htmlLabels: true,
    curve: 'basis'
  },
  themeVariables: {
    primaryColor: '#8b5cf6',
    primaryTextColor: '#fff',
    primaryBorderColor: '#6366f1',
    lineColor: '#94a3b8',
    secondaryColor: '#1e293b',
    tertiaryColor: '#0f172a',
    background: '#1e1b4b',
    mainBkg: '#1e293b',
    nodeBorder: '#6366f1',
    clusterBkg: '#1e293b',
    titleColor: '#f8fafc',
    edgeLabelBackground: '#1e293b'
  }
});

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

interface ParsedBlock {
  type: 'text' | 'mermaid' | 'code';
  content: string;
  language?: string;
}

const MermaidDiagram: React.FC<{ code: string; id: string }> = ({ code, id }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current) return;

      try {
        // Clear previous content
        setError(null);
        
        // Render the mermaid diagram
        const { svg: renderedSvg } = await mermaid.render(`mermaid-${id}`, code.trim());
        setSvg(renderedSvg);
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        setError(err.message || 'Failed to render diagram');
      }
    };

    renderDiagram();
  }, [code, id]);

  if (error) {
    return (
      <div style={{
        padding: '1rem',
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '0.5rem',
        color: '#fca5a5',
        fontSize: '0.875rem'
      }}>
        <strong>Diagram Error:</strong> {error}
        <pre style={{ 
          marginTop: '0.5rem', 
          fontSize: '0.75rem',
          whiteSpace: 'pre-wrap',
          color: '#94a3b8'
        }}>
          {code}
        </pre>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(30, 41, 59, 0.5)',
        borderRadius: '0.75rem',
        margin: '1rem 0',
        overflow: 'auto'
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div style={{
      position: 'relative',
      margin: '1rem 0',
      borderRadius: '0.75rem',
      overflow: 'hidden',
      background: 'rgba(15, 23, 42, 0.8)',
      border: '1px solid rgba(71, 85, 105, 0.3)'
    }}>
      {language && (
        <div style={{
          padding: '0.5rem 1rem',
          background: 'rgba(71, 85, 105, 0.3)',
          fontSize: '0.75rem',
          color: '#94a3b8',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{language}</span>
          <button
            onClick={handleCopy}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '0.75rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(71, 85, 105, 0.5)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      )}
      <pre style={{
        margin: 0,
        padding: '1rem',
        overflow: 'auto',
        fontSize: '0.875rem',
        lineHeight: 1.6
      }}>
        <code style={{ color: '#e2e8f0' }}>{code}</code>
      </pre>
    </div>
  );
};

const parseContent = (content: string): ParsedBlock[] => {
  const blocks: ParsedBlock[] = [];
  
  // Regex to match code blocks (```language\n...\n```)
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
  
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before this code block
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index).trim();
      if (textBefore) {
        blocks.push({ type: 'text', content: textBefore });
      }
    }

    const language = match[1].toLowerCase();
    const code = match[2];

    if (language === 'mermaid') {
      blocks.push({ type: 'mermaid', content: code });
    } else {
      blocks.push({ type: 'code', content: code, language: language || undefined });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last code block
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex).trim();
    if (remainingText) {
      blocks.push({ type: 'text', content: remainingText });
    }
  }

  // If no code blocks found, return the whole content as text
  if (blocks.length === 0) {
    blocks.push({ type: 'text', content: content });
  }

  return blocks;
};

const formatText = (text: string): React.ReactNode => {
  // Split by newlines and process each line
  return text.split('\n').map((line, i) => {
    // Handle headers
    if (line.startsWith('#### ')) {
      return <h4 key={i} style={{ margin: '1rem 0 0.5rem', color: '#f8fafc', fontSize: '1rem', fontWeight: 600 }}>{line.slice(5)}</h4>;
    }
    if (line.startsWith('### ')) {
      return <h3 key={i} style={{ margin: '1rem 0 0.5rem', color: '#f8fafc', fontSize: '1.125rem', fontWeight: 600 }}>{line.slice(4)}</h3>;
    }
    if (line.startsWith('## ')) {
      return <h2 key={i} style={{ margin: '1rem 0 0.5rem', color: '#f8fafc', fontSize: '1.25rem', fontWeight: 600 }}>{line.slice(3)}</h2>;
    }
    if (line.startsWith('# ')) {
      return <h1 key={i} style={{ margin: '1rem 0 0.5rem', color: '#f8fafc', fontSize: '1.5rem', fontWeight: 700 }}>{line.slice(2)}</h1>;
    }
    
    // Handle bullet points
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span style={{ color: '#8b5cf6' }}>•</span>
          <span>{formatInlineText(line.slice(2))}</span>
        </div>
      );
    }
    
    // Handle numbered lists
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)/);
    if (numberedMatch) {
      return (
        <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <span style={{ color: '#8b5cf6', minWidth: '1.5rem' }}>{numberedMatch[1]}.</span>
          <span>{formatInlineText(numberedMatch[2])}</span>
        </div>
      );
    }
    
    // Empty line = paragraph break
    if (!line.trim()) {
      return <div key={i} style={{ height: '0.5rem' }} />;
    }
    
    // Regular text
    return <p key={i} style={{ margin: '0.25rem 0' }}>{formatInlineText(line)}</p>;
  });
};

const formatInlineText = (text: string): React.ReactNode => {
  // Handle bold (**text**)
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: '#f8fafc' }}>{part.slice(2, -2)}</strong>;
    }
    // Handle inline code (`code`)
    const codeParts = part.split(/(`[^`]+`)/g);
    return codeParts.map((codePart, j) => {
      if (codePart.startsWith('`') && codePart.endsWith('`')) {
        return (
          <code 
            key={`${i}-${j}`}
            style={{ 
              background: 'rgba(139, 92, 246, 0.2)',
              padding: '0.125rem 0.375rem',
              borderRadius: '0.25rem',
              fontSize: '0.875em',
              color: '#c4b5fd'
            }}
          >
            {codePart.slice(1, -1)}
          </code>
        );
      }
      return codePart;
    });
  });
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  const blocks = parseContent(content);
  const diagramIdRef = useRef(0);

  return (
    <div className={className} style={{ color: '#cbd5e1', lineHeight: 1.7 }}>
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'mermaid':
            diagramIdRef.current += 1;
            return <MermaidDiagram key={index} code={block.content} id={`${diagramIdRef.current}`} />;
          
          case 'code':
            return <CodeBlock key={index} code={block.content} language={block.language} />;
          
          case 'text':
          default:
            return <div key={index}>{formatText(block.content)}</div>;
        }
      })}
    </div>
  );
};

export default MarkdownRenderer;



