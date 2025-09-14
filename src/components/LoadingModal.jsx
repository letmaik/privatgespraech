import Progress from './Progress';

export default function LoadingModal({ loadingMessage, progressItems }) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="mb-4">
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>
    </div>
  );
}