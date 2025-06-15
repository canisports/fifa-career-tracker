import React, { useState, useEffect } from 'react';
import { Settings, Upload as UploadIcon, BarChart3, Key, Info } from 'lucide-react';
import ScreenshotUpload from '../components/ScreenshotUpload';
import Dashboard from '../components/Dashboard';

type TabType = 'dashboard' | 'upload' | 'settings';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('claude-api-key');
    if (savedApiKey) {
      setClaudeApiKey(savedApiKey);
    }

    // For now, simulate authentication - this will be replaced with Patreon
    const authStatus = localStorage.getItem('is-authenticated');
    setIsAuthenticated(authStatus === 'true');
  }, []);

  // Save API key to localStorage
  const saveApiKey = (key: string) => {
    setClaudeApiKey(key);
    localStorage.setItem('claude-api-key', key);
  };

  // Handle data extraction completion
  const handleDataExtracted = () => {
    setRefreshTrigger(prev => prev + 1);
    setActiveTab('dashboard');
  };

  // Simulate login for development
  const handleDevLogin = () => {
    setIsAuthenticated(true);
    localStorage.setItem('is-authenticated', 'true');
  };

  // Landing page for non-authenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-8">
              <BarChart3 className="mx-auto h-16 w-16 text-blue-600 mb-4" />
              <h1 className="text-5xl font-bold text-gray-900 mb-4">
                FIFA Career Mode Tracker
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Transform your screenshots into detailed progress analytics
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="bg-white rounded-lg p-6 shadow-lg">
                <UploadIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Upload Screenshots</h3>
                <p className="text-gray-600">
                  Simply drag and drop your league tables, team stats, and player data screenshots
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-lg">
                <BarChart3 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
                <p className="text-gray-600">
                  Watch your team's journey with beautiful charts and detailed analytics
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-6 shadow-lg">
                <Settings className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Multi-Season</h3>
                <p className="text-gray-600">
                  Compare performance across different seasons and career saves
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg p-8 shadow-xl">
              <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-gray-600 mb-6">
                Join our community of career mode enthusiasts and start tracking your progress today!
              </p>
              
              <div className="space-y-4">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium">
                  Subscribe on Patreon - $7/month
                </button>
                
                {/* Development login button - remove in production */}
                <div className="pt-4 border-t">
                  <button
                    onClick={handleDevLogin}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded text-sm"
                  >
                    Dev Login (Remove in Production)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main application for authenticated users
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">FIFA Career Tracker</h1>
            </div>
            
            <nav className="flex space-x-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <BarChart3 className="h-4 w-4 inline mr-2" />
                Dashboard
              </button>
              
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'upload'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <UploadIcon className="h-4 w-4 inline mr-2" />
                Upload
              </button>
              
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Settings className="h-4 w-4 inline mr-2" />
                Settings
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'dashboard' && (
          <Dashboard refreshTrigger={refreshTrigger} />
        )}
        
        {activeTab === 'upload' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Screenshots</h2>
              <p className="text-gray-600">
                Upload your FIFA Career Mode screenshots to automatically extract and track your progress.
              </p>
            </div>
            
            {!claudeApiKey && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-yellow-800">
                  <Info className="h-5 w-5" />
                  <span className="font-medium">Claude API Key Required</span>
                </div>
                <p className="text-yellow-700 mt-1">
                  Please set your Claude API key in Settings to analyze screenshots.
                </p>
              </div>
            )}
            
            <ScreenshotUpload 
              claudeApiKey={claudeApiKey}
              onDataExtracted={handleDataExtracted}
            />
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Settings</h2>
              <p className="text-gray-600">
                Configure your API settings and preferences.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6 space-y-6">
              {/* Claude API Key */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Key className="h-4 w-4" />
                  Claude API Key
                </label>
                <input
                  type="password"
                  value={claudeApiKey}
                  onChange={(e) => saveApiKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Your API key is stored locally and never sent to our servers.
                  Get your key from the{' '}
                  <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Anthropic Console
                  </a>
                </p>
              </div>

              {/* API Key Status */}
              {claudeApiKey && (
                <div className="flex items-center gap-2 text-green-600">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <span className="text-sm">API key configured</span>
                </div>
              )}

              {/* Clear Data */}
              <div className="border-t pt-6">
                <h3 className="font-medium text-gray-700 mb-2">Data Management</h3>
                <p className="text-sm text-gray-600 mb-4">
                  All your data is stored locally on your device. You can export or clear it at any time.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      try {
                        const data = await require('../lib/database').dbHelpers.exportData();
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `fifa-career-data-${new Date().toISOString().split('T')[0]}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch (error) {
                        alert('Export failed');
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                  >
                    Export Data
                  </button>
                  
                  <button
                    onClick={async () => {
                      if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                        try {
                          await require('../lib/database').dbHelpers.clearAllData();
                          setRefreshTrigger(prev => prev + 1);
                          alert('All data cleared successfully');
                        } catch (error) {
                          alert('Failed to clear data');
                        }
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
                  >
                    Clear All Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
