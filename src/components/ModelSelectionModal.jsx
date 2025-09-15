import { useState } from 'react';
import { AVAILABLE_MODELS } from './ModelSelector';

export default function ModelSelectionModal({ onModelSelect, onClose }) {
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].url);

  const handleLoad = () => {
    onModelSelect(selectedModel);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Choose an AI Model
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select a model to get started. This will be remembered for future visits.
          </p>
        </div>

        <div className="space-y-2 mb-6">
          {AVAILABLE_MODELS.map((model) => (
            <label
              key={model.id}
              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
                selectedModel === model.url
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <input
                type="radio"
                name="model"
                value={model.url}
                checked={selectedModel === model.url}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="mt-1 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {model.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {model.description}
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleLoad}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors"
          >
            Load Model
          </button>
        </div>
      </div>
    </div>
  );
}