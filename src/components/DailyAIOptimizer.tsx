import React, { useState, useEffect } from 'react';
import { X, Brain, Calendar, Zap, Target, TrendingUp, Users, Clock, Star, CheckCircle, AlertTriangle, Play, Square } from 'lucide-react';
import { ClassData, ScheduledClass, AIRecommendation } from '../types';
import { aiService } from '../utils/aiService';
import { generateIntelligentSchedule } from '../utils/classUtils';

interface DailyAIOptimizerProps {
  isOpen: boolean;
  onClose: () => void;
  csvData: ClassData[];
  currentSchedule: ScheduledClass[];
  onOptimize: (optimizedSchedule: ScheduledClass[]) => void;
  isDarkMode: boolean;
}

const DailyAIOptimizer: React.FC<DailyAIOptimizerProps> = ({
  isOpen,
  onClose,
  csvData,
  currentSchedule,
  onOptimize,
  isDarkMode
}) => {
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [selectedRecommendations, setSelectedRecommendations] = useState<Set<number>>(new Set());
  const [optimizationIteration, setOptimizationIteration] = useState(0);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const locations = ['Kwality House, Kemps Corner', 'Supreme HQ, Bandra', 'Kenkere House'];

  // Peak hours by location
  const peakHours = {
    'Supreme HQ, Bandra': ['19:00', '18:00', '09:00'],
    'Kwality House, Kemps Corner': ['11:00', '10:00', '09:00'],
    'Kenkere House': ['18:00', '19:00', '10:00']
  };

  // Low attendance hours by location
  const lowAttendanceHours = {
    'Supreme HQ, Bandra': ['13:00', '16:00', '20:00'],
    'Kwality House, Kemps Corner': ['12:00', '16:00', '18:00'],
    'Kenkere House': ['13:00', '15:00', '20:00']
  };

  const generateDayOptimization = async () => {
    setIsOptimizing(true);
    setRecommendations([]);

    try {
      const dayRecommendations: AIRecommendation[] = [];
      
      // Get top performing classes for the day
      const topClasses = csvData
        .filter(item => item.dayOfWeek === selectedDay && item.participants > 5)
        .sort((a, b) => b.participants - a.participants)
        .slice(0, 20);

      // Generate recommendations for each location
      for (const location of locations) {
        const locationPeakHours = peakHours[location as keyof typeof peakHours] || ['09:00', '18:00', '19:00'];
        const locationLowHours = lowAttendanceHours[location as keyof typeof lowAttendanceHours] || ['13:00', '16:00'];
        
        // Morning shift (7:30-12:00)
        const morningSlots = ['07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00'];
        
        // Evening shift (17:30-20:00)
        const eveningSlots = ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00'];
        
        // Balance between morning and evening
        const allSlots = [...morningSlots, ...eveningSlots];
        
        for (const time of allSlots) {
          // Skip low attendance hours unless it's a beginner class
          if (locationLowHours.includes(time)) continue;
          
          // Prioritize peak hours
          const isPeakHour = locationPeakHours.includes(time);
          
          try {
            const recs = await aiService.generateRecommendations(csvData, selectedDay, time, location);
            
            // Filter and enhance recommendations
            const enhancedRecs = recs
              .filter(rec => rec.expectedParticipants > 3) // Minimum viable class size
              .map(rec => ({
                ...rec,
                priority: Math.min(5, Math.max(1, isPeakHour ? rec.priority + 1 : rec.priority)),
                reasoning: `${rec.reasoning} ${isPeakHour ? '(Peak hour optimization)' : ''}`,
                timeSlot: time,
                location: location
              }))
              .slice(0, 2); // Top 2 per slot
            
            dayRecommendations.push(...enhancedRecs);
          } catch (error) {
            console.warn(`Failed to get recommendations for ${location} ${selectedDay} ${time}:`, error);
            
            // Fallback to top performing classes for this slot
            const slotClasses = topClasses.filter(cls => 
              cls.location === location && 
              cls.classTime.includes(time.slice(0, 5))
            );
            
            if (slotClasses.length > 0) {
              const bestClass = slotClasses[0];
              dayRecommendations.push({
                classFormat: bestClass.cleanedClass,
                teacher: bestClass.teacherName,
                reasoning: `Top performing class for this slot (${bestClass.participants} avg participants)`,
                confidence: 0.8,
                expectedParticipants: bestClass.participants,
                expectedRevenue: bestClass.totalRevenue,
                priority: isPeakHour ? 5 : 3,
                timeSlot: time,
                location: location
              });
            }
          }
        }
      }

      // Sort by priority and ensure variety
      const sortedRecommendations = dayRecommendations
        .sort((a, b) => b.priority - a.priority)
        .filter((rec, index, arr) => {
          // Ensure no duplicate class formats in same time slot
          const sameSlot = arr.filter(r => r.timeSlot === rec.timeSlot && r.location === rec.location);
          const sameFormat = sameSlot.filter(r => r.classFormat === rec.classFormat);
          return sameFormat.indexOf(rec) === 0;
        });

      setRecommendations(sortedRecommendations);
    } catch (error) {
      console.error('Error generating day optimization:', error);
      alert('Error generating recommendations. Please check your AI configuration.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleFullDayOptimization = async () => {
    setIsOptimizing(true);
    
    try {
      // Generate intelligent schedule for the selected day
      const daySchedule = await generateIntelligentSchedule(csvData, [], {
        prioritizeTopPerformers: true,
        balanceShifts: true,
        optimizeTeacherHours: true,
        respectTimeRestrictions: true,
        minimizeTrainersPerShift: true,
        targetDay: selectedDay,
        iteration: optimizationIteration
      });

      // Filter for selected day only
      const dayClasses = daySchedule.filter(cls => cls.day === selectedDay);
      
      // Remove existing classes for this day and add new ones
      const otherDayClasses = currentSchedule.filter(cls => cls.day !== selectedDay);
      const updatedSchedule = [...otherDayClasses, ...dayClasses];

      setOptimizationIteration(prev => prev + 1);
      onOptimize(updatedSchedule);
      onClose();
      
      alert(`Generated optimized schedule for ${selectedDay} with ${dayClasses.length} classes (iteration ${optimizationIteration + 1})`);
    } catch (error) {
      console.error('Error in full day optimization:', error);
      alert('Error optimizing day. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApplySelected = () => {
    const selectedRecs = recommendations.filter((_, index) => selectedRecommendations.has(index));
    
    if (selectedRecs.length === 0) {
      alert('Please select at least one recommendation to apply.');
      return;
    }

    // Convert recommendations to scheduled classes
    const newClasses: ScheduledClass[] = selectedRecs.map((rec, index) => ({
      id: `daily-ai-${selectedDay}-${Date.now()}-${index}`,
      day: selectedDay,
      time: rec.timeSlot || '09:00',
      location: rec.location || locations[0],
      classFormat: rec.classFormat,
      teacherFirstName: rec.teacher.split(' ')[0] || '',
      teacherLastName: rec.teacher.split(' ').slice(1).join(' ') || '',
      duration: '1',
      participants: rec.expectedParticipants,
      revenue: rec.expectedRevenue,
      isTopPerformer: rec.priority >= 4
    }));

    // Remove existing classes for this day and add new ones
    const otherDayClasses = currentSchedule.filter(cls => cls.day !== selectedDay);
    const updatedSchedule = [...otherDayClasses, ...newClasses];

    onOptimize(updatedSchedule);
    onClose();
  };

  const toggleRecommendation = (index: number) => {
    const newSelected = new Set(selectedRecommendations);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRecommendations(newSelected);
  };

  useEffect(() => {
    if (isOpen) {
      generateDayOptimization();
    }
  }, [isOpen, selectedDay]);

  if (!isOpen) return null;

  const modalBg = isDarkMode 
    ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
    : 'bg-gradient-to-br from-white to-gray-50';
  
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`${modalBg} rounded-2xl shadow-2xl max-w-6xl w-full m-4 max-h-[90vh] overflow-y-auto border ${borderColor}`}>
        <div className={`flex items-center justify-between p-6 border-b ${borderColor} bg-gradient-to-r from-purple-600/20 to-pink-600/20`}>
          <div className="flex items-center">
            <div className="p-2 bg-purple-500/20 rounded-lg mr-3">
              <Zap className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${textPrimary}`}>Daily AI Optimizer</h2>
              <p className={textSecondary}>Intelligent day-specific scheduling with load balancing</p>
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
          {/* Day Selection */}
          <div className="mb-6">
            <label className={`block text-sm font-medium ${textSecondary} mb-3`}>
              Select Day for Optimization
            </label>
            <div className="grid grid-cols-7 gap-2">
              {days.map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`p-3 rounded-xl font-medium transition-all duration-200 ${
                    selectedDay === day
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : isDarkMode
                        ? 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-gray-600'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 shadow-sm'
                  }`}
                >
                  <Calendar className="h-4 w-4 mx-auto mb-1" />
                  <div className="text-xs">{day.slice(0, 3)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Optimization Controls */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleFullDayOptimization}
              disabled={isOptimizing}
              className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isOptimizing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                  Optimizing...
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-3" />
                  Full Day Auto-Optimization
                </>
              )}
            </button>

            <button
              onClick={generateDayOptimization}
              disabled={isOptimizing}
              className="flex items-center justify-center px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isOptimizing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Brain className="h-5 w-5 mr-3" />
                  Generate Smart Recommendations
                </>
              )}
            </button>
          </div>

          {/* Optimization Status */}
          <div className={`mb-6 p-4 rounded-xl border ${
            isOptimizing 
              ? 'bg-blue-500/10 border-blue-500/20' 
              : recommendations.length > 0
                ? 'bg-green-500/10 border-green-500/20'
                : 'bg-gray-500/10 border-gray-500/20'
          }`}>
            <div className="flex items-center">
              {isOptimizing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-400 border-t-transparent mr-3"></div>
                  <span className="text-blue-300">Generating AI recommendations for {selectedDay}...</span>
                </>
              ) : recommendations.length > 0 ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-400 mr-3" />
                  <span className="text-green-300">Found {recommendations.length} AI recommendations for {selectedDay}</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-gray-400 mr-3" />
                  <span className={textSecondary}>No recommendations available</span>
                </>
              )}
            </div>
          </div>

          {/* Recommendations Grid */}
          {recommendations.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${textPrimary}`}>
                  Smart Recommendations for {selectedDay}
                </h3>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setSelectedRecommendations(new Set(recommendations.map((_, i) => i)))}
                    className="text-sm text-purple-400 hover:text-purple-300"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedRecommendations(new Set())}
                    className="text-sm text-gray-400 hover:text-gray-300"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.map((rec, index) => (
                  <div
                    key={index}
                    onClick={() => toggleRecommendation(index)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                      selectedRecommendations.has(index)
                        ? 'border-purple-500 bg-purple-500/20'
                        : isDarkMode
                          ? 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                          : 'border-gray-300 bg-white hover:border-gray-400 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`font-medium ${textPrimary}`}>{rec.classFormat}</div>
                      <div className="flex items-center space-x-2">
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          rec.priority >= 4 ? 'bg-green-500/20 text-green-300' :
                          rec.priority >= 3 ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-gray-500/20 text-gray-300'
                        }`}>
                          Priority {rec.priority}
                        </div>
                        {selectedRecommendations.has(index) && (
                          <CheckCircle className="h-4 w-4 text-purple-400" />
                        )}
                      </div>
                    </div>

                    <div className={`text-sm ${textSecondary} mb-3`}>
                      <strong>Teacher:</strong> {rec.teacher}
                    </div>

                    <div className={`text-sm ${textSecondary} mb-3`}>
                      <strong>Time:</strong> {rec.timeSlot} at {rec.location?.split(',')[0]}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="text-center p-2 bg-blue-500/10 rounded-lg">
                        <Users className="h-4 w-4 text-blue-400 mx-auto mb-1" />
                        <div className="text-sm font-medium text-blue-300">{rec.expectedParticipants}</div>
                        <div className="text-xs text-blue-400">Participants</div>
                      </div>
                      <div className="text-center p-2 bg-green-500/10 rounded-lg">
                        <TrendingUp className="h-4 w-4 text-green-400 mx-auto mb-1" />
                        <div className="text-sm font-medium text-green-300">₹{rec.expectedRevenue}</div>
                        <div className="text-xs text-green-400">Revenue</div>
                      </div>
                    </div>

                    <div className="text-xs text-purple-300 mb-3">
                      {rec.reasoning}
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className={textSecondary}>
                        Confidence: {(rec.confidence * 100).toFixed(0)}%
                      </span>
                      {rec.priority >= 4 && (
                        <Star className="h-3 w-3 text-yellow-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
              onClick={handleApplySelected}
              disabled={selectedRecommendations.size === 0}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply Selected ({selectedRecommendations.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyAIOptimizer;