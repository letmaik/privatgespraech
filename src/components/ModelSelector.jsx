import { useState, useRef, useEffect } from 'react';

const AVAILABLE_MODELS = [
  {
    id: 'llama-3.2-1b',
    name: 'Llama 3.2 1B',
    description: 'Meta model, 1.2 GB',
    url: 'onnx-community/Llama-3.2-1B-Instruct-q4f16',
    hasReasoningBlocks: false
  },
  {
    id: 'phi-3.5-mini',
    name: 'Phi-3.5 Mini 3.8B',
    description: 'Microsoft model, 2.1 GB',
    url: 'onnx-community/Phi-3.5-mini-instruct-onnx-web',
    hasReasoningBlocks: false
  },
  {
    id: 'smollm2-1.7b',
    name: 'SmolLM2 1.7B',
    description: 'HuggingFace model, 1.1 GB',
    url: 'HuggingFaceTB/SmolLM2-1.7B-Instruct',
    hasReasoningBlocks: false
  },
  {
    id: 'qwen3-0.6b',
    name: 'Qwen3 0.6B',
    description: 'Alibaba model, 0.5 GB',
    url: 'onnx-community/Qwen3-0.6B-ONNX',
    hasReasoningBlocks: true
  },
  {
    id: 'deepseek-r1-distill-qwen-1.5b',
    name: 'DeepSeek-R1-Distill-Qwen 1.5B',
    description: 'DeepSeek model, 1.3 GB',
    url: 'onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX',
    hasReasoningBlocks: true
  }
];

export { AVAILABLE_MODELS };

export default function ModelSelector({ selectedModel, onModelChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedModelData = AVAILABLE_MODELS.find(model => model.url === selectedModel) || AVAILABLE_MODELS[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span>{selectedModelData.name}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-20">
          {AVAILABLE_MODELS.map((model) => (
            <button
              key={model.id}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-md last:rounded-b-md ${
                model.url === selectedModel 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                  : 'text-gray-700 dark:text-gray-300'
              }`}
              onClick={() => {
                if (model.url !== selectedModel) {
                  onModelChange(model.url);
                }
                setIsOpen(false);
              }}
            >
              <div className="font-medium">{model.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{model.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}