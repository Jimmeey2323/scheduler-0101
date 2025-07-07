import React, { useState, useEffect } from 'react';
import { X, Brain, TrendingUp, Users, Clock, Target, Zap, CheckCircle, AlertTriangle, Settings, Save } from 'lucide-react';
import { ClassData, ScheduledClass, OptimizationSuggestion } from '../types';
import { validateTeacherHours, calculateTeacherHours, getBestTeacherForClass, getClassAverageForSlot } from '../utils/classUtils';

interface SmartOptimizerProps {
  isOpen: boolean;
  onClose: () => void;
  csvData: ClassData[];
  currentSchedule: ScheduledClass[];
  onOptimize: (optimizedSchedule: ScheduledClass[]) => void;
  isDarkMode: boolean;
}

interface StudioRules {
  maxWeeklyHours: number;
  maxDailyHours: number;
  minDaysOff: number;
  maxConsecutiveClasses: number;
  maxTrainersPerShift: number;
  minParticipantsThreshold: number;
  priorityTeachers: string[];
  newTrainerMaxHours: number;
  newTrainerFormats: string[];
  restrictedHours: {
    start: string;
    end: string;
    privateOnly: boolean;
  };
  weekendStartTimes: {
    saturday: string;
    sunday: string;
  };
  weekdayStartTime: string;
  locationRules: {
    [location: string]: {
      maxParallelClasses: number;
      allowedFormats: string[];
      restrictedFormats: string[];
    };
  };
}

const SmartOptimizer: React.FC<SmartOptimizerProps> = ({
  isOpen,
  onClose,
  csvData,
  currentSchedule,
  onOptimize,
  isDarkMode
}) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState('suggestions');
  const [studioRules, setStudioRules] = useState<StudioRules>({
    maxWeeklyHours: 15,
    maxDailyHours: 4,
    minDaysOff: 2,
    maxConsecutiveClasses: 2,
    maxTrainersPerShift: 3,
    minParticipantsThreshold: 5.0,
    priorityTeachers: ['Anisha', 'Vivaran', 'Mrigakshi', 'Pranjali', 'Atulan', 'Cauveri', 'Rohan'],
    newTrainerMaxHours: 10,
    newTrainerFormats: ['Studio Barre 57', 'Studio Barre 57 (Express)', 'Studio powerCycle', 'Studio powerCycle (Express)', 'Studio Cardio Barre'],
    restrictedHours: {
      start: '12:00',
      end: '17:00',
      privateOnly: true
    },
    weekendStartTimes: {
      saturday: '08:30',
      sunday: '10:00'
    },
    weekdayStartTime: '07:30',
    locationRules: {
      'Supreme HQ, Bandra': {
        maxParallelClasses: 3,
        allowedFormats: ['Studio powerCycle', 'Studio powerCycle (Express)'],
        restrictedFormats: ['Studio HIIT', 'Studio Amped Up!']
      },
      'Kwality House, Kemps Corner': {
        maxParallelClasses: 2,
        allowedFormats: [],
        restrictedFormats: ['Studio powerCycle', 'Studio powerCycle (Express)']
      },
      'Kenkere House': {
        maxParallelClasses: 2,
        allowedFormats: [],
        restrictedFormats: ['Studio powerCycle', 'Studio powerCycle (Express)']
      }
    }
  });

  useEffect(() => {
    // Load saved rules from localStorage
    const savedRules = localStorage.getItem('studioRules');
    if (savedRules) {
      setStudioRules(JSON.parse(savedRules));
    }
  }, []);

  const saveStudioRules = () => {
    localStorage.setItem('studioRules', JSON.stringify(studioRules));
    alert('Studio rules saved successfully!');
  };

  const generateOptimizations = () => {
    setIsOptimizing(true);
    setSuggestions([]);

    try {
      const newSuggestions: OptimizationSuggestion[] = [];
      const teacherHours = calculateTeacherHours(currentSchedule);

      // 1. Teacher Hour Optimization
      Object.entries(teacherHours).forEach(([teacher, hours]) => {
        const isNewTrainer = studioRules.newTrainerFormats.some(format => 
          teacher.toLowerCase().includes('kabir') || teacher.toLowerCase().includes('simonelle')
        );
        const maxHours = isNewTrainer ? studioRules.newTrainerMaxHours : studioRules.maxWeeklyHours;

        if (hours > maxHours) {
          // Find classes to redistribute
          const teacherClasses = currentSchedule.filter(cls => 
            `${cls.teacherFirstName} ${cls.teacherLastName}` === teacher
          );
          
          const excessHours = hours - maxHours;
          let redistributedHours = 0;
          
          for (const cls of teacherClasses) {
            if (redistributedHours >= excessHours) break;
            
            // Find alternative teacher
            const alternativeTeacher = findAlternativeTeacher(cls, teacherHours, studioRules);
            
            if (alternativeTeacher) {
              newSuggestions.push({
                type: 'teacher_change',
                originalClass: cls,
                suggestedClass: {
                  ...cls,
                  teacherFirstName: alternativeTeacher.split(' ')[0],
                  teacherLastName: alternativeTeacher.split(' ').slice(1).join(' ')
                },
                reason: `${teacher} exceeds ${maxHours}h limit (currently ${hours.toFixed(1)}h)`,
                impact: `Reduces ${teacher}'s hours by ${cls.duration}h`,
                priority: 9
              });
              
              redistributedHours += parseFloat(cls.duration);
            }
          }
        } else if (hours < (maxHours - 3) && studioRules.priorityTeachers.some(pt => teacher.includes(pt))) {
          // Suggest adding classes for underutilized priority teachers
          const availableHours = maxHours - hours;
          const potentialClasses = findPotentialClassesForTeacher(teacher, currentSchedule, csvData, studioRules);
          
          for (const potentialClass of potentialClasses.slice(0, 2)) {
            if (parseFloat(potentialClass.duration) <= availableHours) {
              newSuggestions.push({
                type: 'new_class',
                suggestedClass: potentialClass,
                reason: `${teacher} is underutilized (${hours.toFixed(1)}h/${maxHours}h)`,
                impact: `Increases ${teacher}'s hours to ${(hours + parseFloat(potentialClass.duration)).toFixed(1)}h`,
                priority: 7
              });
            }
          }
        }
      });

      // 2. Class Performance Optimization
      currentSchedule.forEach(cls => {
        const classAverage = getClassAverageForSlot(csvData, cls.classFormat, cls.location, cls.day, cls.time);
        const teacherAverage = getClassAverageForSlot(csvData, cls.classFormat, cls.location, cls.day, cls.time, `${cls.teacherFirstName} ${cls.teacherLastName}`);
        
        if (classAverage.average > studioRules.minParticipantsThreshold && teacherAverage.average < classAverage.average - 2) {
          const betterTeacher = getBestTeacherForClass(csvData, cls.classFormat, cls.location, cls.day, cls.time);
          
          if (betterTeacher && betterTeacher !== `${cls.teacherFirstName} ${cls.teacherLastName}`) {
            const validation = validateTeacherHours(currentSchedule, {
              ...cls,
              teacherFirstName: betterTeacher.split(' ')[0],
              teacherLastName: betterTeacher.split(' ').slice(1).join(' ')
            });
            
            if (validation.isValid) {
              newSuggestions.push({
                type: 'teacher_change',
                originalClass: cls,
                suggestedClass: {
                  ...cls,
                  teacherFirstName: betterTeacher.split(' ')[0],
                  teacherLastName: betterTeacher.split(' ').slice(1).join(' ')
                },
                reason: `${betterTeacher} has better performance for this class (${classAverage.average.toFixed(1)} vs ${teacherAverage.average.toFixed(1)} avg participants)`,
                impact: `Expected +${(classAverage.average - teacherAverage.average).toFixed(1)} participants`,
                priority: 8
              });
            }
          }
        }
      });

      // 3. Time Slot Optimization
      const timeSlotIssues = findTimeSlotIssues(currentSchedule, studioRules);
      timeSlotIssues.forEach(issue => {
        newSuggestions.push(issue);
      });

      // 4. Location Rule Compliance
      const locationIssues = findLocationRuleViolations(currentSchedule, studioRules);
      locationIssues.forEach(issue => {
        newSuggestions.push(issue);
      });

      // Sort by priority and limit to top 15 suggestions
      const sortedSuggestions = newSuggestions
        .sort((a, b) => b.priority - a.priority)
        .slice(0, 15);

      setSuggestions(sortedSuggestions);
    } catch (error) {
      console.error('Error generating optimizations:', error);
      alert('Error generating optimizations. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const findAlternativeTeacher = (cls: ScheduledClass, teacherHours: any, rules: StudioRules): string | null => {
    const allTeachers = Object.keys(teacherHours);
    
    for (const teacher of allTeachers) {
      if (teacher === `${cls.teacherFirstName} ${cls.teacherLastName}`) continue;
      
      const isNewTrainer = rules.newTrainerFormats.some(format => 
        teacher.toLowerCase().includes('kabir') || teacher.toLowerCase().includes('simonelle')
      );
      const maxHours = isNewTrainer ? rules.newTrainerMaxHours : rules.maxWeeklyHours;
      
      if (teacherHours[teacher] + parseFloat(cls.duration) <= maxHours) {
        // Check if teacher can teach this format
        if (isNewTrainer && !rules.newTrainerFormats.includes(cls.classFormat)) {
          continue;
        }
        
        return teacher;
      }
    }
    
    return null;
  };

  const findPotentialClassesForTeacher = (teacher: string, schedule: ScheduledClass[], csvData: ClassData[], rules: StudioRules): ScheduledClass[] => {
    // Find successful classes this teacher has taught
    const teacherClasses = csvData.filter(item => 
      item.teacherName === teacher && 
      item.participants >= rules.minParticipantsThreshold
    );
    
    if (teacherClasses.length === 0) return [];
    
    // Find best performing class formats for this teacher
    const formatStats = teacherClasses.reduce((acc, item) => {
      if (!acc[item.cleanedClass]) {
        acc[item.cleanedClass] = { participants: 0, count: 0 };
      }
      acc[item.cleanedClass].participants += item.participants;
      acc[item.cleanedClass].count += 1;
      return acc;
    }, {} as any);
    
    const bestFormats = Object.entries(formatStats)
      .map(([format, stats]: [string, any]) => ({
        format,
        avgParticipants: stats.participants / stats.count
      }))
      .sort((a, b) => b.avgParticipants - a.avgParticipants)
      .slice(0, 3);
    
    // Generate potential classes
    const potentialClasses: ScheduledClass[] = [];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const timeSlots = ['07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '17:30', '18:00', '18:30', '19:00', '19:30'];
    const locations = ['Kwality House, Kemps Corner', 'Supreme HQ, Bandra', 'Kenkere House'];
    
    for (const { format } of bestFormats) {
      for (const location of locations) {
        for (const day of days) {
          for (const time of timeSlots) {
            // Check if slot is available
            const existingClass = schedule.find(cls => 
              cls.location === location && cls.day === day && cls.time === time
            );
            
            if (!existingClass) {
              potentialClasses.push({
                id: `potential-${Date.now()}-${Math.random()}`,
                day,
                time,
                location,
                classFormat: format,
                teacherFirstName: teacher.split(' ')[0],
                teacherLastName: teacher.split(' ').slice(1).join(' '),
                duration: '1',
                participants: Math.round(formatStats[format].participants / formatStats[format].count)
              });
            }
          }
        }
      }
    }
    
    return potentialClasses.slice(0, 5);
  };

  const findTimeSlotIssues = (schedule: ScheduledClass[], rules: StudioRules): OptimizationSuggestion[] => {
    const issues: OptimizationSuggestion[] = [];
    
    // Check for classes during restricted hours
    schedule.forEach(cls => {
      const hour = parseInt(cls.time.split(':')[0]);
      const restrictedStart = parseInt(rules.restrictedHours.start.split(':')[0]);
      const restrictedEnd = parseInt(rules.restrictedHours.end.split(':')[0]);
      
      if (hour >= restrictedStart && hour < restrictedEnd && !cls.isPrivate && rules.restrictedHours.privateOnly) {
        issues.push({
          type: 'time_change',
          originalClass: cls,
          suggestedClass: {
            ...cls,
            isPrivate: true
          },
          reason: `Class scheduled during restricted hours (${rules.restrictedHours.start}-${rules.restrictedHours.end})`,
          impact: 'Convert to private class or reschedule',
          priority: 8
        });
      }
    });
    
    return issues;
  };

  const findLocationRuleViolations = (schedule: ScheduledClass[], rules: StudioRules): OptimizationSuggestion[] => {
    const issues: OptimizationSuggestion[] = [];
    
    schedule.forEach(cls => {
      const locationRule = rules.locationRules[cls.location];
      if (!locationRule) return;
      
      // Check restricted formats
      if (locationRule.restrictedFormats.includes(cls.classFormat)) {
        issues.push({
          type: 'format_change',
          originalClass: cls,
          suggestedClass: {
            ...cls,
            classFormat: locationRule.allowedFormats[0] || 'Studio Barre 57'
          },
          reason: `${cls.classFormat} is not allowed at ${cls.location}`,
          impact: 'Change to allowed format',
          priority: 9
        });
      }
    });
    
    return issues;
  };

  const toggleSuggestion = (index: number) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSuggestions(newSelected);
  };

  const applySelectedOptimizations = () => {
    const selectedSugs = suggestions.filter((_, index) => selectedSuggestions.has(index));
    
    if (selectedSugs.length === 0) {
      alert('Please select at least one optimization to apply.');
      return;
    }
    
    let optimizedSchedule = [...currentSchedule];
    
    selectedSugs.forEach(suggestion => {
      switch (suggestion.type) {
        case 'teacher_change':
          if (suggestion.originalClass) {
            const classIndex = optimizedSchedule.findIndex(cls => cls.id === suggestion.originalClass!.id);
            if (classIndex > -1) {
              optimizedSchedule[classIndex] = suggestion.suggestedClass;
            }
          }
          break;
        case 'new_class':
          optimizedSchedule.push(suggestion.suggestedClass);
          break;
        case 'time_change':
        case 'format_change':
          if (suggestion.originalClass) {
            const classIndex = optimizedSchedule.findIndex(cls => cls.id === suggestion.originalClass!.id);
            if (classIndex > -1) {
              optimizedSchedule[classIndex] = suggestion.suggestedClass;
            }
          }
          break;
      }
    });
    
    onOptimize(optimizedSchedule);
    onClose();
  };

  useEffect(() => {
    if (isOpen && activeTab === 'suggestions') {
      generateOptimizations();
    }
  }, [isOpen, activeTab]);

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
            <Brain className="h-6 w-6 text-purple-400 mr-3" />
            <div>
              <h2 className={`text-xl font-bold ${textPrimary}`}>Smart Schedule Optimizer</h2>
              <p className={textSecondary}>AI-powered optimization with rule compliance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`${textSecondary} hover:${textPrimary} transition-colors p-2 hover:bg-gray-700 rounded-lg`}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${borderColor}`}>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`flex-1 py-4 px-6 font-medium transition-colors ${
              activeTab === 'suggestions'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                : `${textSecondary} hover:${textPrimary}`
            }`}
          >
            <Target className="h-5 w-5 inline mr-2" />
            Optimization Suggestions
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 py-4 px-6 font-medium transition-colors ${
              activeTab === 'rules'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                : `${textSecondary} hover:${textPrimary}`
            }`}
          >
            <Settings className="h-5 w-5 inline mr-2" />
            Studio Rules
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'suggestions' && (
            <div className="space-y-6">
              {isOptimizing ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>Analyzing Schedule...</h3>
                  <p className={textSecondary}>Finding optimization opportunities while respecting all rules</p>
                </div>
              ) : (
                <>
                  {/* Summary */}
                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-6 rounded-xl border border-purple-500/20">
                    <h3 className={`text-lg font-semibold ${textPrimary} mb-4 flex items-center`}>
                      <Zap className="h-5 w-5 mr-2 text-purple-400" />
                      Optimization Summary
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${textPrimary}`}>{suggestions.length}</div>
                        <div className="text-sm text-purple-300">Suggestions Found</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${textPrimary}`}>{selectedSuggestions.size}</div>
                        <div className="text-sm text-green-300">Selected</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${textPrimary}`}>
                          {suggestions.filter(s => s.priority >= 8).length}
                        </div>
                        <div className="text-sm text-red-300">High Priority</div>
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setSelectedSuggestions(new Set(suggestions.map((_, i) => i)))}
                        className="text-sm text-purple-400 hover:text-purple-300"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setSelectedSuggestions(new Set())}
                        className="text-sm text-gray-400 hover:text-gray-300"
                      >
                        Clear All
                      </button>
                      <button
                        onClick={() => setSelectedSuggestions(new Set(
                          suggestions.map((s, i) => s.priority >= 8 ? i : -1).filter(i => i >= 0)
                        ))}
                        className="text-sm text-red-400 hover:text-red-300"
                      >
                        Select High Priority
                      </button>
                    </div>
                    <button
                      onClick={generateOptimizations}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Refresh Suggestions
                    </button>
                  </div>

                  {/* Suggestions */}
                  {suggestions.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-3" />
                      <h3 className={`text-lg font-semibold ${textPrimary} mb-2`}>Schedule is Well Optimized!</h3>
                      <p className={textSecondary}>No significant optimization opportunities found that comply with studio rules.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          onClick={() => toggleSuggestion(index)}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                            selectedSuggestions.has(index)
                              ? 'border-purple-500 bg-purple-500/20'
                              : isDarkMode
                                ? 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                                : 'border-gray-300 bg-white hover:border-gray-400 shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-3 ${
                                  suggestion.type === 'teacher_change' ? 'bg-blue-100 text-blue-800' :
                                  suggestion.type === 'time_change' ? 'bg-yellow-100 text-yellow-800' :
                                  suggestion.type === 'format_change' ? 'bg-purple-100 text-purple-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {suggestion.type === 'teacher_change' ? 'Teacher Change' :
                                   suggestion.type === 'time_change' ? 'Time Change' :
                                   suggestion.type === 'format_change' ? 'Format Change' :
                                   'New Class'}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  suggestion.priority >= 8 ? 'bg-red-500/20 text-red-300' :
                                  suggestion.priority >= 6 ? 'bg-yellow-500/20 text-yellow-300' :
                                  'bg-green-500/20 text-green-300'
                                }`}>
                                  Priority {suggestion.priority}
                                </span>
                              </div>
                              
                              <div className={`text-sm ${textPrimary} mb-1`}>
                                <strong>{suggestion.suggestedClass.classFormat}</strong> - 
                                {suggestion.suggestedClass.day} at {suggestion.suggestedClass.time} 
                                ({suggestion.suggestedClass.location})
                              </div>
                              
                              <div className={`text-sm ${textSecondary} mb-2`}>
                                {suggestion.reason}
                              </div>
                              
                              <div className={`text-sm font-medium ${textPrimary}`}>
                                Impact: {suggestion.impact}
                              </div>
                            </div>
                            
                            <div className="flex items-center ml-4">
                              {selectedSuggestions.has(index) && (
                                <CheckCircle className="h-5 w-5 text-purple-400" />
                              )}
                              {suggestion.priority >= 8 && (
                                <AlertTriangle className="h-4 w-4 text-red-400 ml-2" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 rounded-xl border border-blue-500/20">
                <h3 className={`text-lg font-semibold ${textPrimary} mb-4 flex items-center`}>
                  <Settings className="h-5 w-5 mr-2 text-blue-400" />
                  Studio Rules Configuration
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Teacher Rules */}
                  <div className="space-y-4">
                    <h4 className={`font-medium ${textPrimary}`}>Teacher Constraints</h4>
                    
                    <div>
                      <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                        Max Weekly Hours
                      </label>
                      <input
                        type="number"
                        value={studioRules.maxWeeklyHours}
                        onChange={(e) => setStudioRules(prev => ({ ...prev, maxWeeklyHours: parseInt(e.target.value) || 15 }))}
                        className={`w-full px-3 py-2 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        min="1"
                        max="20"
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                        Max Daily Hours
                      </label>
                      <input
                        type="number"
                        value={studioRules.maxDailyHours}
                        onChange={(e) => setStudioRules(prev => ({ ...prev, maxDailyHours: parseInt(e.target.value) || 4 }))}
                        className={`w-full px-3 py-2 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        min="1"
                        max="8"
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                        Minimum Days Off per Week
                      </label>
                      <input
                        type="number"
                        value={studioRules.minDaysOff}
                        onChange={(e) => setStudioRules(prev => ({ ...prev, minDaysOff: parseInt(e.target.value) || 2 }))}
                        className={`w-full px-3 py-2 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        min="1"
                        max="3"
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                        New Trainer Max Hours
                      </label>
                      <input
                        type="number"
                        value={studioRules.newTrainerMaxHours}
                        onChange={(e) => setStudioRules(prev => ({ ...prev, newTrainerMaxHours: parseInt(e.target.value) || 10 }))}
                        className={`w-full px-3 py-2 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        min="1"
                        max="15"
                      />
                    </div>
                  </div>

                  {/* Scheduling Rules */}
                  <div className="space-y-4">
                    <h4 className={`font-medium ${textPrimary}`}>Scheduling Rules</h4>
                    
                    <div>
                      <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                        Min Participants Threshold
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={studioRules.minParticipantsThreshold}
                        onChange={(e) => setStudioRules(prev => ({ ...prev, minParticipantsThreshold: parseFloat(e.target.value) || 5.0 }))}
                        className={`w-full px-3 py-2 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        min="0"
                        max="20"
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                        Max Trainers per Shift
                      </label>
                      <input
                        type="number"
                        value={studioRules.maxTrainersPerShift}
                        onChange={(e) => setStudioRules(prev => ({ ...prev, maxTrainersPerShift: parseInt(e.target.value) || 3 }))}
                        className={`w-full px-3 py-2 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        min="1"
                        max="5"
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                        Weekday Start Time
                      </label>
                      <input
                        type="time"
                        value={studioRules.weekdayStartTime}
                        onChange={(e) => setStudioRules(prev => ({ ...prev, weekdayStartTime: e.target.value }))}
                        className={`w-full px-3 py-2 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                          Saturday Start
                        </label>
                        <input
                          type="time"
                          value={studioRules.weekendStartTimes.saturday}
                          onChange={(e) => setStudioRules(prev => ({ 
                            ...prev, 
                            weekendStartTimes: { ...prev.weekendStartTimes, saturday: e.target.value }
                          }))}
                          className={`w-full px-3 py-2 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                          Sunday Start
                        </label>
                        <input
                          type="time"
                          value={studioRules.weekendStartTimes.sunday}
                          onChange={(e) => setStudioRules(prev => ({ 
                            ...prev, 
                            weekendStartTimes: { ...prev.weekendStartTimes, sunday: e.target.value }
                          }))}
                          className={`w-full px-3 py-2 ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={saveStudioRules}
                    className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Rules
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          {activeTab === 'suggestions' && (
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
              <button
                onClick={onClose}
                className={`px-6 py-3 ${textSecondary} hover:${textPrimary} transition-colors`}
              >
                Cancel
              </button>
              <button
                onClick={applySelectedOptimizations}
                disabled={selectedSuggestions.size === 0}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply Selected ({selectedSuggestions.size})
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartOptimizer;