'use client';

export default function SimpleAudioPlayer() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-200 to-yellow-400 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">BMIR Audio Player</h1>
          <h2 className="text-xl text-gray-600">Simple Test Version</h2>
          <p className="text-sm text-gray-500 mt-2">
            This is a simple test component to verify imports work.
          </p>
        </div>
        
        <div className="text-center">
          <p className="text-lg text-gray-700 mb-4">
            ✅ Component import is working<br/>
            ✅ Tailwind CSS is working<br/>
            ✅ React is rendering correctly
          </p>
          
          <button className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            Test Button
          </button>
        </div>
      </div>
    </div>
  );
} 