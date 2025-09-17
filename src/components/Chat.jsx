import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

import CopyIcon from "./icons/CopyIcon";
import PencilIcon from "./icons/PencilIcon";
import ThinkBlock from "./ThinkBlock";
import { AVAILABLE_MODELS } from "./ModelSelector";

import "./Chat.css";
import { useEffect, useMemo, useState } from "react";

// Utility functions for parsing think blocks
function parseThinkBlocks(content) {
  const parts = [];
  let currentIndex = 0;
  
  // Find all think blocks
  const thinkRegex = /<think>[\s\S]*?(<\/think>|$)/g;
  let match;
  
  while ((match = thinkRegex.exec(content)) !== null) {
    // Add content before this think block
    if (match.index > currentIndex) {
      const beforeContent = content.slice(currentIndex, match.index).trim();
      if (beforeContent) {
        parts.push({ type: 'content', content: beforeContent });
      }
    }
    
    // Add the think block
    parts.push({ type: 'think', content: match[0] });
    currentIndex = match.index + match[0].length;
  }
  
  // Add remaining content after the last think block
  if (currentIndex < content.length) {
    const remainingContent = content.slice(currentIndex).trim();
    if (remainingContent) {
      parts.push({ type: 'content', content: remainingContent });
    }
  }
  
  // If no think blocks found, return the original content
  if (parts.length === 0) {
    parts.push({ type: 'content', content: content });
  }
  
  return parts;
}

function isReasoningModel(selectedModel) {
  const modelConfig = AVAILABLE_MODELS.find(model => model.url === selectedModel);
  return modelConfig?.hasReasoningBlocks || false;
}

// Component for rendering code blocks with syntax highlighting
function CodeBlock({ children, className, inline, isDark, isGenerating = false, ...props }) {
  const [copied, setCopied] = useState(false);
  
  // Only apply syntax highlighting to block code (not inline)
  if (inline) {
    return <code className={className} {...props}>{children}</code>;
  }
  
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'text';
  const codeContent = String(children).replace(/\n$/, '');
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(codeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code to clipboard:', error);
    }
  };
  
  return (
    <div className="relative group/codeblock w-full">
      <SyntaxHighlighter
        style={isDark ? oneDark : oneLight}
        language={language}
        customStyle={{
          margin: '0.5rem 0',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          background: isDark ? '#282c34' : '#fafafa',
          padding: '1rem',
          lineHeight: '1.4'
        }}
        codeTagProps={{
          style: {
            padding: '0',
            margin: '0'
          }
        }}
        wrapLongLines={true}
      >
        {codeContent}
      </SyntaxHighlighter>
      {!isGenerating && (
        <button
          onClick={copyToClipboard}
          className="absolute top-2 right-2 opacity-0 group-hover/codeblock:opacity-100 transition-opacity duration-200 flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500 rounded transition-colors"
          title="Copy code"
        >
          <CopyIcon className="h-3 w-3" />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      )}
    </div>
  );
}

// Enhanced component to render markdown with syntax highlighting
function MarkdownWithSyntaxHighlighting({ content, isDark, isGenerating = false, selectedModel }) {
  // Check if this is a reasoning model
  const hasReasoningBlocks = selectedModel && isReasoningModel(selectedModel);
  
  if (hasReasoningBlocks) {
    // Parse content to separate think blocks from regular content
    const parts = parseThinkBlocks(content);
    
    return (
      <div className="markdown w-full">
        {parts.map((part, index) => {
          if (part.type === 'think') {
            return (
              <ThinkBlock
                key={`think-${index}`}
                content={part.content}
                isGenerating={isGenerating}
                isDark={isDark}
              />
            );
          } else {
            return (
              <div key={`content-${index}`} className="w-full">
                <ReactMarkdown
                  components={{
                    code: ({ node, inline, className, children, ...props }) => {
                      // Explicitly check if this is inline code
                      const isInlineCode = inline || !className;
                      
                      return (
                        <CodeBlock
                          inline={isInlineCode}
                          className={className}
                          isDark={isDark}
                          isGenerating={isGenerating}
                          {...props}
                        >
                          {children}
                        </CodeBlock>
                      );
                    }
                  }}
                >
                  {part.content}
                </ReactMarkdown>
              </div>
            );
          }
        })}
      </div>
    );
  }
  
  // Regular model without think blocks
  return (
    <div className="markdown w-full">
      <ReactMarkdown
        components={{
          code: ({ node, inline, className, children, ...props }) => {
            // Explicitly check if this is inline code
            const isInlineCode = inline || !className;
            
            return (
              <CodeBlock
                inline={isInlineCode}
                className={className}
                isDark={isDark}
                isGenerating={isGenerating}
                {...props}
              >
                {children}
              </CodeBlock>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function Chat({ messages, isRunning, loading = false, selectedModel, onEditMessage }) {
  const empty = messages.length === 0;
  const [copiedMessageIndex, setCopiedMessageIndex] = useState(null);
  const [editingMessageIndex, setEditingMessageIndex] = useState(null);
  const [editingMessageText, setEditingMessageText] = useState("");

  // Detect if dark theme is active
  const isDark = useMemo(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || 
             window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }, []);

  // Copy to clipboard function
  const copyToClipboard = async (text, messageIndex) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageIndex(messageIndex);
      // Reset the copied state after 2 seconds
      setTimeout(() => setCopiedMessageIndex(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Edit message functions
  const startEditing = (messageIndex, messageText) => {
    setEditingMessageIndex(messageIndex);
    setEditingMessageText(messageText);
  };

  const cancelEditing = () => {
    setEditingMessageIndex(null);
    setEditingMessageText("");
  };

  const submitEdit = () => {
    if (editingMessageText.trim() && onEditMessage) {
      onEditMessage(editingMessageIndex, editingMessageText.trim());
      setEditingMessageIndex(null);
      setEditingMessageText("");
    }
  };

  useEffect(() => {
    // Handle MathJax
    if (window.MathJax) {
      window.MathJax.typeset();
    }
  }, [messages]);

  return (
    <div
      className={`flex-1 p-6 max-w-[800px] w-full transition-opacity duration-300 ${
        loading ? "opacity-50 pointer-events-none" : "opacity-100"
      } ${empty ? "flex flex-col items-center justify-end" : "space-y-4"}`}
    >
      {messages.map((msg, i) => (
          <div key={`message-${i}`} className={`flex ${msg.role === "user" ? (editingMessageIndex === i ? "justify-start" : "justify-end") : "justify-start"}`}>
            {msg.role === "assistant" ? (
              <div className="relative group w-full max-w-none">
                <div className="min-h-6 text-gray-800 dark:text-gray-200 overflow-wrap-anywhere w-full">
                  {msg.content.length > 0 ? (
                    <MarkdownWithSyntaxHighlighting
                      content={msg.content}
                      isDark={isDark}
                      isGenerating={isRunning}
                      selectedModel={selectedModel}
                    />
                  ) : (
                    <span className="h-6 flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-gray-600 dark:bg-gray-300 rounded-full animate-pulse"></span>
                      <span className="w-2.5 h-2.5 bg-gray-600 dark:bg-gray-300 rounded-full animate-pulse animation-delay-200"></span>
                      <span className="w-2.5 h-2.5 bg-gray-600 dark:bg-gray-300 rounded-full animate-pulse animation-delay-400"></span>
                    </span>
                  )}
                </div>
                {msg.content.length > 0 && !(isRunning && i === messages.length - 1) && (
                  <div className="flex justify-start mt-2 -ml-2">
                    <button
                      onClick={() => copyToClipboard(msg.content, i)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500 rounded transition-colors"
                      title="Copy to clipboard"
                    >
                      <CopyIcon className="h-3 w-3" />
                      {copiedMessageIndex === i ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className={`relative group ${editingMessageIndex === i ? 'w-full' : ''}`}>
                {editingMessageIndex === i ? (
                  // Editing mode
                  <div className="bg-gray-100 dark:bg-gray-600 rounded-2xl px-4 py-2 w-full">
                    <textarea
                      value={editingMessageText}
                      onChange={(e) => setEditingMessageText(e.target.value)}
                      className="w-full min-h-[60px] bg-transparent border-none outline-none text-gray-800 dark:text-gray-200 resize-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          submitEdit();
                        } else if (e.key === 'Escape') {
                          cancelEditing();
                        }
                      }}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={cancelEditing}
                        className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-500 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={submitEdit}
                        className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        disabled={!editingMessageText.trim()}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ) : (
                  // Normal display mode
                  <div>
                    <div className="bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-2xl px-4 py-2 max-w-xs sm:max-w-sm md:max-w-lg lg:max-w-xl">
                      <div className="min-h-6 break-words">
                        {msg.content}
                      </div>
                    </div>
                    {!isRunning && (
                      <div className="flex justify-end gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => copyToClipboard(msg.content, i)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Copy to clipboard"
                        >
                          <CopyIcon className="h-3 w-3" />
                          {copiedMessageIndex === i ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                          onClick={() => startEditing(i, msg.content)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                          title="Edit message"
                        >
                          <PencilIcon className="h-3 w-3" />
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
