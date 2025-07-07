import React, { useState, useEffect } from 'react';
import { X, Brain, TrendingUp, Users, Clock, Target, Zap, Award, BarChart3, MapPin, Calendar, Star, CheckCircle, AlertTriangle } from 'lucide-react';
import { ClassData, ScheduledClass } from '../types';
import { EnhancedOptimizer, OptimizationIteration } from '../utils/enhancedOptimizer';

interface EnhancedOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  csvData: ClassData[];
  currentSchedule: ScheduledClass[];
  onOptimize: (optimizedSchedule: ScheduledClass[]) => void;
  isDarkMode: boolean;
}

const EnhancedOptimizerModal: React.FC<EnhancedOptimizerModalProps> = ({
  isOpen,
  onClose,
  csvData,
  currentSchedule,
  onOptimize,
  isDarkMode
}) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [iterations, setIterations] = useState<OptimizationIteration[]>([]);
  const [selectedIteration, setSelectedIteration] = useState<string>('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isOpen) {
      generateOptimizations();
    }
  }, [isOpen]);

  const generateOptimizations = async () => {
    setIsOptimizing(true);
    setIterations([]);

    try {
      const optimizer = new EnhancedOptimizer(csvData);
      const optimizedIterations = optimizer.generateOptimizedSchedules();
      setIterations(optimizedIterations);
      setSelectedIteration(optimizedIterations[0]?.id || '');
    } catch (error) {
      console.error('Optimization failed:', error);
      alert('Optimization failed. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApplyIteration = () => {
    const iteration = iterations.find(it => it.id === selectedIteration);
    if (iteration) {
      onOptimize(iteration.schedule);
      onClose();
    }
  };

  const getSelectedIteration = () => {
    return iterations.find(it => it.id === selectedIteration);
  };

  if (!isOpen) return null;

  const modalBg = isDarkMode 
    ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
    : 'bg-gradient-to-br from-white to-gray-50';
  
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`${modalBg} rounded-2xl shadow-2xl max-w-7xl w-full m-4 max-h-[95vh] overflow-y-auto border ${borderColor}`}>
        <div className={`flex items-center justify-between p-6 border-b ${borderColor} bg-gradient-to-r from-purple-600/20 to-pink-600/20`}>
          <div className="flex items-center">
            <div className="p-2 bg-purple-500/20 rounded-lg mr-3">
              <Brain className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${textPrimary}`}>Enhanced AI Optimizer</h2>
              <p className={textSecondary}>Comprehensive schedule optimization with multiple strategies</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`${textSecondary} hover:${textPrimary} transition-colors p-2 hover:bg-gray-700 rounded-lg`}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {isOptimizing ? (
            <div className="text-center py-12">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-400 border-t-transparent mx-auto mb-4"></div>
                <Brain className="absolute inset-0 h-16 w-16 text-purple-400 animate-pulse mx-auto" />
              </div>
              <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>Generating Optimized Schedules...</h3>
              <p className={textSecondary}>Analyzing data and applying comprehensive optimization rules</p>
              <div className="mt-4 space-y-2">
                <div className={`text-sm ${textSecondary}`}>✓ Filtering classes with average &gt; 5.0</div>
                <div className={`text-sm ${textSecondary}`}>✓ Applying location-specific constraints</div>
                <div className={`text-sm ${textSecondary}`}>✓ Optimizing trainer assignments</div>
                <div className={`text-sm ${textSecondary}`}>✓ Balancing revenue and attendance</div>
              </div>
            </div>
          ) : iterations.length > 0 ? (
            <>
              {/* Iteration Selection */}
              <div className="mb-6">
                <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Optimization Strategies</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {iterations.map(iteration => (
                    <div
                      key={iteration.id}
                      onClick={() => setSelectedIteration(iteration.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        selectedIteration === iteration.id
                          ? 'border-purple-500 bg-purple-500/20'
                          : isDarkMode
                            ? 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                            : 'border-gray-300 bg-white hover:border-gray-400 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className={`font-semibold ${textPrimary}`}>{iteration.name}</h4>
                        {selectedIteration === iteration.id && (
                          <CheckCircle className="h-5 w-5 text-purple-400" />
                        )}
                      </div>
                      <p className={`text-sm ${textSecondary} mb-3`}>{iteration.description}</p>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-center p-2 bg-blue-500/10 rounded">
                          <div className={`font-bold ${textPrimary}`}>{iteration.schedule.length}</div>
                          <div className="text-blue-400">Classes</div>
                        </div>
                        <div className="text-center p-2 bg-green-500/10 rounded">
                          <div className={`font-bold ${textPrimary}`}>₹{Math.round(iteration.metrics.totalRevenue / 1000)}K</div>
                          <div className="text-green-400">Revenue</div>
                        </div>
                        <div className="text-center p-2 bg-purple-500/10 rounded">
                          <div className={`font-bold ${textPrimary}`}>{iteration.metrics.totalAttendance}</div>
                          <div className="text-purple-400">Attendance</div>
                        </div>
                        <div className="text-center p-2 bg-orange-500/10 rounded">
                          <div className={`font-bold ${textPrimary}`}>{(iteration.metrics.teacherUtilization * 100).toFixed(0)}%</div>
                          <div className="text-orange-400">Utilization</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed View */}
              {selectedIteration && (
                <div className="space-y-6">
                  {/* Tabs */}
                  <div className={`flex border-b ${borderColor}`}>
                    {[
                      { id: 'overview', name: 'Overview', icon: BarChart3 },
                      { id: 'schedule', name: 'Schedule', icon: Calendar },
                      { id: 'trainers', name: 'Trainers', icon: Users },
                      { id: 'metrics', name: 'Metrics', icon: TrendingUp }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center px-6 py-3 font-medium transition-colors ${
                          activeTab === tab.id
                            ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                            : `${textSecondary} hover:${textPrimary}`
                        }`}
                      >
                        <tab.icon className="h-5 w-5 mr-2" />
                        {tab.name}
                      </button>
                    ))}
                  </div>

                  {/* Tab Content */}
                  {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className={`text-lg font-semibold ${textPrimary}`}>Key Metrics</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-500/20 p-4 rounded-xl border border-blue-500/30">
                            <div className={`text-2xl font-bold ${textPrimary}`}>{getSelectedIteration()?.schedule.length}</div>
                            <div className="text-sm text-blue-300">Total Classes</div>
                          </div>
                          <div className="bg-green-500/20 p-4 rounded-xl border border-green-500/30">
                            <div className={`text-2xl font-bold ${textPrimary}`}>₹{Math.round((getSelectedIteration()?.metrics.totalRevenue || 0) / 1000)}K</div>
                            <div className="text-sm text-green-300">Expected Revenue</div>
                          </div>
                          <div className="bg-purple-500/20 p-4 rounded-xl border border-purple-500/30">
                            <div className={`text-2xl font-bold ${textPrimary}`}>{getSelectedIteration()?.metrics.totalAttendance}</div>
                            <div className="text-sm text-purple-300">Total Attendance</div>
                          </div>
                          <div className="bg-orange-500/20 p-4 rounded-xl border border-orange-500/30">
                            <div className={`text-2xl font-bold ${textPrimary}`}>{((getSelectedIteration()?.metrics.teacherUtilization || 0) * 100).toFixed(0)}%</div>
                            <div className="text-sm text-orange-300">Teacher Utilization</div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className={`text-lg font-semibold ${textPrimary}`}>Optimization Rules Applied</h4>
                        <div className="space-y-2">
                          <div className="flex items-center p-3 bg-green-500/10 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-green-400 mr-3" />
                            <span className={`text-sm ${textPrimary}`}>Classes filtered by average &gt; 5.0 participants</span>
                          </div>
                          <div className="flex items-center p-3 bg-green-500/10 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-green-400 mr-3" />
                            <span className={`text-sm ${textPrimary}`}>Maximum 3 trainers per shift enforced</span>
                          </div>
                          <div className="flex items-center p-3 bg-green-500/10 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-green-400 mr-3" />
                            <span className={`text-sm ${textPrimary}`}>7:30 AM start time for Kwality House weekdays</span>
                          </div>
                          <div className="flex items-center p-3 bg-green-500/10 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-green-400 mr-3" />
                            <span className={`text-sm ${textPrimary}`}>No consecutive classes of same format</span>
                          </div>
                          <div className="flex items-center p-3 bg-green-500/10 rounded-lg">
                            <CheckCircle className="h-4 w-4 text-green-400 mr-3" />
                            <span className={`text-sm ${textPrimary}`}>Trainers limited to 1 location per day</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'schedule' && (
                    <div className="space-y-4">
                      <h4 className={`text-lg font-semibold ${textPrimary}`}>Weekly Schedule</h4>
                      <div className="grid grid-cols-1 gap-4">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                          const dayClasses = getSelectedIteration()?.schedule.filter(cls => cls.day === day) || [];
                          return (
                            <div key={day} className={`p-4 ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} rounded-xl`}>
                              <h5 className={`font-semibold ${textPrimary} mb-3`}>{day} ({dayClasses.length} classes)</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {dayClasses
                                  .sort((a, b) => a.time.localeCompare(b.time))
                                  .map(cls => (
                                    <div key={cls.id} className={`p-3 ${isDarkMode ? 'bg-gray-700/50' : 'bg-white'} rounded-lg border ${borderColor}`}>
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-purple-400">{cls.time}</span>
                                        <span className={`text-xs ${textSecondary}`}>{cls.location.split(',')[0]}</span>
                                      </div>
                                      <div className={`font-medium ${textPrimary} mb-1`}>{cls.classFormat}</div>
                                      <div className={`text-sm ${textSecondary}`}>
                                        {cls.teacherFirstName} {cls.teacherLastName}
                                      </div>
                                      <div className="flex items-center justify-between mt-2 text-xs">
                                        <span className="text-green-400">{cls.participants} participants</span>
                                        <span className={textSecondary}>{parseFloat(cls.duration) * 60}min</span>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeTab === 'trainers' && (
                    <div className="space-y-4">
                      <h4 className={`text-lg font-semibold ${textPrimary}`}>Trainer Assignments</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(getSelectedIteration()?.trainerAssignments || {}).map(([trainer, assignment]: [string, any]) => (
                          <div key={trainer} className={`p-4 ${isDarkMode ? 'bg-gray-800/50' : 'bg-white'} rounded-xl border ${borderColor}`}>
                            <div className="flex items-center justify-between mb-3">
                              <h5 className={`font-semibold ${textPrimary}`}>{trainer}</h5>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                assignment.hours > 12 ? 'bg-green-500/20 text-green-300' :
                                assignment.hours > 8 ? 'bg-yellow-500/20 text-yellow-300' :
                                'bg-red-500/20 text-red-300'
                              }`}>
                                {assignment.hours.toFixed(1)}h
                              </span>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div>
                                <span className={textSecondary}>Shifts: </span>
                                <span className={textPrimary}>{assignment.shifts.length}</span>
                              </div>
                              <div>
                                <span className={textSecondary}>Locations: </span>
                                <span className={textPrimary}>{assignment.locations.join(', ')}</span>
                              </div>
                              <div className="mt-3">
                                <div className={`w-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2`}>
                                  <div
                                    className={`h-2 rounded-full ${
                                      assignment.hours > 12 ? 'bg-green-500' :
                                      assignment.hours > 8 ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min((assignment.hours / 15) * 100, 100)}%` }}
                                  />
                                </div>
                                <div className={`text-xs ${textSecondary} mt-1`}>
                                  {((assignment.hours / 15) * 100).toFixed(0)}% utilization
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'metrics' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className={`text-lg font-semibold ${textPrimary}`}>Performance Metrics</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                            <span className={textPrimary}>Fill Rate</span>
                            <span className="text-blue-400 font-bold">
                              {((getSelectedIteration()?.metrics.fillRate || 0) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                            <span className={textPrimary}>Revenue Efficiency</span>
                            <span className="text-green-400 font-bold">
                              ₹{(getSelectedIteration()?.metrics.efficiency || 0).toFixed(1)}K/hour
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg">
                            <span className={textPrimary}>Teacher Utilization</span>
                            <span className="text-purple-400 font-bold">
                              {((getSelectedIteration()?.metrics.teacherUtilization || 0) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className={`text-lg font-semibold ${textPrimary}`}>Comparison with Current</h4>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-indigo-500/10 rounded-lg">
                            <span className={textPrimary}>Classes</span>
                            <div className="flex items-center">
                              <span className={textPrimary}>{currentSchedule.length}</span>
                              <span className="mx-2">→</span>
                              <span className="text-indigo-400 font-bold">{getSelectedIteration()?.schedule.length}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                            <span className={textPrimary}>Expected Revenue</span>
                            <div className="flex items-center">
                              <span className={textPrimary}>
                                ₹{Math.round(currentSchedule.reduce((sum, cls) => sum + (cls.revenue || 0), 0) / 1000)}K
                              </span>
                              <span className="mx-2">→</span>
                              <span className="text-green-400 font-bold">
                                ₹{Math.round((getSelectedIteration()?.metrics.totalRevenue || 0) / 1000)}K
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700 mt-8">
                <button
                  onClick={onClose}
                  className={`px-6 py-3 ${textSecondary} hover:${textPrimary} transition-colors`}
                >
                  Cancel
                </button>
                <button
                  onClick={generateOptimizations}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Zap className="h-4 w-4 mr-2 inline" />
                  Generate New Iteration
                </button>
                <button
                  onClick={handleApplyIteration}
                  disabled={!selectedIteration}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply Selected Schedule
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
              <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>No Optimizations Available</h3>
              <p className={textSecondary}>Click "Generate Optimizations" to create optimized schedules</p>
              <button
                onClick={generateOptimizations}
                className="mt-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Generate Optimizations
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedOptimizerModal;