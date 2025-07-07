import React, { useState, useEffect, useRef } from 'react';
import { Settings, Key, Brain, Save, X, Sparkles, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { AIProvider } from '../types';
import { aiService } from '../utils/aiService';

interface AISettingsProps {
  isOpen: boolean;
  onClose: () => void;
  theme: any;
}

const AISettings: React.FC<AISettingsProps> = ({ isOpen, onClose, theme }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [selectedProvider, setSelectedProvider] = useState('DeepSeek');
  const [apiKey, setApiKey] = useState('');
  const [customEndpoint, setCustomEndpoint] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const providers = [
    { name: 'DeepSeek', endpoint: 'https://api.deepseek.com/v1/chat/completions', icon: '🧠', description: 'Fast and cost-effective AI' },
    { name: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions', icon: '🤖', description: 'Industry-leading AI models' },
    { name: 'Anthropic', endpoint: 'https://api.anthropic.com/v1/messages', icon: '🎭', description: 'Advanced reasoning capabilities' },
    { name: 'Groq', endpoint: 'https://api.groq.com/openai/v1/chat/completions', icon: '⚡', description: 'Ultra-fast inference' }
  ];

  // Handle modal closing with Escape key and outside clicks
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    // Load saved settings
    const savedProvider = localStorage.getItem('ai_provider') || 'DeepSeek';
    const savedKey = localStorage.getItem('ai_key') || '';
    const savedEndpoint = localStorage.getItem('ai_endpoint');

    setSelectedProvider(savedProvider);
    setApiKey(savedKey);
    if (savedEndpoint) setCustomEndpoint(savedEndpoint);
  }, []);

  const testConnection = async () => {
    if (!apiKey.trim()) {
      alert('Please enter an API key first');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus('idle');

    try {
      const provider: AIProvider = {
        name: selectedProvider,
        key: apiKey,
        endpoint: customEndpoint || providers.find(p => p.name === selectedProvider)?.endpoint || ''
      };

      // Configure AI service temporarily for testing
      aiService.setProvider(provider);

      // Test with a simple recommendation request
      const testData = [{
        cleanedClass: 'Test Class',
        location: 'Test Location',
        dayOfWeek: 'Monday',
        classTime: '09:00',
        participants: 10,
        totalRevenue: 5000,
        teacherName: 'Test Teacher',
        teacherFirstName: 'Test',
        teacherLastName: 'Teacher',
        variantName: 'Test',
        classDate: '2024-01-01',
        payrate: 'Test',
        basePayout: 0,
        additionalPayout: 0,
        totalPayout: 0,
        tip: 0,
        checkedIn: 10,
        comps: 0,
        checkedInComps: 0,
        lateCancellations: 0,
        nonPaidCustomers: 0,
        timeHours: 1,
        unique1: '',
        unique2: ''
      }];

      await aiService.generateRecommendations(testData, 'Monday', '09:00', 'Test Location');
      setConnectionStatus('success');
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      alert('Please enter an API key');
      return;
    }

    setIsSaving(true);

    try {
      const provider: AIProvider = {
        name: selectedProvider,
        key: apiKey,
        endpoint: customEndpoint || providers.find(p => p.name === selectedProvider)?.endpoint || ''
      };

      // Save to localStorage
      localStorage.setItem('ai_provider', selectedProvider);
      localStorage.setItem('ai_key', apiKey);
      localStorage.setItem('ai_endpoint', provider.endpoint);

      // Configure AI service
      aiService.setProvider(provider);

      alert('AI settings saved successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving AI settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleProviderChange = (providerName: string) => {
    setSelectedProvider(providerName);
    const provider = providers.find(p => p.name === providerName);
    if (provider) {
      setCustomEndpoint(provider.endpoint);
    }
    setConnectionStatus('idle');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div ref={modalRef} className={`${theme.card} rounded-2xl shadow-2xl max-w-4xl w-full m-4 border ${theme.border}`}>
        <div className={`flex items-center justify-between p-6 border-b ${theme.border} bg-gradient-to-r from-purple-600/20 to-pink-600/20`}>
          <div className="flex items-center">
            <div className="p-2 bg-purple-500/20 rounded-lg mr-3">
              <Brain className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${theme.text}`}>AI Configuration</h2>
              <p className={`text-sm ${theme.textSecondary}`}>Configure your AI provider for intelligent scheduling</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`${theme.textSecondary} hover:${theme.text} transition-colors p-2 hover:bg-gray-700 rounded-lg`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Enhanced Warning */}
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 rounded-xl border border-blue-500/20">
            <div className="flex items-start">
              <AlertTriangle className="h-6 w-6 text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-300 mb-3">AI-Powered Smart Scheduling</h4>
                <p className={`text-sm ${theme.textSecondary} mb-3`}>
                  With a valid API key, the system will use advanced AI to generate intelligent class schedules based on:
                </p>
                <ul className={`text-sm ${theme.textSecondary} space-y-1 ml-4`}>
                  <li>• Historic performance data and attendance patterns</li>
                  <li>• Teacher-class format success combinations</li>
                  <li>• Revenue optimization and peak time analysis</li>
                  <li>• Dynamic daily optimization for each location</li>
                  <li>• Intelligent teacher workload distribution</li>
                </ul>
                <p className={`text-sm ${theme.textSecondary} mt-3`}>
                  Without an API key, the system will use local data analysis for basic recommendations.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Provider Selection */}
            <div className="space-y-6">
              <div>
                <label className={`block text-sm font-medium ${theme.textSecondary} mb-4`}>
                  AI Provider
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {providers.map(provider => (
                    <button
                      key={provider.name}
                      onClick={() => handleProviderChange(provider.name)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                        selectedProvider === provider.name
                          ? 'border-purple-500 bg-purple-500/20'
                          : `border-gray-600 ${theme.card} hover:border-gray-500`
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="text-2xl mr-3">{provider.icon}</div>
                          <div>
                            <div className={`font-medium ${theme.text}`}>{provider.name}</div>
                            <div className={`text-sm ${theme.textSecondary}`}>{provider.description}</div>
                          </div>
                        </div>
                        {selectedProvider === provider.name && (
                          <CheckCircle className="h-5 w-5 text-purple-400" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
                  API Key
                </label>
                <div className="relative">
                  <Key className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${theme.textSecondary}`} />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    className={`w-full pl-10 pr-3 py-3 ${theme.card} border ${theme.border} ${theme.text} rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  />
                </div>
                <p className={`mt-2 text-xs ${theme.textSecondary}`}>
                  Your API key is stored locally and never shared
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
                  API Endpoint (Optional)
                </label>
                <input
                  type="url"
                  value={customEndpoint}
                  onChange={(e) => setCustomEndpoint(e.target.value)}
                  placeholder="Custom endpoint URL"
                  className={`w-full px-3 py-3 ${theme.card} border ${theme.border} ${theme.text} rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                />
              </div>

              {/* Connection Test */}
              <div className="space-y-3">
                <button
                  onClick={testConnection}
                  disabled={isTestingConnection || !apiKey.trim()}
                  className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTestingConnection ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </button>

                {connectionStatus === 'success' && (
                  <div className="flex items-center p-3 bg-green-500/20 text-green-300 rounded-lg">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span className="text-sm">Connection successful! AI features are ready.</span>
                  </div>
                )}

                {connectionStatus === 'error' && (
                  <div className="flex items-center p-3 bg-red-500/20 text-red-300 rounded-lg">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <span className="text-sm">Connection failed. Please check your API key and try again.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Features & Benefits */}
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 rounded-xl border border-blue-500/20">
                <h4 className="font-medium text-blue-300 mb-4 flex items-center">
                  <Sparkles className="h-5 w-5 mr-2" />
                  AI-Powered Features
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div>
                      <div className="font-medium text-blue-200 text-sm">Smart Class Recommendations</div>
                      <div className={`text-xs ${theme.textSecondary}`}>AI analyzes historic data to suggest optimal class-teacher-time combinations</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div>
                      <div className="font-medium text-green-200 text-sm">Daily Optimization</div>
                      <div className={`text-xs ${theme.textSecondary}`}>Day-specific AI optimization for dynamic scheduling</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div>
                      <div className="font-medium text-purple-200 text-sm">Revenue Optimization</div>
                      <div className={`text-xs ${theme.textSecondary}`}>Maximize revenue through intelligent peak-time scheduling</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div>
                      <div className="font-medium text-yellow-200 text-sm">Teacher Workload Balance</div>
                      <div className={`text-xs ${theme.textSecondary}`}>Intelligent distribution of hours while respecting constraints</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-pink-400 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div>
                      <div className="font-medium text-pink-200 text-sm">Performance Insights</div>
                      <div className={`text-xs ${theme.textSecondary}`}>Deep analytics on class performance and attendance patterns</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-6 rounded-xl border border-green-500/20">
                <h4 className="font-medium text-green-300 mb-4">Optimization Benefits</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center p-3 bg-green-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-green-300">85%+</div>
                    <div className="text-green-400 text-xs">Teacher Utilization</div>
                  </div>
                  <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-blue-300">90%+</div>
                    <div className="text-blue-400 text-xs">Class Fill Rate</div>
                  </div>
                  <div className="text-center p-3 bg-purple-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-purple-300">25%+</div>
                    <div className="text-purple-400 text-xs">Revenue Increase</div>
                  </div>
                  <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-300">50%</div>
                    <div className="text-yellow-400 text-xs">Time Saved</div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 p-6 rounded-xl border border-orange-500/20">
                <h4 className="font-medium text-orange-300 mb-3">Getting Started</h4>
                <div className="space-y-2 text-sm text-orange-200">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center text-xs font-bold mr-3">1</div>
                    <span>Choose your preferred AI provider</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center text-xs font-bold mr-3">2</div>
                    <span>Enter your API key from the provider</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center text-xs font-bold mr-3">3</div>
                    <span>Test the connection to verify setup</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center text-xs font-bold mr-3">4</div>
                    <span>Save and start using AI optimization</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className={`flex justify-end space-x-3 pt-4 border-t ${theme.border}`}>
            <button
              onClick={onClose}
              className={`px-4 py-2 ${theme.textSecondary} hover:${theme.text} transition-colors`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISettings;