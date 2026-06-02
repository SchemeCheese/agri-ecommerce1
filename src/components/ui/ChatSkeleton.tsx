'use client';

export const ChatSkeleton = () => {
  return (
    <div className="space-y-3 p-4">
      {/* Message 1 - Left align, short */}
      <div className="flex justify-start">
        <div className="bg-gray-200 rounded-2xl h-10 w-32 animate-pulse" />
      </div>

      {/* Message 2 - Right align, medium */}
      <div className="flex justify-end">
        <div className="bg-gray-300 rounded-2xl h-12 w-48 animate-pulse" />
      </div>

      {/* Message 3 - Left align, medium */}
      <div className="flex justify-start">
        <div className="bg-gray-200 rounded-2xl h-14 w-40 animate-pulse" />
      </div>

      {/* Message 4 - Right align, long */}
      <div className="flex justify-end">
        <div className="bg-gray-300 rounded-2xl h-16 w-56 animate-pulse" />
      </div>
    </div>
  );
};
