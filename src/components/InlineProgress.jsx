import Progress from './Progress';

export default function InlineProgress({ loadingMessage, progressItems, isVisible }) {
  if (!isVisible) return null;
  
  return (
    <div className="w-[800px] max-w-[80%] mx-auto mb-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="mb-3">
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
          {loadingMessage || 'Preparing model...'}
        </p>
      </div>

      <div className="space-y-2">
        {progressItems.map(({ file, progress, total }, i) => (
          <Progress
            key={i}
            text={file}
            percentage={progress}
            total={total}
          />
        ))}
      </div>

      {progressItems.length === 0 && (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
}