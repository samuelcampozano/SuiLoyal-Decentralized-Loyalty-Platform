import { FC } from 'react';

export const LoadingOverlay: FC = () => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
    <div className="bg-white rounded-lg p-6">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Processing...</p>
    </div>
  </div>
);