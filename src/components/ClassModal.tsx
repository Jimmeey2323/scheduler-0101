import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, Users, MapPin, AlertTriangle, Brain, TrendingUp, Star, Zap, Target, Award, Calendar, User, Sparkles, Shield, Filter, Search, Plus } from 'lucide-react';
import { ClassData, ScheduledClass, TeacherHours, AIRecommendation, CustomTeacher, TeacherAvailability, HistoricClassRow } from '../types';
import { getClassDuration, validateTeacherHours, getClassAverageForSlot, getBestTeacherForClass, getUniqueTeachers, getClassFormatsForDay, isClassAllowedAtLocation, ALL_TIME_SLOTS, getHistoricalClassRows, getDetailedHistoricAnalysis } from '../utils/classUtils';
import { aiService } from '../utils/aiService';

interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSlot: { day: string; time: string; location: string };
  csvData: ClassData[];
  teacherHours: TeacherHours;
  customTeachers: CustomTeacher[];
  teacherAvailability: TeacherAvailability;
  scheduledClasses: ScheduledClass[];
  onSchedule: (classData: ScheduledClass) => void;
  editingClass?: ScheduledClass | null;
  theme: any;
  allowRestrictedScheduling: boolean;
}

const ClassModal: React.FC<ClassModalProps> = ({
  isOpen,
  onClose,
  selectedSlot,
  csvData,
  teacherHours,
  customTeachers,
  teacherAvailability,
  scheduledClasses,
  onSchedule,
  editingClass,
  theme,
  allowRestrictedScheduling
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedTime, setSelectedTime] = useState(selectedSlot.time);
  const [duration, setDuration] = useState('1');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isHosted, setIsHosted] = useState(false);
  const [clientDetails, setClientDetails] = useState('');
  const [expectedParticipants, setExpectedParticipants] = useState<number>(0);
  const [aiRecommendations, setAiRecommendations] = useState<AIRecommendation[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [activeTab, setActiveTab] = useState('form');
  const [coverTeacher, setCoverTeacher] = useState('');
  const [historicRows, setHistoricRows] = useState<HistoricClassRow[]>([]);
  const [historicFilters, setHistoricFilters] = useState({
    classFormat: '',
    teacher: '',
    minCheckedIn: 0
  });
  const [historicGroupBy, setHistoricGroupBy] = useState<'none' | 'classFormat' | 'teacher'>('none');

  // Get unique values for dropdowns - filter by location rules
  const uniqueClasses = [...new Set(csvData
    .filter(item => 
      item.location === selectedSlot.location && 
      !item.cleanedClass.toLowerCase().includes('hosted') &&
      isClassAllowedAtLocation(item.cleanedClass, selectedSlot.location)
    )
    .map(item => item.cleanedClass)
  )];

  const allTeachers = getUniqueTeachers(csvData, customTeachers)
    .filter(teacher => !teacher.includes('Nishanth') && !teacher.includes('Saniya')); // Exclude inactive trainers

  // Enhanced time slots with ALL 15-minute intervals
  const timeSlots = ALL_TIME_SLOTS.filter(time => {
    const hour = parseInt(time.split(':')[0]);
    return (hour >= 6 && hour <= 12) || (hour >= 17 && hour <= 21);
  });

  const priorityTeachers = ['Anisha', 'Vivaran', 'Mrigakshi', 'Pranjali', 'Atulan', 'Cauveri', 'Rohan'];
  const newTrainers = ['Kabir', 'Simonelle'];
  const newTrainerFormats = ['Studio Barre 57', 'Studio Barre 57 (Express)', 'Studio powerCycle', 'Studio powerCycle (Express)', 'Studio Cardio Barre'];

  // Get class formats for the selected day to show counts
  const dayClassFormats = getClassFormatsForDay(scheduledClasses, selectedSlot.day);

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

  // Load historical data for analytics tab
  useEffect(() => {
    if (activeTab === 'analytics') {
      const rows = getHistoricalClassRows(csvData, selectedSlot.location, selectedSlot.day, selectedSlot.time, historicFilters);
      setHistoricRows(rows);
    }
  }, [activeTab, selectedSlot, csvData, historicFilters]);

  // Populate form when editing a class
  useEffect(() => {
    if (editingClass) {
      setSelectedClass(editingClass.classFormat);
      setSelectedTeacher(`${editingClass.teacherFirstName} ${editingClass.teacherLastName}`);
      setSelectedTime(editingClass.time);
      setDuration(editingClass.duration);
      setIsPrivate(editingClass.isPrivate || false);
      setIsHosted(editingClass.isHosted || false);
      setClientDetails(editingClass.clientDetails || '');
      setExpectedParticipants(editingClass.participants || 0);
      setCoverTeacher(editingClass.coverTeacher || '');
    } else {
      // Reset form for new class
      setSelectedClass('');
      setSelectedTeacher('');
      setSelectedTime(selectedSlot.time);
      setDuration('1');
      setIsPrivate(false);
      setIsHosted(false);
      setClientDetails('');
      setExpectedParticipants(0);
      setCoverTeacher('');
    }
  }, [editingClass, selectedSlot]);

  // Load AI recommendations when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAIRecommendations();
    }
  }, [isOpen, selectedSlot]);

  // Update duration when class is selected
  useEffect(() => {
    if (selectedClass) {
      const classDuration = getClassDuration(selectedClass);
      setDuration(classDuration);
      
      // Get class average and set expected participants
      const classAverage = getClassAverageForSlot(csvData, selectedClass, selectedSlot.location, selectedSlot.day, selectedTime);
      setExpectedParticipants(Math.round(classAverage.average));
    }
  }, [selectedClass, selectedSlot, selectedTime, csvData]);

  const loadAIRecommendations = async () => {
    setIsLoadingAI(true);
    try {
      const recommendations = await aiService.generateRecommendations(
        csvData,
        selectedSlot.day,
        selectedSlot.time,
        selectedSlot.location
      );
      // Ensure priority is 1-5 scale and get top 5
      const scaledRecommendations = recommendations
        .map(rec => ({
          ...rec,
          priority: Math.min(5, Math.max(1, Math.ceil(rec.priority / 2)))
        }))
        .slice(0, 5); // Top 5 recommendations
      setAiRecommendations(scaledRecommendations);
    } catch (error) {
      console.error('Failed to load AI recommendations:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Get enhanced historic data for recommendations
  const getEnhancedHistoricData = () => {
    const detailedAnalysis = getDetailedHistoricAnalysis(csvData, selectedSlot.location, selectedSlot.day, selectedSlot.time);
    
    if (!detailedAnalysis) return null;
    
    return {
      ...detailedAnalysis,
      // Additional calculated metrics
      classStatus: detailedAnalysis.avgAttendanceWithEmpty >= 8 ? 'High Performing' :
                  detailedAnalysis.avgAttendanceWithEmpty >= 5 ? 'Good' :
                  detailedAnalysis.avgAttendanceWithEmpty >= 3 ? 'Average' : 'Poor',
      popularity: detailedAnalysis.totalClasses >= 10 ? 'High' :
                 detailedAnalysis.totalClasses >= 5 ? 'Medium' : 'Low',
      consistency: (detailedAnalysis.nonEmptyClasses / detailedAnalysis.totalClasses) >= 0.8 ? 'High' :
                  (detailedAnalysis.nonEmptyClasses / detailedAnalysis.totalClasses) >= 0.6 ? 'Medium' : 'Low'
    };
  };

  // Check if teacher is approaching hour limit
  const getTeacherValidation = (teacherName: string) => {
    if (!teacherName) return null;
    
    const mockClass: ScheduledClass = {
      id: 'temp',
      day: selectedSlot.day,
      time: selectedTime,
      location: selectedSlot.location,
      classFormat: selectedClass || 'Test Class',
      teacherFirstName: teacherName.split(' ')[0] || '',
      teacherLastName: teacherName.split(' ').slice(1).join(' ') || '',
      duration: duration
    };

    return validateTeacherHours(
      Object.entries(teacherHours).map(([name, hours]) => ({
        id: `existing-${name}`,
        teacherFirstName: name.split(' ')[0],
        teacherLastName: name.split(' ').slice(1).join(' '),
        duration: hours.toString(),
        day: 'Monday',
        time: '09:00',
        location: selectedSlot.location,
        classFormat: 'Existing'
      })),
      mockClass
    );
  };

  const handleAIRecommendationSelect = (recommendation: AIRecommendation) => {
    setSelectedClass(recommendation.classFormat);
    setSelectedTeacher(recommendation.teacher);
    setDuration(getClassDuration(recommendation.classFormat));
    setExpectedParticipants(recommendation.expectedParticipants);
    setActiveTab('form');
  };

  const handleQuickSchedule = (recommendation: AIRecommendation) => {
    const teacherParts = recommendation.teacher.split(' ');
    const scheduledClass: ScheduledClass = {
      id: `quick-${Date.now()}`,
      day: selectedSlot.day,
      time: selectedSlot.time,
      location: selectedSlot.location,
      classFormat: recommendation.classFormat,
      teacherFirstName: teacherParts[0] || '',
      teacherLastName: teacherParts.slice(1).join(' ') || '',
      duration: getClassDuration(recommendation.classFormat),
      participants: recommendation.expectedParticipants,
      revenue: recommendation.expectedRevenue,
      isTopPerformer: recommendation.priority >= 4
    };
    
    onSchedule(scheduledClass);
  };

  const handleSchedule = () => {
    if (!selectedClass || (!selectedTeacher && !isHosted) || !selectedTime) {
      alert('Please fill in all required fields');
      return;
    }

    if (isHosted && !clientDetails.trim()) {
      alert('Please enter client details for hosted class');
      return;
    }

    // Check location-specific rules
    if (!isClassAllowedAtLocation(selectedClass, selectedSlot.location)) {
      if (selectedSlot.location === 'Supreme HQ, Bandra') {
        if (selectedClass.toLowerCase().includes('amped up') || selectedClass.toLowerCase().includes('hiit')) {
          alert('Amped Up and HIIT classes are not allowed at Supreme HQ. Please choose a different class format.');
          return;
        }
      } else {
        if (selectedClass.toLowerCase().includes('powercycle') || selectedClass.toLowerCase().includes('power cycle')) {
          alert('PowerCycle classes can only be scheduled at Supreme HQ. Please choose a different class format or location.');
          return;
        }
      }
    }

    // Check new trainer restrictions
    const isNewTrainer = newTrainers.some(name => selectedTeacher.includes(name));
    if (isNewTrainer && !newTrainerFormats.includes(selectedClass)) {
      alert(`${selectedTeacher} can only teach: ${newTrainerFormats.join(', ')}`);
      return;
    }

    // Check new trainer hour limits
    if (isNewTrainer) {
      const currentHours = teacherHours[selectedTeacher] || 0;
      if (currentHours + parseFloat(duration) > 10) {
        alert(`${selectedTeacher} cannot exceed 10 hours per week (currently ${currentHours.toFixed(1)}h)`);
        return;
      }
    }

    if (!isHosted) {
      const teacher = allTeachers.find(t => t === selectedTeacher);
      const validation = getTeacherValidation(selectedTeacher);
      
      if (validation && !validation.isValid) {
        alert(validation.error);
        return;
      }

      if (validation?.warning) {
        const proceed = confirm(`${validation.warning}\n\nDo you want to proceed?`);
        if (!proceed) return;
      }

      // Check if selected teacher is optimal for this class
      const bestTeacher = getBestTeacherForClass(csvData, selectedClass, selectedSlot.location, selectedSlot.day, selectedTime);
      const classAverage = getClassAverageForSlot(csvData, selectedClass, selectedSlot.location, selectedSlot.day, selectedTime);
      const teacherClassAverage = getClassAverageForSlot(csvData, selectedClass, selectedSlot.location, selectedSlot.day, selectedTime, selectedTeacher);

      if (bestTeacher && bestTeacher !== selectedTeacher && teacherClassAverage.average < classAverage.average) {
        const proceed = confirm(
          `Warning: ${selectedTeacher} has an average of ${teacherClassAverage.average.toFixed(1)} check-ins for this class, ` +
          `while ${bestTeacher} has ${classAverage.average.toFixed(1)} check-ins. ` +
          `Consider assigning ${bestTeacher} for better performance.\n\nDo you want to proceed with ${selectedTeacher}?`
        );
        if (!proceed) return;
      }
    }

    const scheduledClass: ScheduledClass = {
      id: editingClass ? editingClass.id : `${selectedSlot.day}-${selectedTime}-${selectedSlot.location}-${Date.now()}`,
      day: selectedSlot.day,
      time: selectedTime,
      location: selectedSlot.location,
      classFormat: selectedClass,
      teacherFirstName: isHosted ? 'Hosted' : (selectedTeacher.split(' ')[0] || ''),
      teacherLastName: isHosted ? 'Client' : (selectedTeacher.split(' ').slice(1).join(' ') || ''),
      duration: duration,
      participants: expectedParticipants || undefined,
      isPrivate: isPrivate,
      isHosted: isHosted,
      clientDetails: isHosted ? clientDetails : undefined,
      coverTeacher: coverTeacher || undefined
    };

    onSchedule(scheduledClass);
  };

  const getTeacherAvatar = (teacherName: string) => {
    const initials = teacherName.split(' ').map(n => n[0]).join('').toUpperCase();
    const isPriority = priorityTeachers.some(name => teacherName.includes(name));
    const isNew = newTrainers.some(name => teacherName.includes(name));
    const teacher = customTeachers.find(t => `${t.firstName} ${t.lastName}` === teacherName);
    
    return (
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm relative ${
        isPriority ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
        isNew ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
        teacher?.isNew ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
        'bg-gradient-to-r from-purple-500 to-pink-500'
      }`}>
        {initials}
        {isPriority && (
          <Star className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400" />
        )}
        {isNew && (
          <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-green-400" />
        )}
      </div>
    );
  };

  const renderEnhancedHistoricAnalytics = () => {
    const enhancedData = getEnhancedHistoricData();
    
    if (!enhancedData) {
      return (
        <div className="text-center py-8">
          <div className={`text-lg font-semibold ${theme.text} mb-2`}>No Historic Data Available</div>
          <div className={theme.textSecondary}>No classes have been held at this time slot previously</div>
        </div>
      );
    }

    const groupedRows = historicGroupBy === 'none' ? { 'All': historicRows } :
      historicRows.reduce((acc, row) => {
        const key = historicGroupBy === 'classFormat' ? row.cleanedClass : row.teacherName;
        if (!acc[key]) acc[key] = [];
        acc[key].push(row);
        return acc;
      }, {} as Record<string, HistoricClassRow[]>);

    return (
      <div className="space-y-6">
        {/* Enhanced Summary Metrics */}
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 rounded-xl border border-blue-500/20">
          <h4 className="font-medium text-blue-300 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Enhanced Historic Analysis - {selectedSlot.day} {selectedSlot.time}
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-500/10 rounded-lg">
              <div className={`text-2xl font-bold ${theme.text}`}>{enhancedData.totalClasses}</div>
              <div className="text-xs text-blue-300">Total Classes</div>
            </div>
            <div className="text-center p-3 bg-green-500/10 rounded-lg">
              <div className={`text-2xl font-bold ${theme.text}`}>{enhancedData.totalCheckedIn}</div>
              <div className="text-xs text-green-300">Total Checked In</div>
            </div>
            <div className="text-center p-3 bg-purple-500/10 rounded-lg">
              <div className={`text-2xl font-bold ${theme.text}`}>{enhancedData.avgAttendanceWithEmpty.toFixed(1)}</div>
              <div className="text-xs text-purple-300">Avg Attendance</div>
            </div>
            <div className="text-center p-3 bg-orange-500/10 rounded-lg">
              <div className={`text-2xl font-bold ${theme.text}`}>₹{Math.round(enhancedData.totalRevenue / 1000)}K</div>
              <div className="text-xs text-orange-300">Total Revenue</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="p-3 bg-gray-500/10 rounded-lg">
              <div className="text-sm text-gray-300 mb-1">Empty Classes</div>
              <div className={`text-lg font-bold ${theme.text}`}>{enhancedData.emptyClasses}</div>
            </div>
            <div className="p-3 bg-gray-500/10 rounded-lg">
              <div className="text-sm text-gray-300 mb-1">Revenue Per Class</div>
              <div className={`text-lg font-bold ${theme.text}`}>₹{Math.round(enhancedData.revenuePerClass)}</div>
            </div>
            <div className="p-3 bg-gray-500/10 rounded-lg">
              <div className="text-sm text-gray-300 mb-1">Fill Rate</div>
              <div className={`text-lg font-bold ${theme.text}`}>{enhancedData.avgFillRate.toFixed(1)}%</div>
            </div>
            <div className="p-3 bg-gray-500/10 rounded-lg">
              <div className="text-sm text-gray-300 mb-1">Late Cancel Rate</div>
              <div className={`text-lg font-bold ${theme.text}`}>{enhancedData.lateCancelRate.toFixed(1)}%</div>
            </div>
            <div className="p-3 bg-gray-500/10 rounded-lg">
              <div className="text-sm text-gray-300 mb-1">Adjusted Score</div>
              <div className={`text-lg font-bold ${theme.text}`}>{enhancedData.adjustedScore.toFixed(2)}</div>
            </div>
            <div className="p-3 bg-gray-500/10 rounded-lg">
              <div className="text-sm text-gray-300 mb-1">Class Status</div>
              <div className={`text-lg font-bold ${
                enhancedData.classStatus === 'High Performing' ? 'text-green-400' :
                enhancedData.classStatus === 'Good' ? 'text-yellow-400' :
                enhancedData.classStatus === 'Average' ? 'text-orange-400' : 'text-red-400'
              }`}>{enhancedData.classStatus}</div>
            </div>
          </div>

          {/* Top Teacher Recommendations */}
          <div className="mb-6">
            <h5 className="font-medium text-blue-300 mb-3">Top 3 Teacher Recommendations (Weighted Avg)</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {enhancedData.topTeacherRecommendations.map((teacher, index) => (
                <div key={index} className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div className="flex items-center justify-between">
                    <div className={`font-medium ${theme.text}`}>{teacher.teacher}</div>
                    <div className="text-blue-400 font-bold">#{index + 1}</div>
                  </div>
                  <div className="text-sm text-blue-300">Score: {teacher.weightedAvg}</div>
                  <div className="text-xs text-gray-400">{teacher.classCount} classes</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gradient-to-r from-gray-500/10 to-gray-600/10 p-4 rounded-xl border border-gray-500/20">
          <h4 className="font-medium text-gray-300 mb-3 flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filters & Grouping
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={`block text-xs font-medium ${theme.textSecondary} mb-1`}>Class Format</label>
              <select
                value={historicFilters.classFormat}
                onChange={(e) => setHistoricFilters(prev => ({ ...prev, classFormat: e.target.value }))}
                className={`w-full px-2 py-1 text-sm ${theme.card} ${theme.text} border ${theme.border} rounded focus:outline-none focus:ring-1 focus:ring-blue-500`}
              >
                <option value="">All Formats</option>
                {[...new Set(historicRows.map(row => row.cleanedClass))].map(format => (
                  <option key={format} value={format}>{format}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium ${theme.textSecondary} mb-1`}>Teacher</label>
              <select
                value={historicFilters.teacher}
                onChange={(e) => setHistoricFilters(prev => ({ ...prev, teacher: e.target.value }))}
                className={`w-full px-2 py-1 text-sm ${theme.card} ${theme.text} border ${theme.border} rounded focus:outline-none focus:ring-1 focus:ring-blue-500`}
              >
                <option value="">All Teachers</option>
                {[...new Set(historicRows.map(row => row.teacherName))].map(teacher => (
                  <option key={teacher} value={teacher}>{teacher}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium ${theme.textSecondary} mb-1`}>Min Check-ins</label>
              <input
                type="number"
                value={historicFilters.minCheckedIn}
                onChange={(e) => setHistoricFilters(prev => ({ ...prev, minCheckedIn: parseInt(e.target.value) || 0 }))}
                className={`w-full px-2 py-1 text-sm ${theme.card} ${theme.text} border ${theme.border} rounded focus:outline-none focus:ring-1 focus:ring-blue-500`}
                min="0"
              />
            </div>
            <div>
              <label className={`block text-xs font-medium ${theme.textSecondary} mb-1`}>Group By</label>
              <select
                value={historicGroupBy}
                onChange={(e) => setHistoricGroupBy(e.target.value as any)}
                className={`w-full px-2 py-1 text-sm ${theme.card} ${theme.text} border ${theme.border} rounded focus:outline-none focus:ring-1 focus:ring-blue-500`}
              >
                <option value="none">No Grouping</option>
                <option value="classFormat">By Class Format</option>
                <option value="teacher">By Teacher</option>
              </select>
            </div>
          </div>
        </div>

        {/* Historic Data Table */}
        <div className="space-y-4">
          {Object.entries(groupedRows).map(([groupKey, rows]) => (
            <div key={groupKey} className={`${theme.card} rounded-xl border ${theme.border}`}>
              {historicGroupBy !== 'none' && (
                <div className="p-3 border-b border-gray-600">
                  <h5 className={`font-medium ${theme.text}`}>{groupKey} ({rows.length} classes)</h5>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${theme.border}`}>
                      <th className={`text-left p-2 ${theme.textSecondary}`}>Date</th>
                      <th className={`text-left p-2 ${theme.textSecondary}`}>Class</th>
                      <th className={`text-left p-2 ${theme.textSecondary}`}>Teacher</th>
                      <th className={`text-right p-2 ${theme.textSecondary}`}>Check-ins</th>
                      <th className={`text-right p-2 ${theme.textSecondary}`}>Participants</th>
                      <th className={`text-right p-2 ${theme.textSecondary}`}>Revenue</th>
                      <th className={`text-right p-2 ${theme.textSecondary}`}>Comps</th>
                      <th className={`text-right p-2 ${theme.textSecondary}`}>Late Cancel</th>
                      <th className={`text-right p-2 ${theme.textSecondary}`}>Tips</th>
                      <th className={`text-right p-2 ${theme.textSecondary}`}>Fill Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const fillRate = row.participants > 0 ? (row.checkedIn / row.participants * 100) : 0;
                      return (
                        <tr key={index} className={`border-b ${theme.border} hover:bg-gray-700/30`}>
                          <td className={`p-2 ${theme.text}`}>{row.classDate}</td>
                          <td className={`p-2 ${theme.text}`}>{row.cleanedClass}</td>
                          <td className={`p-2 ${theme.text}`}>{row.teacherName}</td>
                          <td className={`p-2 text-right font-medium ${row.checkedIn >= 10 ? 'text-green-400' : row.checkedIn >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {row.checkedIn}
                          </td>
                          <td className={`p-2 text-right ${theme.text}`}>{row.participants}</td>
                          <td className={`p-2 text-right ${theme.text}`}>₹{row.totalRevenue.toLocaleString()}</td>
                          <td className={`p-2 text-right ${theme.text}`}>{row.comps}</td>
                          <td className={`p-2 text-right ${theme.text}`}>{row.lateCancellations}</td>
                          <td className={`p-2 text-right ${theme.text}`}>₹{row.tip}</td>
                          <td className={`p-2 text-right ${fillRate >= 80 ? 'text-green-400' : fillRate >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {fillRate.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {rows.length === 0 && (
                <div className="p-8 text-center">
                  <div className={`${theme.textSecondary}`}>No historic data matches the current filters</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div ref={modalRef} className={`${theme.card} rounded-2xl shadow-2xl max-w-7xl w-full m-4 max-h-[95vh] overflow-y-auto border ${theme.border}`}>
        <div className={`flex items-center justify-between p-6 border-b ${theme.border} bg-gradient-to-r from-purple-600/20 to-pink-600/20`}>
          <div>
            <h2 className={`text-xl font-bold ${theme.text}`}>
              {editingClass ? 'Edit Class' : 'Schedule Class'}
            </h2>
            <p className={theme.textSecondary}>AI-powered class scheduling with smart recommendations</p>
          </div>
          <button
            onClick={onClose}
            className={`${theme.textSecondary} hover:${theme.text} transition-colors p-2 hover:bg-gray-700 rounded-lg`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Slot Info */}
        <div className={`p-6 border-b ${theme.border}`}>
          <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 p-4 rounded-xl border border-indigo-500/30">
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-indigo-400 mr-2" />
                <span className={`font-medium ${theme.text}`}>{selectedSlot.day}</span>
              </div>
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-indigo-400 mr-2" />
                <span className={`font-medium ${theme.text}`}>{selectedSlot.time}</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-5 w-5 text-indigo-400 mr-2" />
                <span className={`font-medium ${theme.text}`}>{selectedSlot.location}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${theme.border}`}>
          <button
            onClick={() => setActiveTab('form')}
            className={`flex-1 py-4 px-6 font-medium transition-colors ${
              activeTab === 'form'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                : `${theme.textSecondary} hover:${theme.text}`
            }`}
          >
            <Target className="h-5 w-5 inline mr-2" />
            Class Details
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex-1 py-4 px-6 font-medium transition-colors ${
              activeTab === 'recommendations'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                : `${theme.textSecondary} hover:${theme.text}`
            }`}
          >
            <Brain className="h-5 w-5 inline mr-2" />
            AI Recommendations
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 py-4 px-6 font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                : `${theme.textSecondary} hover:${theme.text}`
            }`}
          >
            <TrendingUp className="h-5 w-5 inline mr-2" />
            Historic Analytics
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'form' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Form */}
              <div className="space-y-6">
                <div>
                  <label className={`block text-sm font-medium ${theme.textSecondary} mb-3`}>
                    Class Format *
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className={`w-full px-4 py-3 ${theme.card} ${theme.text} border ${theme.border} rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  >
                    <option value="">Select a class format</option>
                    {uniqueClasses.map(className => {
                      const dayCount = dayClassFormats[className] || 0;
                      return (
                        <option key={className} value={className}>
                          {className} ({dayCount} scheduled today)
                        </option>
                      );
                    })}
                  </select>
                  {selectedClass && (
                    <div className="mt-2 text-sm text-blue-400">
                      Class average: {getClassAverageForSlot(csvData, selectedClass, selectedSlot.location, selectedSlot.day, selectedTime).average.toFixed(1)} check-ins
                      ({getClassAverageForSlot(csvData, selectedClass, selectedSlot.location, selectedSlot.day, selectedTime).count} historic classes)
                    </div>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium ${theme.textSecondary} mb-3`}>
                    Time Slot * <span className="text-xs text-green-400">(Enhanced: All 15-min intervals available)</span>
                  </label>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className={`w-full px-4 py-3 ${theme.card} ${theme.text} border ${theme.border} rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  >
                    {timeSlots.map(time => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Class Type Selection */}
                <div className="space-y-4">
                  <div>
                    <label className={`flex items-center text-sm ${theme.textSecondary}`}>
                      <input
                        type="checkbox"
                        checked={isHosted}
                        onChange={(e) => {
                          setIsHosted(e.target.checked);
                          if (e.target.checked) {
                            setSelectedTeacher('');
                          }
                        }}
                        className="mr-3 rounded"
                      />
                      Hosted Class Session
                    </label>
                    <p className={`text-xs ${theme.textSecondary} mt-1 ml-6`}>
                      Mark this as a hosted class with client details
                    </p>
                  </div>

                  {isHosted && (
                    <div>
                      <label className={`block text-sm font-medium ${theme.textSecondary} mb-3`}>
                        Client Details *
                      </label>
                      <input
                        type="text"
                        value={clientDetails}
                        onChange={(e) => setClientDetails(e.target.value)}
                        className={`w-full px-4 py-3 ${theme.card} ${theme.text} border ${theme.border} rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                        placeholder="Enter client name and details"
                      />
                    </div>
                  )}

                  <div>
                    <label className={`flex items-center text-sm ${theme.textSecondary}`}>
                      <input
                        type="checkbox"
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                        className="mr-3 rounded"
                      />
                      Private Class Session
                    </label>
                    <p className={`text-xs ${theme.textSecondary} mt-1 ml-6`}>
                      Mark this as a private or specialized session
                    </p>
                  </div>
                </div>

                {!isHosted && (
                  <div>
                    <label className={`block text-sm font-medium ${theme.textSecondary} mb-3`}>
                      Instructor *
                    </label>
                    <select
                      value={selectedTeacher}
                      onChange={(e) => setSelectedTeacher(e.target.value)}
                      className={`w-full px-4 py-3 ${theme.card} ${theme.text} border ${theme.border} rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                    >
                      <option value="">Select an instructor</option>
                      {allTeachers.map(teacher => {
                        const currentHours = teacherHours[teacher] || 0;
                        const isPriority = priorityTeachers.some(name => teacher.includes(name));
                        const isNew = newTrainers.some(name => teacher.includes(name));
                        return (
                          <option key={teacher} value={teacher}>
                            {teacher} ({currentHours.toFixed(1)}h) {isPriority ? '⭐' : ''} {isNew ? '🆕' : ''}
                          </option>
                        );
                      })}
                    </select>
                    {selectedTeacher && selectedClass && (
                      <div className="mt-2 text-sm">
                        <div className="text-green-400">
                          Teacher average for this class: {getClassAverageForSlot(csvData, selectedClass, selectedSlot.location, selectedSlot.day, selectedTime, selectedTeacher).average.toFixed(1)} check-ins
                        </div>
                        {getBestTeacherForClass(csvData, selectedClass, selectedSlot.location, selectedSlot.day, selectedTime) !== selectedTeacher && (
                          <div className="text-yellow-400">
                            Best teacher for this slot: {getBestTeacherForClass(csvData, selectedClass, selectedSlot.location, selectedSlot.day, selectedTime)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium ${theme.textSecondary} mb-3`}>
                      Duration
                    </label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className={`w-full px-4 py-3 ${theme.card} ${theme.text} border ${theme.border} rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                    >
                      <option value="0.5">30 minutes</option>
                      <option value="0.75">45 minutes</option>
                      <option value="1">1 hour</option>
                      <option value="1.5">1.5 hours</option>
                      <option value="2">2 hours</option>
                    </select>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${theme.textSecondary} mb-3`}>
                      Expected Participants
                    </label>
                    <input
                      type="number"
                      value={expectedParticipants}
                      onChange={(e) => setExpectedParticipants(parseInt(e.target.value) || 0)}
                      className={`w-full px-4 py-3 ${theme.card} ${theme.text} border ${theme.border} rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                      placeholder="0"
                      min="0"
                      max="30"
                    />
                  </div>
                </div>

                {!isHosted && (
                  <div>
                    <label className={`block text-sm font-medium ${theme.textSecondary} mb-3`}>
                      Cover/Contingency Teacher
                    </label>
                    <select
                      value={coverTeacher}
                      onChange={(e) => setCoverTeacher(e.target.value)}
                      className={`w-full px-4 py-3 ${theme.card} ${theme.text} border ${theme.border} rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                    >
                      <option value="">Select cover teacher (optional)</option>
                      {allTeachers.filter(t => t !== selectedTeacher).map(teacher => (
                        <option key={teacher} value={teacher}>
                          {teacher}
                        </option>
                      ))}
                    </select>
                    <p className={`text-xs ${theme.textSecondary} mt-1`}>
                      Backup teacher in case primary instructor is unavailable
                    </p>
                  </div>
                )}

                {/* Teacher Validation Warning */}
                {selectedTeacher && !isHosted && getTeacherValidation(selectedTeacher) && (
                  <div className={`p-4 rounded-xl flex items-center border ${
                    getTeacherValidation(selectedTeacher)?.isValid === false
                      ? 'bg-red-500/20 text-red-300 border-red-500/30' 
                      : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                  }`}>
                    <AlertTriangle className="h-5 w-5 mr-3 flex-shrink-0" />
                    <span className="text-sm">
                      {getTeacherValidation(selectedTeacher)?.error || getTeacherValidation(selectedTeacher)?.warning}
                    </span>
                  </div>
                )}
              </div>

              {/* Right Column - Teacher Info & Quick Stats */}
              <div className="space-y-6">
                {(selectedTeacher && !isHosted) && (
                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-6 rounded-xl border border-purple-500/20">
                    <h3 className="font-semibold text-purple-300 mb-4 flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Teacher Profile
                    </h3>
                    <div className="flex items-center mb-4">
                      {getTeacherAvatar(selectedTeacher)}
                      <div className="ml-4">
                        <div className={`font-medium ${theme.text}`}>{selectedTeacher}</div>
                        <div className={`text-sm ${theme.textSecondary}`}>
                          {(teacherHours[selectedTeacher] || 0).toFixed(1)} hours this week
                        </div>
                      </div>
                    </div>
                    
                    {/* Teacher specialties if custom teacher */}
                    {customTeachers.find(t => `${t.firstName} ${t.lastName}` === selectedTeacher)?.specialties && (
                      <div className="mb-4">
                        <div className="text-sm text-purple-300 mb-2">Specialties:</div>
                        <div className="flex flex-wrap gap-2">
                          {customTeachers.find(t => `${t.firstName} ${t.lastName}` === selectedTeacher)?.specialties?.map(specialty => (
                            <span key={specialty} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Teacher availability */}
                    {teacherAvailability[selectedTeacher] && (
                      <div className={`p-3 ${theme.card} rounded-lg`}>
                        <div className={`text-sm ${theme.textSecondary}`}>
                          {teacherAvailability[selectedTeacher].isOnLeave ? (
                            <span className="text-red-300">Currently on leave</span>
                          ) : teacherAvailability[selectedTeacher].unavailableDates.length > 0 ? (
                            <span className="text-yellow-300">
                              {teacherAvailability[selectedTeacher].unavailableDates.length} unavailable dates
                            </span>
                          ) : (
                            <span className="text-green-300">Available</span>
                          )}
                        </div>
                      </div>
                    )}

                    {coverTeacher && (
                      <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <div className="flex items-center text-blue-300">
                          <Shield className="h-4 w-4 mr-2" />
                          <span className="text-sm font-medium">Cover Teacher: {coverTeacher}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isHosted && clientDetails && (
                  <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 p-6 rounded-xl border border-blue-500/20">
                    <h3 className="font-semibold text-blue-300 mb-4 flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Hosted Class Details
                    </h3>
                    <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <div className="text-sm text-blue-300 mb-1">Client:</div>
                      <div className={`font-medium ${theme.text}`}>{clientDetails}</div>
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 p-6 rounded-xl border border-blue-500/20">
                  <h3 className="font-semibold text-blue-300 mb-4 flex items-center">
                    <Award className="h-5 w-5 mr-2" />
                    Quick Stats
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                      <div className={`text-2xl font-bold ${theme.text}`}>{getEnhancedHistoricData()?.avgAttendanceWithEmpty.toFixed(1) || 0}</div>
                      <div className="text-xs text-blue-300">Avg Check-ins</div>
                    </div>
                    <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                      <div className={`text-2xl font-bold ${theme.text}`}>₹{Math.round((getEnhancedHistoricData()?.revenuePerClass || 0) / 1000)}K</div>
                      <div className="text-xs text-blue-300">Avg Revenue</div>
                    </div>
                    <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                      <div className={`text-2xl font-bold ${theme.text}`}>{getEnhancedHistoricData()?.totalClasses || 0}</div>
                      <div className="text-xs text-blue-300">Historic Classes</div>
                    </div>
                    <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                      <div className={`text-2xl font-bold ${theme.text}`}>{Math.round((getEnhancedHistoricData()?.avgFillRate || 0))}%</div>
                      <div className="text-xs text-blue-300">Fill Rate</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-6 rounded-xl border border-purple-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-purple-300 flex items-center">
                    <Brain className="h-5 w-5 mr-2" />
                    Top 5 AI Recommendations for {selectedSlot.day} {selectedSlot.time}
                  </h3>
                  {isLoadingAI && (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-400 border-t-transparent"></div>
                  )}
                </div>
                
                {aiRecommendations.length > 0 ? (
                  <div className="space-y-3">
                    {aiRecommendations.map((rec, index) => (
                      <div
                        key={index}
                        className={`p-4 ${theme.card} rounded-xl border border-purple-500/30 hover:border-purple-400 hover:${theme.cardHover} transition-all duration-200 group`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3 ${
                              index === 0 ? 'bg-yellow-500' : 
                              index === 1 ? 'bg-gray-400' : 
                              index === 2 ? 'bg-orange-600' : 'bg-purple-600'
                            }`}>
                              {index + 1}
                            </div>
                            <div className={`font-medium ${theme.text}`}>{rec.classFormat}</div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center text-green-400">
                              <Users className="h-4 w-4 mr-1" />
                              <span className="text-sm">{rec.expectedParticipants}</span>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              rec.priority >= 4 ? 'bg-green-500/20 text-green-300' :
                              rec.priority >= 3 ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-gray-500/20 text-gray-300'
                            }`}>
                              Priority {rec.priority}
                            </div>
                          </div>
                        </div>
                        <div className={`text-sm ${theme.textSecondary} mb-2`}>
                          <strong>Teacher:</strong> {rec.teacher}
                        </div>
                        <div className="text-xs text-purple-300 mb-3">
                          {rec.reasoning}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className={`text-xs ${theme.textSecondary}`}>
                            Confidence: {(rec.confidence * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-green-400">
                            ₹{rec.expectedRevenue} expected
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <button
                            onClick={() => handleAIRecommendationSelect(rec)}
                            className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                          >
                            Use This
                          </button>
                          <button
                            onClick={() => handleQuickSchedule(rec)}
                            className="flex items-center px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Quick Schedule
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !isLoadingAI ? (
                  <div className="text-center py-8">
                    <Zap className="h-12 w-12 text-purple-400 mx-auto mb-3 opacity-50" />
                    <div className="text-sm text-purple-300">
                      Configure AI settings to get personalized recommendations
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="animate-pulse">
                      <Brain className="h-12 w-12 text-purple-400 mx-auto mb-3" />
                      <div className="text-sm text-purple-300">
                        Analyzing data for smart recommendations...
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {renderEnhancedHistoricAnalytics()}
            </div>
          )}

          {/* Actions */}
          <div className={`flex justify-end space-x-4 pt-6 border-t ${theme.border} mt-8`}>
            <button
              onClick={onClose}
              className={`px-6 py-3 ${theme.textSecondary} hover:${theme.text} transition-colors`}
            >
              Cancel
            </button>
            <button
              onClick={handleSchedule}
              disabled={!selectedClass || (!selectedTeacher && !isHosted) || !selectedTime}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingClass ? 'Update Class' : 'Schedule Class'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassModal;