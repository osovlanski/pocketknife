/**
 * MarkdownContent Component
 * 
 * Beautiful markdown renderer with syntax highlighting, agent tag detection,
 * and responsive styling. Designed for chat interfaces.
 */

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { extractAgentTags, AgentTagBadge, type AgentTagConfig } from './AgentTags';
import styles from '../../styles/markdown.module.css';

// =============================================================================
// TYPES
// =============================================================================

interface MarkdownContentProps {
  content: string;
  className?: string;
  showAgentTags?: boolean;
  onTagClick?: (tag: AgentTagConfig) => void;
}

// =============================================================================
// CODE BLOCK COMPONENT
// =============================================================================

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        <span className={styles.codeLanguage}>{language || 'code'}</span>
        <button 
          onClick={handleCopy} 
          className={styles.copyButton}
          aria-label="Copy code"
          tabIndex={0}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language || 'text'}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: '0 0 0.5rem 0.5rem',
          fontSize: '0.875rem',
          padding: '1rem'
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

// =============================================================================
// INLINE CODE COMPONENT
// =============================================================================

const InlineCode: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <code className={styles.inlineCode}>{children}</code>;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const MarkdownContent: React.FC<MarkdownContentProps> = ({
  content,
  className = '',
  showAgentTags = true,
  onTagClick
}) => {
  // Extract agent tags from content
  const agentTags = useMemo(() => {
    if (!showAgentTags) return [];
    return extractAgentTags(content);
  }, [content, showAgentTags]);

  // Process content to highlight hashtags
  const processedContent = useMemo(() => {
    // Replace hashtags with styled spans (we'll handle this in rendering)
    return content;
  }, [content]);

  return (
    <div className={`${styles.markdownContent} ${className}`}>
      {/* Agent Tags Banner */}
      {agentTags.length > 0 && (
        <div className={styles.tagsBanner}>
          {agentTags.map((tag) => (
            <AgentTagBadge 
              key={tag.agentId} 
              tag={tag} 
              onClick={onTagClick ? () => onTagClick(tag) : undefined}
            />
          ))}
        </div>
      )}

      {/* Markdown Content */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => <h1 className={styles.h1}>{children}</h1>,
          h2: ({ children }) => <h2 className={styles.h2}>{children}</h2>,
          h3: ({ children }) => <h3 className={styles.h3}>{children}</h3>,
          h4: ({ children }) => <h4 className={styles.h4}>{children}</h4>,
          
          // Paragraphs
          p: ({ children }) => <p className={styles.paragraph}>{children}</p>,
          
          // Lists
          ul: ({ children }) => <ul className={styles.ul}>{children}</ul>,
          ol: ({ children }) => <ol className={styles.ol}>{children}</ol>,
          li: ({ children }) => <li className={styles.li}>{children}</li>,
          
          // Code
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && !className;
            
            if (isInline) {
              return <InlineCode>{children}</InlineCode>;
            }
            
            return (
              <CodeBlock
                language={match ? match[1] : ''}
                code={String(children).replace(/\n$/, '')}
              />
            );
          },
          
          // Pre (code block wrapper)
          pre: ({ children }) => <>{children}</>,
          
          // Links
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.link}
            >
              {children}
              <ExternalLink size={12} className={styles.linkIcon} />
            </a>
          ),
          
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className={styles.blockquote}>{children}</blockquote>
          ),
          
          // Tables
          table: ({ children }) => (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className={styles.thead}>{children}</thead>,
          tbody: ({ children }) => <tbody className={styles.tbody}>{children}</tbody>,
          tr: ({ children }) => <tr className={styles.tr}>{children}</tr>,
          th: ({ children }) => <th className={styles.th}>{children}</th>,
          td: ({ children }) => <td className={styles.td}>{children}</td>,
          
          // Horizontal rule
          hr: () => <hr className={styles.hr} />,
          
          // Strong and emphasis
          strong: ({ children }) => <strong className={styles.strong}>{children}</strong>,
          em: ({ children }) => <em className={styles.em}>{children}</em>,
          
          // Images
          img: ({ src, alt }) => (
            <img src={src} alt={alt} className={styles.image} loading="lazy" />
          )
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownContent;
