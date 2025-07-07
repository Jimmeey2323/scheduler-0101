import React, { useState, useRef, useEffect } from 'react';
import { Clock, Users, TrendingUp, Star, Lock, Zap, Award, Calendar, Target, ChevronDown, ChevronUp, Filter, Eye, Edit, ChevronLeft, ChevronRight, AlertTriangle, Shield, EyeOff, Plus } from 'lucide-react';
import { ClassData, ScheduledClass, AIRecommendation } from '../types';
import { getClassAverageForSlot, getTimeSlotsWithData, getClassesAtTimeSlot, getAvailableTimeSlots, getRestrictedTimeSlots, isTimeRestricted, ALL_TIME_SLOTS, hasHistoricalData, getBestSlotRecommendation, getDetailedHistoricAnalysis } from '../utils/classUtils';
import { aiService } from '../utils/aiService';
import DayViewModal from './DayViewModal';

interface WeeklyCalendarProps {
  location: string;
  csvData: ClassData[];
  scheduledClasses: ScheduledClass[];
  onSlotClick: (day: string, time: string, location: string) => void;
  onClassEdit: (classData: ScheduledClass) => void;
  lockedClasses?: Set<string>;
  theme: any;
  allowRestrictedScheduling: boolean;
}

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  location,
  csvData,
  scheduledClasses,
  onSlotClick,
  onClassEdit,
  lockedClasses = new Set(),
  theme,
  allowRestrictedScheduling
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [showRestrictedSlots, setShowRestrictedSlots] = useState(false);
  const [dateRange, setDateRange] = useState('all');
  const [minParticipants, setMinParticipants] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showDayView, setShowDayView] = useState(false);
  const [currentSlotIndex, setCurrentSlotIndex] = useState<Record<string, number>>({});
  const [hoveredSlot, setHoveredSlot] = useState<{ day: string; time: string } | null>(null);
  const [slotRecommendations, setSlotRecommendations] = useState<AIRecommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Enhanced time slots with ALL 15-minute intervals
  const availableTimeSlots = ALL_TIME_SLOTS.filter(time => {
    const hour = parseInt(time.split(':')[0]);
    return (hour >= 7 && hour <= 12) || (hour >= 16 && hour <= 20);
  });
  
  const restrictedTimeSlots = getRestrictedTimeSlots();
  
  // Conditionally include restricted slots based on toggle
  const allTimeSlots = showRestrictedSlots 
    ? [...availableTimeSlots, ...restrictedTimeSlots].sort()
    : availableTimeSlots;

  const priorityTeachers = ['Anisha', 'Vivaran', 'Mrigakshi', 'Pranjali', 'Atulan', 'Cauveri', 'Rohan'];
  const timeSlotsWithData = getTimeSlotsWithData(csvData, location);

  // Load recommendations for hovered slot
  useEffect(() => {
    if (hoveredSlot) {
      loadSlotRecommendations(hoveredSlot.day, hoveredSlot.time);
    }
  }, [hoveredSlot]);

  const loadSlotRecommendations = async (day: string, time: string) => {
    setLoadingRecommendations(true);
    try {
      const recommendations = await aiService.generateRecommendations(csvData, day, time, location);
      setSlotRecommendations(recommendations.slice(0, 5)); // Top 5 recommendations
    } catch (error) {
      console.error('Failed to load slot recommendations:', error);
      // Fallback to best historical recommendation
      const bestRecommendation = getBestSlotRecommendation(csvData, location, day, time);
      if (bestRecommendation) {
        setSlotRecommendations([{
          classFormat: bestRecommendation.classFormat,
          teacher: bestRecommendation.teacher,
          reasoning: `Best historical performance: ${bestRecommendation.avgCheckedIn.toFixed(1)} avg check-ins`,
          confidence: 0.8,
          expectedParticipants: Math.round(bestRecommendation.avgCheckedIn),
          expectedRevenue: Math.round(bestRecommendation.avgCheckedIn * 500),
          priority: 5
        }]);
      } else {
        setSlotRecommendations([]);
      }
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleDayClick = (day: string) => {
    setSelectedDay(day);
    setShowDayView(true);
  };

  const handleClassClick = (e: React.MouseEvent, scheduledClass: ScheduledClass) => {
    e.stopPropagation();
    onClassEdit(scheduledClass);
  };

  const handleSlotClickInternal = (day: string, time: string, location: string) => {
    const isRestricted = isTimeRestricted(time, day);
    
    if (isRestricted && !allowRestrictedScheduling) {
      alert('Scheduling in restricted time slots is disabled. Enable it in Studio Settings to schedule private classes during this time.');
      return;
    }
    
    onSlotClick(day, time, location);
  };

  const handleRecommendationClick = (recommendation: AIRecommendation, day: string, time: string) => {
    // Create a scheduled class from the recommendation and trigger scheduling
    const teacherParts = recommendation.teacher.split(' ');
    const scheduledClass = {
      id: `rec-${Date.now()}`,
      day,
      time,
      location,
      classFormat: recommendation.classFormat,
      teacherFirstName: teacherParts[0] || '',
      teacherLastName: teacherParts.slice(1).join(' ') || '',
      duration: '1', // Default duration
      participants: recommendation.expectedParticipants,
      revenue: recommendation.expectedRevenue,
      isTopPerformer: recommendation.priority >= 4
    };
    
    // Trigger the scheduling directly
    onSlotClick(day, time, location);
  };

  const navigateSlot = (day: string, time: string, direction: 'prev' | 'next') => {
    const slotKey = `${day}-${time}`;
    const classes = getScheduledClasses(day, time);
    const currentIndex = currentSlotIndex[slotKey] || 0;
    
    if (direction === 'prev') {
      setCurrentSlotIndex(prev => ({
        ...prev,
        [slotKey]: Math.max(0, currentIndex - 1)
      }));
    } else {
      setCurrentSlotIndex(prev => ({
        ...prev,
        [slotKey]: Math.min(classes.length - 1, currentIndex + 1)
      }));
    }
  };

  const getHistoricData = (day: string, time: string) => {
    // Only show historic data for time slots that actually have data
    if (!timeSlotsWithData.has(time)) return null;

    return getDetailedHistoricAnalysis(csvData, location, day, time);
  };

  const getScheduledClasses = (day: string, time: string) => {
    return getClassesAtTimeSlot(scheduledClasses, day, time, location);
  };

  const getTeacherAvatar = (teacherName: string) => {
    const initials = teacherName.split(' ').map(n => n[0]).join('').toUpperCase();
    const isPriority = priorityTeachers.some(name => teacherName.includes(name));
    
    return (
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs ${
        isPriority ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
        'bg-gradient-to-r from-purple-500 to-pink-500'
      }`}>
        {initials}
      </div>
    );
  };

  const renderCell = (day: string, time: string) => {
    const historicData = getHistoricData(day, time);
    const scheduledClassesInSlot = getScheduledClasses(day, time);
    const slotKey = `${day}-${time}`;
    const currentIndex = currentSlotIndex[slotKey] || 0;
    const currentClass = scheduledClassesInSlot[currentIndex];
    const isRestricted = isTimeRestricted(time, day);
    const hasPrivateClass = scheduledClassesInSlot.some(cls => cls.isPrivate);
    const hasHistorical = hasHistoricalData(csvData, location, day, time);
    const isHovered = hoveredSlot?.day === day && hoveredSlot?.time === time;
    
    // Apply filters
    if (historicData && historicData.avgAttendanceWithEmpty < minParticipants) {
      return (
        <div
          key={`${day}-${time}`}
          className={`relative h-32 border cursor-pointer transition-all duration-300 ${theme.card}`}
        />
      );
    }
    
    return (
      <div
        key={`${day}-${time}`}
        onClick={() => {
          if (scheduledClassesInSlot.length === 0) {
            handleSlotClickInternal(day, time, location);
          }
        }}
        onMouseEnter={() => {
          if (scheduledClassesInSlot.length === 0 && hasHistorical) {
            setHoveredSlot({ day, time });
          }
        }}
        onMouseLeave={() => {
          setHoveredSlot(null);
          setSlotRecommendations([]);
        }}
        className={`relative h-32 border cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] group ${
          scheduledClassesInSlot.length > 0
            ? `bg-gradient-to-br from-green-400/20 to-emerald-500/20 hover:from-green-400/30 hover:to-emerald-500/30 border-green-400/50`
            : isRestricted
              ? `bg-gradient-to-br from-red-400/10 to-orange-500/10 hover:from-red-400/20 hover:to-orange-500/20 border-red-400/30`
              : historicData 
                ? `bg-gradient-to-br from-blue-400/10 to-cyan-500/10 hover:from-blue-400/20 hover:to-cyan-500/20 border-blue-400/30` 
                : `${theme.card} hover:bg-gray-700/50`
        }`}
      >
        {/* Restricted Time Indicator */}
        {isRestricted && scheduledClassesInSlot.length === 0 && (
          <div className="absolute top-1 left-1 z-10">
            <div className="flex items-center px-2 py-1 rounded text-xs bg-red-500/20 text-red-300">
              <Shield className="h-3 w-3 mr-1" />
              <span>Private Only</span>
            </div>
          </div>
        )}

        {scheduledClassesInSlot.length > 0 && (
          <div className="absolute inset-0 p-2 overflow-hidden">
            {/* Navigation for multiple classes */}
            {scheduledClassesInSlot.length > 1 && (
              <div className="absolute top-1 right-1 flex space-x-1 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateSlot(day, time, 'prev');
                  }}
                  disabled={currentIndex === 0}
                  className="p-1 rounded hover:bg-gray-700/70 disabled:opacity-50 bg-gray-800/70 text-white"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <span className="px-2 py-1 text-xs rounded bg-gray-800/70 text-white">
                  {currentIndex + 1}/{scheduledClassesInSlot.length}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateSlot(day, time, 'next');
                  }}
                  disabled={currentIndex === scheduledClassesInSlot.length - 1}
                  className="p-1 rounded hover:bg-gray-700/70 disabled:opacity-50 bg-gray-800/70 text-white"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Current class display */}
            {currentClass && (
              <div
                onClick={(e) => handleClassClick(e, currentClass)}
                className={`p-2 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-all duration-200 h-full ${
                  currentClass.isTopPerformer 
                    ? 'bg-yellow-400/20 border-yellow-400 hover:bg-yellow-400/30'
                    : currentClass.isPrivate 
                    ? 'bg-purple-400/20 border-purple-400 hover:bg-purple-400/30'
                    : 'bg-green-400/20 border-green-400 hover:bg-green-400/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className={`text-xs font-semibold truncate flex-1 ${
                    currentClass.isTopPerformer 
                      ? 'text-yellow-200'
                      : currentClass.isPrivate 
                      ? 'text-purple-200'
                      : 'text-green-200'
                  }`}>
                    {currentClass.classFormat}
                  </div>
                  <div className="flex items-center space-x-1 ml-1">
                    {currentClass.isTopPerformer && <Star className="h-3 w-3 text-yellow-400" />}
                    {lockedClasses.has(currentClass.id) && <Lock className="h-3 w-3 text-red-400" />}
                    {currentClass.isPrivate && <Shield className="h-3 w-3 text-purple-400" />}
                    {currentClass.isHosted && <Users className="h-3 w-3 text-blue-400" />}
                    <Edit className="h-3 w-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    {getTeacherAvatar(`${currentClass.teacherFirstName} ${currentClass.teacherLastName}`)}
                    <div className={`ml-2 text-xs truncate ${
                      currentClass.isTopPerformer 
                        ? 'text-yellow-300'
                        : currentClass.isPrivate 
                        ? 'text-purple-300'
                        : 'text-green-300'
                    }`}>
                      {currentClass.isHosted ? 'Hosted' : currentClass.teacherFirstName}
                    </div>
                  </div>
                  <div className="text-xs text-gray-300">
                    {parseFloat(currentClass.duration) * 60}min
                  </div>
                </div>
                
                {currentClass.participants && (
                  <div className="text-xs flex items-center text-gray-300">
                    <Users className="h-3 w-3 mr-1" />
                    {currentClass.participants}
                  </div>
                )}

                {currentClass.coverTeacher && (
                  <div className="text-xs text-gray-400 mt-1">
                    Cover: {currentClass.coverTeacher.split(' ')[0]}
                  </div>
                )}

                {currentClass.clientDetails && (
                  <div className="text-xs text-blue-400 mt-1">
                    Client: {currentClass.clientDetails}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Show restricted time message for empty restricted slots */}
        {isRestricted && scheduledClassesInSlot.length === 0 && (
          <div className="absolute inset-0 p-2 flex items-center justify-center">
            <div className="text-center">
              <AlertTriangle className="h-4 w-4 mx-auto mb-1 text-red-400" />
              <div className="text-xs font-medium text-red-300">Restricted</div>
              <div className="text-xs text-red-400">Private Only</div>
            </div>
          </div>
        )}
        
        {/* Show historic data for available slots */}
        {historicData && scheduledClassesInSlot.length === 0 && !isRestricted && (
          <div className="absolute inset-0 p-2 flex items-center justify-center">
            <div className="text-center">
              <div className="text-xs font-medium text-blue-300">
                {historicData.totalClasses} classes
              </div>
              <div className="text-xs text-gray-400">
                {historicData.avgAttendanceWithEmpty.toFixed(1)} avg
              </div>
              <div className="flex justify-center mt-1">
                <div className="w-2 h-2 rounded-full opacity-60 bg-blue-400"></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Enhanced Hover Tooltip with Top 5 AI Recommendations */}
        {(historicData || scheduledClassesInSlot.length > 0 || isRestricted || (isHovered && hasHistorical)) && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-96 rounded-xl p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20 shadow-2xl bg-gray-900 text-white border border-gray-700">
            {scheduledClassesInSlot.length > 0 ? (
              <div>
                <div className="font-semibold mb-3 flex items-center text-white">
                  <Zap className="h-4 w-4 mr-2 text-blue-400" />
                  Scheduled Classes ({scheduledClassesInSlot.length})
                </div>
                
                <div className="space-y-3">
                  {scheduledClassesInSlot.map((cls, index) => (
                    <div key={cls.id} className="p-3 rounded-lg bg-gray-800">
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <div>
                          <div className="text-gray-400">Class:</div>
                          <div className="font-medium text-white">{cls.classFormat}</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Duration:</div>
                          <div className="font-medium text-white">{parseFloat(cls.duration) * 60} mins</div>
                        </div>
                        <div>
                          <div className="text-gray-400">Teacher:</div>
                          <div className="font-medium flex items-center text-white">
                            {getTeacherAvatar(`${cls.teacherFirstName} ${cls.teacherLastName}`)}
                            <span className="ml-2">
                              {cls.isHosted ? 'Hosted Class' : `${cls.teacherFirstName} ${cls.teacherLastName}`}
                            </span>
                          </div>
                        </div>
                        {cls.participants && (
                          <div>
                            <div className="text-gray-400">Expected:</div>
                            <div className="text-green-400 font-medium">{cls.participants} participants</div>
                          </div>
                        )}
                      </div>

                      {cls.isTopPerformer && (
                        <div className="p-2 rounded-lg bg-yellow-500/20">
                          <div className="text-xs font-medium flex items-center text-yellow-300">
                            <Award className="h-3 w-3 mr-1" />
                            Top performing class
                          </div>
                        </div>
                      )}

                      {cls.isPrivate && (
                        <div className="p-2 rounded-lg mt-2 bg-purple-500/20">
                          <div className="text-xs font-medium flex items-center text-purple-300">
                            <Shield className="h-3 w-3 mr-1" />
                            Private session
                          </div>
                        </div>
                      )}

                      {cls.isHosted && cls.clientDetails && (
                        <div className="p-2 rounded-lg mt-2 bg-blue-500/20">
                          <div className="text-xs font-medium text-blue-300">
                            Client: {cls.clientDetails}
                          </div>
                        </div>
                      )}

                      {cls.coverTeacher && (
                        <div className="p-2 rounded-lg mt-2 bg-blue-500/20">
                          <div className="text-xs font-medium text-blue-300">
                            Cover Teacher: {cls.coverTeacher}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : isRestricted ? (
              <div>
                <div className="font-semibold mb-3 flex items-center text-white">
                  <AlertTriangle className="h-4 w-4 mr-2 text-red-400" />
                  Restricted Time Slot
                </div>
                <div className="p-3 rounded-lg bg-red-500/20">
                  <div className="text-sm mb-2 text-red-300">
                    <strong>12:00 PM - 5:00 PM Restriction</strong>
                  </div>
                  <div className="text-xs space-y-1 text-red-200">
                    <div>• Only private classes allowed during this time</div>
                    <div>• Regular group classes are restricted</div>
                    {allowRestrictedScheduling ? (
                      <div>• Click to schedule a private session</div>
                    ) : (
                      <div>• Enable in Studio Settings to schedule here</div>
                    )}
                  </div>
                </div>
              </div>
            ) : isHovered && hasHistorical ? (
              <div>
                <div className="font-semibold mb-3 flex items-center text-white">
                  <Target className="h-4 w-4 mr-2 text-green-400" />
                  Top 5 AI Recommendations for {day} {time}
                </div>
                
                {loadingRecommendations ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-400 border-t-transparent mx-auto mb-2"></div>
                    <div className="text-sm text-gray-400">Loading recommendations...</div>
                  </div>
                ) : slotRecommendations.length > 0 ? (
                  <div className="space-y-2 pointer-events-auto">
                    {slotRecommendations.map((rec, index) => (
                      <div
                        key={index}
                        onClick={() => handleRecommendationClick(rec, day, time)}
                        className="p-3 rounded-lg bg-gray-800 hover:bg-gray-700 cursor-pointer transition-colors border border-gray-600 hover:border-green-500"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-white">{rec.classFormat}</div>
                          <div className="flex items-center space-x-2">
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              index === 0 ? 'bg-yellow-500/20 text-yellow-300' :
                              index === 1 ? 'bg-gray-500/20 text-gray-300' :
                              index === 2 ? 'bg-orange-500/20 text-orange-300' :
                              'bg-blue-500/20 text-blue-300'
                            }`}>
                              #{index + 1}
                            </div>
                            <Plus className="h-4 w-4 text-green-400" />
                          </div>
                        </div>
                        <div className="text-sm text-gray-300 mb-2">
                          <strong>Teacher:</strong> {rec.teacher}
                        </div>
                        <div className="text-xs text-gray-400 mb-2">
                          {rec.reasoning}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-green-400">{rec.expectedParticipants} participants</span>
                          <span className="text-blue-400">₹{rec.expectedRevenue}</span>
                        </div>
                      </div>
                    ))}
                    <div className="text-xs text-center text-gray-400 mt-2">
                      Click any recommendation to schedule instantly
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-sm text-gray-400">No recommendations available for this slot</div>
                  </div>
                )}
              </div>
            ) : historicData ? (
              <div>
                <div className="font-semibold mb-3 flex items-center text-white">
                  <TrendingUp className="h-4 w-4 mr-2 text-blue-400" />
                  Enhanced Historic Performance Analysis
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <div className="text-gray-400">Total Classes:</div>
                    <div className="font-medium text-white">{historicData.totalClasses}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Avg Check-ins:</div>
                    <div className="text-green-400 font-medium">{historicData.avgAttendanceWithEmpty.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Total Check-ins:</div>
                    <div className="text-blue-400 font-medium">{historicData.totalCheckedIn}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Empty Classes:</div>
                    <div className="text-red-400 font-medium">{historicData.emptyClasses}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Total Revenue:</div>
                    <div className="text-green-400 font-medium">₹{Math.round(historicData.totalRevenue / 1000)}K</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Revenue/Class:</div>
                    <div className="text-green-400 font-medium">₹{Math.round(historicData.revenuePerClass)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Fill Rate:</div>
                    <div className="text-blue-400 font-medium">{historicData.avgFillRate.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Adjusted Score:</div>
                    <div className="text-purple-400 font-medium">{historicData.adjustedScore.toFixed(2)}</div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <div className="text-xs font-medium mb-1 text-blue-300">Top 3 Teacher Recommendations:</div>
                    {historicData.topTeacherRecommendations.map((teacher, index) => (
                      <div key={index} className="text-xs text-blue-200">
                        {index + 1}. {teacher.teacher} (Score: {teacher.weightedAvg}, {teacher.classCount} classes)
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="p-2 rounded-lg bg-green-500/20">
                  <div className="text-xs flex items-center text-green-300">
                    <Target className="h-3 w-3 mr-1" />
                    Click to schedule a class for this time slot
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  // Calculate summary stats for this location
  const locationClasses = scheduledClasses.filter(cls => cls.location === location);
  const totalClasses = locationClasses.length;
  const topPerformers = locationClasses.filter(cls => cls.isTopPerformer).length;
  const privateClasses = locationClasses.filter(cls => cls.isPrivate).length;
  const hostedClasses = locationClasses.filter(cls => cls.isHosted).length;
  const totalParticipants = locationClasses.reduce((sum, cls) => sum + (cls.participants || 0), 0);
  const avgParticipants = totalClasses > 0 ? parseFloat((totalParticipants / totalClasses).toFixed(1)) : 0;

  // Get class mix by day
  const classMixByDay = days.reduce((acc, day) => {
    const dayClasses = locationClasses.filter(cls => cls.day === day);
    acc[day] = dayClasses.reduce((formatAcc, cls) => {
      formatAcc[cls.classFormat] = (formatAcc[cls.classFormat] || 0) + 1;
      return formatAcc;
    }, {} as Record<string, number>);
    return acc;
  }, {} as Record<string, Record<string, number>>);

  return (
    <>
      <div className={`backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border ${theme.card}`}>
        <div className={`p-6 border-b bg-gradient-to-r ${theme.secondary}/30`}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className={`text-2xl font-bold ${theme.text}`}>{location}</h2>
              <p className={theme.textSecondary}>Enhanced Weekly Schedule with AI recommendations on hover</p>
            </div>
            
            {/* Location Summary Stats */}
            <div className="grid grid-cols-5 gap-4 text-center">
              <div className={`p-3 rounded-lg border bg-blue-500/20 border-blue-500/30`}>
                <div className={`text-lg font-bold ${theme.text}`}>{totalClasses}</div>
                <div className="text-xs text-blue-300">Total Classes</div>
              </div>
              <div className={`p-3 rounded-lg border bg-yellow-500/20 border-yellow-500/30`}>
                <div className={`text-lg font-bold ${theme.text}`}>{topPerformers}</div>
                <div className="text-xs text-yellow-300">Top Performers</div>
              </div>
              <div className={`p-3 rounded-lg border bg-purple-500/20 border-purple-500/30`}>
                <div className={`text-lg font-bold ${theme.text}`}>{privateClasses}</div>
                <div className="text-xs text-purple-300">Private Classes</div>
              </div>
              <div className={`p-3 rounded-lg border bg-indigo-500/20 border-indigo-500/30`}>
                <div className={`text-lg font-bold ${theme.text}`}>{hostedClasses}</div>
                <div className="text-xs text-indigo-300">Hosted Classes</div>
              </div>
              <div className={`p-3 rounded-lg border bg-green-500/20 border-green-500/30`}>
                <div className={`text-lg font-bold ${theme.text}`}>{avgParticipants.toFixed(1)}</div>
                <div className="text-xs text-green-300">Avg Participants</div>
              </div>
            </div>
          </div>

          {/* Class Mix Display */}
          <div className="mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${theme.card} hover:scale-105`}
              >
                <Filter className={`h-4 w-4 mr-2 ${theme.accent}`} />
                <span className={theme.text}>Class Mix & Filters</span>
                {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </button>

              <button
                onClick={() => setShowRestrictedSlots(!showRestrictedSlots)}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  showRestrictedSlots
                    ? 'bg-red-600/50 hover:bg-red-500/50 text-red-200'
                    : `${theme.card} ${theme.textSecondary}`
                }`}
              >
                {showRestrictedSlots ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                <span>{showRestrictedSlots ? 'Hide' : 'Show'} Restricted Slots</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs bg-gray-600 text-gray-300`}>
                  {restrictedTimeSlots.length}
                </span>
              </button>
            </div>
            
            {showFilters && (
              <div className={`mt-4 p-4 rounded-lg border ${theme.card}`}>
                {/* Class Mix by Day */}
                <div className="mb-6">
                  <h4 className={`text-sm font-medium ${theme.textSecondary} mb-3`}>Class Mix by Day</h4>
                  <div className="grid grid-cols-7 gap-2">
                    {days.map(day => (
                      <div key={day} className={`p-3 rounded-lg border ${theme.card}`}>
                        <div className={`text-sm font-medium ${theme.text} mb-2`}>{day.slice(0, 3)}</div>
                        <div className="space-y-1">
                          {Object.entries(classMixByDay[day] || {}).map(([format, count]) => (
                            <div key={format} className="text-xs">
                              <span className={theme.textSecondary}>{format.split(' ').slice(-1)[0]}:</span>
                              <span className={`ml-1 ${theme.text}`}>{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
                      Date Range
                    </label>
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme.card} ${theme.text}`}
                    >
                      <option value="all">All Time</option>
                      <option value="last30">Last 30 Days</option>
                      <option value="last90">Last 90 Days</option>
                      <option value="last180">Last 6 Months</option>
                      <option value="lastyear">Last Year</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
                      Min Check-ins
                    </label>
                    <input
                      type="number"
                      value={minParticipants}
                      onChange={(e) => setMinParticipants(parseInt(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme.card} ${theme.text}`}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setDateRange('all');
                        setMinParticipants(0);
                      }}
                      className={`px-4 py-2 rounded-lg transition-colors ${theme.button}`}
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-yellow-400 to-amber-500 rounded mr-2"></div>
              <span className={theme.textSecondary}>Top Performer</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded mr-2"></div>
              <span className={theme.textSecondary}>Private Class</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-indigo-400 to-blue-500 rounded mr-2"></div>
              <span className={theme.textSecondary}>Hosted Class</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded mr-2"></div>
              <span className={theme.textSecondary}>Regular Class</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gradient-to-r from-red-400 to-orange-500 rounded mr-2"></div>
              <span className={theme.textSecondary}>Restricted (Private Only)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded mr-2 bg-gradient-to-r from-blue-400 to-cyan-500"></div>
              <span className={theme.textSecondary}>Historic Data (Hover for AI)</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded mr-2 bg-gray-600`}></div>
              <span className={theme.textSecondary}>Available</span>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <div className="min-w-full">
            {/* Header */}
            <div className={`grid grid-cols-8 ${theme.card}`}>
              <div className={`p-4 text-sm font-semibold ${theme.textSecondary} border-b`}>
                <Clock className="h-4 w-4 inline mr-2" />
                Time
              </div>
              {days.map(day => (
                <div 
                  key={day} 
                  onClick={() => handleDayClick(day)}
                  className={`p-4 text-sm font-semibold ${theme.textSecondary} border-b text-center cursor-pointer transition-colors group hover:bg-gray-700/70`}
                >
                  <div className="flex items-center justify-center">
                    <span className={theme.text}>{day}</span>
                    <Eye className="h-3 w-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className={`text-xs ${theme.textSecondary} mt-1`}>
                    {scheduledClasses.filter(cls => cls.location === location && cls.day === day).length} classes
                  </div>
                </div>
              ))}
            </div>
            
            {/* Time slots - ALL 15-minute intervals */}
            {allTimeSlots.map(time => (
              <div key={time} className="grid grid-cols-8 transition-colors hover:bg-gray-700/20">
                <div className={`p-3 text-sm font-medium ${theme.textSecondary} border-b flex items-center ${theme.card}`}>
                  <div>
                    <div className={`font-semibold flex items-center ${theme.text}`}>
                      <span>{time}</span>
                      {isTimeRestricted(time, 'Monday') && (
                        <AlertTriangle className="h-3 w-3 ml-2 text-red-400" />
                      )}
                    </div>
                    <div className={`text-xs ${theme.textSecondary}`}>
                      {scheduledClasses.filter(cls => cls.location === location && cls.time === time).length} scheduled
                    </div>
                  </div>
                </div>
                {days.map(day => renderCell(day, time))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Day View Modal */}
      <DayViewModal
        isOpen={showDayView}
        onClose={() => setShowDayView(false)}
        day={selectedDay || ''}
        location={location}
        csvData={csvData}
        scheduledClasses={scheduledClasses}
        onSlotClick={handleSlotClickInternal}
        theme={theme}
      />
    </>
  );
};

export default WeeklyCalendar;