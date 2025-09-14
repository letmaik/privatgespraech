import { useState } from 'react';

export default function ThinkBlock({ content, isGenerating, isDark }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto-collapse when generation is complete (when </think> is detected)
  const isComplete = content.includes('</think>');
  
  // Extract content between think tags
  const thinkMatch = content.match(/<think>([\s\S]*?)(<\/think>|$)/);
  const thinkContent = thinkMatch ? thinkMatch[1].trim() : '';
  const hasContent = thinkContent.length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <div className="my-3 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-950/30 w-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 text-left text-sm font-medium text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-t-lg transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <svg 
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>Reasoning</span>
        </div>
        {isGenerating && !isComplete && (
          <div className="text-xs text-blue-600 dark:text-blue-400">
            <span className="inline-block animate-bounce">.</span>
            <span className="inline-block animate-bounce ml-0.5" style={{animationDelay: '0.1s'}}>.</span>
            <span className="inline-block animate-bounce ml-0.5" style={{animationDelay: '0.2s'}}>.</span>
          </div>
        )}
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-blue-200 dark:border-blue-800">
          <div className="mt-3 text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap font-mono bg-blue-100 dark:bg-blue-900/40 p-3 rounded border">
            {thinkContent}
          </div>
        </div>
      )}
    </div>
  );
}