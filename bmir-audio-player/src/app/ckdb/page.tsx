'use client';

import React, { useState, useEffect } from 'react';

interface DatabaseEntry {
  key: string;
  data: any;
  size: number;
}

export default function CheckDatabase() {
  const [databaseEntries, setDatabaseEntries] = useState<DatabaseEntry[]>([]);
  const [sessionData, setSessionData] = useState<any>(null);
  const [totalSize, setTotalSize] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

  useEffect(() => {
    inspectDatabase();
  }, []);

  const inspectDatabase = () => {
    setIsLoading(true);
    
    try {
      // Get all localStorage keys
      const allKeys = Object.keys(localStorage);
      
      // Filter BMIR-related keys
      const bmirKeys = allKeys.filter(key => 
        key.includes('bmir-audio-player') || key.includes('bmir:')
      );
      
      // Parse and format data
      const entries: DatabaseEntry[] = bmirKeys.map(key => {
        const rawData = localStorage.getItem(key);
        let parsedData;
        let size = 0;
        
        try {
          parsedData = JSON.parse(rawData || '');
          size = JSON.stringify(parsedData).length;
        } catch (e) {
          parsedData = rawData;
          size = (rawData || '').length;
        }
        
        return {
          key,
          data: parsedData,
          size
        };
      });
      
      // Sort by size (largest first)
      entries.sort((a, b) => b.size - a.size);
      
      setDatabaseEntries(entries);
      
      // Calculate total size
      const total = entries.reduce((sum, entry) => sum + entry.size, 0);
      setTotalSize(total);
      
      // Get current session data
      const sessionId = localStorage.getItem('bmir-session-id');
      if (sessionId) {
        const sessionKey = `bmir:session:${sessionId}`;
        const sessionRaw = localStorage.getItem(sessionKey);
        if (sessionRaw) {
          try {
            setSessionData(JSON.parse(sessionRaw));
          } catch (e) {
            setSessionData({ error: 'Failed to parse session data' });
          }
        }
      }
      
    } catch (error) {
      console.error('Error inspecting database:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetDatabase = () => {
    if (confirm('Are you sure you want to reset the database? This will clear all data and reload the page.')) {
      try {
        // Clear all BMIR-related localStorage
        const keys = Object.keys(localStorage);
        const bmirKeys = keys.filter(key => 
          key.includes('bmir-audio-player') || key.includes('bmir:')
        );
        bmirKeys.forEach(key => localStorage.removeItem(key));
        
        console.log('Database cleared, reloading page...');
        window.location.reload();
      } catch (error) {
        console.error('Error resetting database:', error);
      }
    }
  };

  const exportData = () => {
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        entries: databaseEntries,
        sessionData,
        totalSize
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bmir-database-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatKey = (key: string) => {
    if (key.includes('bmir-audio-player:database')) {
      return '🗄️ Database Entry';
    } else if (key.includes('bmir:session')) {
      return '👤 Session Data';
    } else if (key.includes('bmir:clip')) {
      return '🎵 Cached Clip';
    } else if (key.includes('bmir-session-id')) {
      return '🆔 Session ID';
    }
    return '📄 Other';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-200 to-purple-400 p-8">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-800 mx-auto mb-4"></div>
            <p className="text-lg text-gray-800">Inspecting Fireproof Database...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-200 to-purple-400 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🗄️ Fireproof Database Inspector</h1>
          <p className="text-lg text-gray-600">BMIR Audio Player - Database Analysis</p>
          <div className="mt-4 flex justify-center space-x-4">
            <button
              onClick={inspectDatabase}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              🔄 Refresh Data
            </button>
            <button
              onClick={exportData}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              📥 Export Data
            </button>
            <button
              onClick={resetDatabase}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              🗑️ Reset Database
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800">Total Entries</h3>
            <p className="text-2xl font-bold text-blue-600">{databaseEntries.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800">Total Size</h3>
            <p className="text-2xl font-bold text-green-600">{formatSize(totalSize)}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800">Session Active</h3>
            <p className="text-2xl font-bold text-purple-600">{sessionData ? '✅' : '❌'}</p>
          </div>
        </div>

        {/* Database Entries */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Database Entries</h2>
          <div className="space-y-2">
            {databaseEntries.map((entry, index) => (
              <div
                key={entry.key}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedEntry(selectedEntry === entry.key ? null : entry.key)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{formatKey(entry.key)}</span>
                    <span className="text-sm text-gray-500">{entry.key}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-600">{formatSize(entry.size)}</span>
                    <span className="ml-2 text-gray-400">{selectedEntry === entry.key ? '▼' : '▶'}</span>
                  </div>
                </div>
                
                {selectedEntry === entry.key && (
                  <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(entry.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Session Data */}
        {sessionData && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Current Session Data</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(sessionData, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Quick Commands */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Console Commands</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
            <div className="mb-2">
              <span className="text-yellow-400">// View all BMIR keys</span><br/>
              <span className="text-blue-400">Object.keys(localStorage).filter(key => key.includes('bmir'))</span>
            </div>
            <div className="mb-2">
              <span className="text-yellow-400">// Reset database</span><br/>
              <span className="text-blue-400">window.resetAudioDatabase()</span>
            </div>
            <div className="mb-2">
              <span className="text-yellow-400">// View session data</span><br/>
              <span className="text-blue-400">localStorage.getItem('bmir:session:' + localStorage.getItem('bmir-session-id'))</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600">
          <p>🔍 Fireproof Database Inspector - BMIR Audio Player</p>
          <p>Last updated: {new Date().toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
} 