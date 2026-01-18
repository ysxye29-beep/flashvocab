import React from 'react';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="bg-gray-800 rounded-xl shadow-xl border border-gray-700 w-full max-w-2xl mx-auto p-6 animate-pulse">
      <div className="flex justify-between items-start border-b border-gray-700 pb-6 mb-6">
        <div className="space-y-3">
          <div className="h-10 bg-gray-700 rounded w-48"></div>
          <div className="h-6 bg-gray-700 rounded w-32"></div>
        </div>
        <div className="h-12 w-12 bg-gray-700 rounded-full"></div>
      </div>
      
      <div className="space-y-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="h-5 bg-gray-700 rounded w-24 shrink-0"></div>
            <div className="h-5 bg-gray-700 rounded w-full"></div>
          </div>
        ))}
      </div>
    </div>
  );
};