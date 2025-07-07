import React, { useState, useEffect } from 'react';
import { Upload, Calendar, Brain, Users, Clock, AlertTriangle, Settings, Star, Lock, Unlock, Plus, Download, Eye, Printer, RotateCcw, RotateCw, Trash2, Filter, BarChart3, TrendingUp, MapPin, UserPlus, Sun, Moon, Zap, Target, Sparkles, Palette } from 'lucide-react';
import Papa from 'papaparse';
import CSVUpload from './components/CSVUpload';
import WeeklyCalendar from './components/WeeklyCalendar';
import ClassModal from './components/ClassModal';
import TeacherHourTracker from './components/TeacherHourTracker';
import SmartOptimizer from './components/SmartOptimizer';
import AISettings from './components/AISettings';
import ExportModal from './components/ExportModal';
import StudioSettings from './components/StudioSettings';
import MonthlyView from './components/MonthlyView';
import YearlyView from './components/YearlyView';
import AnalyticsView from './components/AnalyticsView';
import DailyAIOptimizer from './components/DailyAIOptimizer';
import EnhancedOptimizerModal from './components/EnhancedOptimizerModal';
import ThemeSelector from './components/ThemeSelector';
import { ClassData, ScheduledClass, TeacherHours, CustomTeacher, TeacherAvailability, HistoricScoreRow } from './types';
import { getTopPerformingClasses, getClassDuration, calculateTeacherHours, getClassCounts, validateTeacherHours, getTeacherSpecialties, getClassAverageForSlot, getBestTeacherForClass, generateIntelligentSchedule, getDefaultTopClasses, fillEmptySlots, getStrictTopPerformingClasses } from './utils/classUtils';
import { aiService } from './utils/aiService';
import { saveCSVData, loadCSVData, saveScheduledClasses, loadScheduledClasses, saveCustomTeachers, loadCustomTeachers, saveTeacherAvailability, loadTeacherAvailability, saveScoresData, loadScoresData } from './utils/dataStorage';

// Minimalist theme definitions with black/white backgrounds
const THEMES = {
  dark: {
    name: 'Dark Minimalist',
    bg: 'bg-black',
    text: 'text-white',
    textSecondary: 'text-gray-400',
    card: 'bg-gray-900 border-gray-800',
    cardHover: 'hover:bg-gray-800',
    button: 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700',
    buttonPrimary: 'bg-white text-black hover:bg-gray-100',
    accent: 'text-gray-300',
    border: 'border-gray-800'
  },
  light: {
    name: 'Light Minimalist',
    bg: 'bg-white',
    text: 'text-black',
    textSecondary: 'text-gray-600',
    card: 'bg-gray-50 border-gray-200',
    cardHover: 'hover:bg-gray-100',
    button: 'bg-gray-100 hover:bg-gray-200 text-black border border-gray-300',
    buttonPrimary: 'bg-black text-white hover:bg-gray-800',
    accent: 'text-gray-700',
    border: 'border-gray-200'
  },
  darkPurple: {
    name: 'Dark Purple',
    bg: 'bg-black',
    text: 'text-white',
    textSecondary: 'text-purple-300',
    card: 'bg-gray-900 border-purple-900',
    cardHover: 'hover:bg-gray-800',
    button: 'bg-purple-900 hover:bg-purple-800 text-white border border-purple-800',
    buttonPrimary: 'bg-purple-600 text-white hover:bg-purple-500',
    accent: 'text-purple-400',
    border: 'border-purple-900'
  },
  lightBlue: {
    name: 'Light Blue',
    bg: 'bg-white',
    text: 'text-black',
    textSecondary: 'text-blue-600',
    card: 'bg-blue-50 border-blue-200',
    cardHover: 'hover:bg-blue-100',
    button: 'bg-blue-100 hover:bg-blue-200 text-black border border-blue-300',
    buttonPrimary: 'bg-blue-600 text-white hover:bg-blue-500',
    accent: 'text-blue-700',
    border: 'border-blue-200'
  },
  darkGreen: {
    name: 'Dark Green',
    bg: 'bg-black',
    text: 'text-white',
    textSecondary: 'text-green-300',
    card: 'bg-gray-900 border-green-900',
    cardHover: 'hover:bg-gray-800',
    button: 'bg-green-900 hover:bg-green-800 text-white border border-green-800',
    buttonPrimary: 'bg-green-600 text-white hover:bg-green-500',
    accent: 'text-green-400',
    border: 'border-green-900'
  }
};

function App() {
  const [csvData, setCsvData] = useState<ClassData[]>([]);
  const [scoresData, setScoresData] = useState<HistoricScoreRow[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [activeView, setActiveView] = useState<string>('calendar');
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([]);
  const [scheduleHistory, setScheduleHistory] = useState<ScheduledClass[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; time: string; location: string } | null>(null);
  const [editingClass, setEditingClass] = useState<ScheduledClass | null>(null);
  const [teacherHours, setTeacherHours] = useState<TeacherHours>({});
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [showEnhancedOptimizer, setShowEnhancedOptimizer] = useState(false);
  const [showDailyOptimizer, setShowDailyOptimizer] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showStudioSettings, setShowStudioSettings] = useState(false);
  const [showTeacherCards, setShowTeacherCards] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [isPopulatingTopClasses, setIsPopulatingTopClasses] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isFillingSlots, setIsFillingSlots] = useState(false);
  const [lockedClasses, setLockedClasses] = useState<Set<string>>(new Set());
  const [lockedTeachers, setLockedTeachers] = useState<Set<string>>(new Set());
  const [classesLocked, setClassesLocked] = useState(false);
  const [teachersLocked, setTeachersLocked] = useState(false);
  const [customTeachers, setCustomTeachers] = useState<CustomTeacher[]>([]);
  const [teacherAvailability, setTeacherAvailability] = useState<TeacherAvailability>({});
  const [currentTheme, setCurrentTheme] = useState<keyof typeof THEMES>('dark');
  const [optimizationIteration, setOptimizationIteration] = useState(0);
  const [allowRestrictedScheduling, setAllowRestrictedScheduling] = useState(false);
  const [filterOptions, setFilterOptions] = useState({
    showTopPerformers: true,
    showPrivateClasses: true,
    showRegularClasses: true,
    selectedTeacher: '',
    selectedClassFormat: ''
  });

  const locations = ['Kwality House, Kemps Corner', 'Supreme HQ, Bandra', 'Kenkere House'];

  const views = [
    { id: 'calendar', name: 'Weekly Calendar', icon: Calendar },
    { id: 'monthly', name: 'Monthly View', icon: BarChart3 },
    { id: 'yearly', name: 'Yearly View', icon: TrendingUp },
    { id: 'analytics', name: 'Analytics', icon: Eye }
  ];

  const theme = THEMES[currentTheme];

  // Load Scores.csv data on app initialization
  useEffect(() => {
    const loadScoresCSV = async () => {
      try {
        console.log('🔄 Loading Scores.csv data...');
        const response = await fetch('/Scores.csv');
        if (!response.ok) {
          console.warn('⚠️ Scores.csv not found in public folder');
          return;
        }
        
        const csvText = await response.text();
        console.log('📄 Scores.csv loaded, parsing...');
        
        Papa.parse(csvText, {
          header: true,
          delimiter: '\t', // Tab-separated based on sample data
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
          complete: (results) => {
            console.log('✅ Scores.csv parsed:', results.data.length, 'rows');
            
            if (results.data && results.data.length > 0) {
              const processedScoresData: HistoricScoreRow[] = results.data
                .map((row: any) => {
                  try {
                    return {
                      key: String(row['Key'] || '').trim(),
                      totalClasses: parseInt(row['Total Classes']) || 0,
                      totalCheckedIn: parseInt(row['Total Checked In']) || 0,
                      totalParticipants: parseInt(row['Total Participants']) || 0,
                      emptyClasses: parseInt(row['Empty Classes']) || 0,
                      nonEmptyClasses: parseInt(row['Non-Empty Classes']) || 0,
                      avgAttendanceWithEmpty: parseFloat(row['Avg Attendance (with empty)']) || 0,
                      avgAttendanceWithoutEmpty: parseFloat(row['Avg Attendance (w/o empty)']) || 0,
                      totalRevenue: parseFloat(row['Total Revenue']) || 0,
                      revenuePerClass: parseFloat(row['Revenue Per Class']) || 0,
                      avgLateCancels: parseFloat(row['Avg Late Cancels']) || 0,
                      avgNonPaidCustomers: parseFloat(row['Avg Non Paid Customers']) || 0,
                      totalTips: parseFloat(row['Total Tips']) || 0,
                      tipsPerClass: parseFloat(row['Tips Per Class']) || 0,
                      avgFillRate: parseFloat(row['Avg Fill Rate (%)']) || 0,
                      revenuePerSeat: parseFloat(row['Revenue/Seat']) || 0,
                      lateCancelRate: parseFloat(row['Late Cancel Rate (%)']) || 0,
                      nonPaidRate: parseFloat(row['Non Paid Rate (%)']) || 0,
                      adjustedScore: parseFloat(row['Adjusted Score']) || 0,
                      location: String(row['Location'] || '').trim(),
                      trainerName: String(row['Trainer Name'] || '').trim(),
                      cleanedClass: String(row['Cleaned Class'] || '').trim(),
                      dayOfWeek: String(row['Day of Week'] || '').trim(),
                      classTime: String(row['Class Time'] || '').trim(),
                      classStatus: String(row['Class Status'] || '').trim(),
                      popularity: String(row['Popularity'] || '').trim(),
                      consistency: String(row['Consistency'] || '').trim(),
                      trainerVariance: parseFloat(row['Trainer Variance']) || 0,
                      observations: String(row['Observations'] || '').trim(),
                      topTrainerRecommendations: String(row['Top 3 Trainer Recommendations (Weighted Avg)'] || '').trim()
                    };
                  } catch (error) {
                    console.error('Error processing scores row:', error, row);
                    return null;
                  }
                })
                .filter((item): item is HistoricScoreRow => item !== null && item.adjustedScore > 0);

              console.log(`✅ Processed ${processedScoresData.length} valid score records`);
              setScoresData(processedScoresData);
              saveScoresData(processedScoresData);
            }
          },
          error: (error) => {
            console.error('❌ Error parsing Scores.csv:', error);
          }
        });
      } catch (error) {
        console.error('❌ Error loading Scores.csv:', error);
        // Load from localStorage if available
        const savedScoresData = loadScoresData();
        if (savedScoresData.length > 0) {
          console.log('📦 Loaded Scores.csv from localStorage:', savedScoresData.length, 'records');
          setScoresData(savedScoresData);
        }
      }
    };

    loadScoresCSV();
  }, []);

  // Load data on app initialization
  useEffect(() => {
    const savedProvider = localStorage.getItem('ai_provider');
    const savedKey = localStorage.getItem('ai_key');
    const savedEndpoint = localStorage.getItem('ai_endpoint');
    const savedTheme = localStorage.getItem('app_theme') as keyof typeof THEMES;
    const savedRestrictedSetting = localStorage.getItem('allow_restricted_scheduling');

    // Load AI settings
    if (savedProvider && savedKey && savedEndpoint) {
      aiService.setProvider({
        name: savedProvider,
        key: savedKey,
        endpoint: savedEndpoint
      });
    }

    // Load theme
    if (savedTheme && THEMES[savedTheme]) {
      setCurrentTheme(savedTheme);
    }

    // Load restricted scheduling setting
    if (savedRestrictedSetting) {
      setAllowRestrictedScheduling(savedRestrictedSetting === 'true');
    }

    // Load persistent data
    const savedCsvData = loadCSVData();
    const savedScheduledClasses = loadScheduledClasses();
    const savedCustomTeachers = loadCustomTeachers();
    const savedTeacherAvailability = loadTeacherAvailability();
    const savedScoresData = loadScoresData();

    if (savedCsvData.length > 0) {
      setCsvData(savedCsvData);
      const firstLocation = locations.find(loc => 
        savedCsvData.some((item: ClassData) => item.location === loc)
      ) || locations[0];
      setActiveTab(firstLocation);
    }

    if (savedScheduledClasses.length > 0) {
      setScheduledClasses(savedScheduledClasses);
      setTeacherHours(calculateTeacherHours(savedScheduledClasses));
    }

    if (savedCustomTeachers.length > 0) {
      setCustomTeachers(savedCustomTeachers);
    }

    if (Object.keys(savedTeacherAvailability).length > 0) {
      setTeacherAvailability(savedTeacherAvailability);
    }

    if (savedScoresData.length > 0) {
      setScoresData(savedScoresData);
    }
  }, []);

  // Auto-save data when it changes
  useEffect(() => {
    if (csvData.length > 0) {
      saveCSVData(csvData);
    }
  }, [csvData]);

  useEffect(() => {
    saveScheduledClasses(scheduledClasses);
  }, [scheduledClasses]);

  useEffect(() => {
    saveCustomTeachers(customTeachers);
  }, [customTeachers]);

  useEffect(() => {
    saveTeacherAvailability(teacherAvailability);
  }, [teacherAvailability]);

  useEffect(() => {
    if (scoresData.length > 0) {
      saveScoresData(scoresData);
    }
  }, [scoresData]);

  // Save to history when schedule changes
  useEffect(() => {
    if (scheduledClasses.length > 0) {
      const newHistory = scheduleHistory.slice(0, historyIndex + 1);
      newHistory.push([...scheduledClasses]);
      setScheduleHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [scheduledClasses]);

  const handleThemeChange = (newTheme: keyof typeof THEMES) => {
    setCurrentTheme(newTheme);
    localStorage.setItem('app_theme', newTheme);
  };

  const handleDataUpload = (data: ClassData[]) => {
    console.log('Data uploaded to App:', data.length, 'records');
    setCsvData(data);
    if (data.length > 0) {
      const firstLocation = locations.find(loc => 
        data.some(item => item.location === loc)
      ) || locations[0];
      setActiveTab(firstLocation);
    }
  };

  const handleSlotClick = (day: string, time: string, location: string) => {
    setSelectedSlot({ day, time, location });
    setEditingClass(null);
    setIsModalOpen(true);
  };

  const handleClassEdit = (classData: ScheduledClass) => {
    setEditingClass(classData);
    setSelectedSlot({ day: classData.day, time: classData.time, location: classData.location });
    setIsModalOpen(true);
  };

  const handleClassSchedule = (classData: ScheduledClass) => {
    if (editingClass) {
      // Update existing class
      setScheduledClasses(prev => 
        prev.map(cls => cls.id === editingClass.id ? classData : cls)
      );
    } else {
      // Validate teacher hours before scheduling
      const validation = validateTeacherHours(scheduledClasses, classData);
      
      if (!validation.isValid && !validation.canOverride) {
        alert(validation.error);
        return;
      }

      // Handle override scenario
      if (validation.canOverride && validation.warning) {
        const proceed = confirm(`${validation.warning}\n\nDo you want to override this limit and proceed anyway?`);
        if (!proceed) return;
      } else if (validation.warning && !validation.canOverride) {
        const proceed = confirm(`${validation.warning}\n\nDo you want to proceed?`);
        if (!proceed) return;
      }

      setScheduledClasses(prev => [...prev, classData]);
    }
    
    // Update teacher hours
    setTeacherHours(calculateTeacherHours(scheduledClasses));
    setIsModalOpen(false);
    setEditingClass(null);
  };

  const handleOptimizedSchedule = (optimizedClasses: ScheduledClass[]) => {
    // Validate all teacher hours in optimized schedule
    const teacherHoursCheck: Record<string, number> = {};
    const invalidTeachers: string[] = [];

    optimizedClasses.forEach(cls => {
      const teacherKey = `${cls.teacherFirstName} ${cls.teacherLastName}`;
      teacherHoursCheck[teacherKey] = parseFloat(((teacherHoursCheck[teacherKey] || 0) + parseFloat(cls.duration || '1')).toFixed(1));
    });

    Object.entries(teacherHoursCheck).forEach(([teacher, hours]) => {
      if (hours > 15) {
        invalidTeachers.push(`${teacher}: ${hours.toFixed(1)}h`);
      }
    });

    if (invalidTeachers.length > 0) {
      const proceed = confirm(`The following teachers would exceed 15 hours:\n${invalidTeachers.join('\n')}\n\nDo you want to override these limits and apply the schedule anyway?`);
      if (!proceed) return;
    }

    setScheduledClasses(optimizedClasses);
    setTeacherHours(teacherHoursCheck);
    setShowOptimizer(false);
    setShowEnhancedOptimizer(false);
    setShowDailyOptimizer(false);
  };

  const handleAutoPopulateTopClasses = async (data: ClassData[] = csvData) => {
    // Validate that data is an array
    if (!Array.isArray(data)) {
      alert('Invalid data format. Please ensure CSV data is properly loaded.');
      return;
    }

    if (data.length === 0) {
      alert('Please upload CSV data first');
      return;
    }

    setIsPopulatingTopClasses(true);

    try {
      console.log('🚀 Starting STRICT top classes population (avgCheckedIn > 5.0 with historic data)...');
      
      // Clear existing schedule first
      setScheduledClasses([]);
      
      // Use STRICT filtering - only classes with historic data and avgCheckedIn > 5.0
      const optimizedSchedule = await generateIntelligentSchedule(data, customTeachers, scoresData, {
        prioritizeTopPerformers: true,
        balanceShifts: true,
        optimizeTeacherHours: true,
        respectTimeRestrictions: true,
        minimizeTrainersPerShift: true,
        optimizationType: 'balanced',
        targetTeacherHours: 15,
        strictTopClassesOnly: true
      });

      console.log(`✅ STRICT top classes population complete: ${optimizedSchedule.length} classes scheduled`);

      if (optimizedSchedule.length > 0) {
        setScheduledClasses(optimizedSchedule);
        setTeacherHours(calculateTeacherHours(optimizedSchedule));
        
        // Calculate summary stats
        const teacherHoursCheck = calculateTeacherHours(optimizedSchedule);
        const teachersAt15h = Object.values(teacherHoursCheck).filter(h => h >= 14.5).length;
        const totalTeachers = Object.keys(teacherHoursCheck).length;
        const avgUtilization = Object.values(teacherHoursCheck).reduce((sum, hours) => sum + hours, 0) / totalTeachers / 15;
        const topPerformers = optimizedSchedule.filter(cls => cls.isTopPerformer).length;
        
        // Get strict filtering stats
        const strictTopClasses = getStrictTopPerformingClasses(data, scoresData, 5.0);
        
        alert(`✅ STRICT Enhanced Top Classes Population Complete!

📊 Results:
• ${optimizedSchedule.length} classes scheduled (ONLY avgCheckedIn > 5.0)
• ${strictTopClasses.length} total qualifying classes found
• ${totalTeachers} teachers utilized
• ${teachersAt15h} teachers at 15h target (${((teachersAt15h/totalTeachers)*100).toFixed(0)}%)
• ${(avgUtilization * 100).toFixed(1)}% average teacher utilization
• ${topPerformers} top performer classes scheduled

🎯 STRICT Filtering Applied:
• ONLY classes with historic data included
• ONLY classes with combined avgCheckedIn > 5.0
• Scores.csv integration for optimal selection
• Studio capacity constraints respected
• No trainer conflicts or cross-location assignments
• Maximum 2 consecutive classes per trainer
• Maximum 4 classes per day per trainer
• All 15-minute time intervals utilized
• Location-specific format rules enforced
• New trainer restrictions applied (max 10h/week)
• Weekday second shift starts at 5:00 PM or later
• Shift separation optimized
• Inactive teachers (Nishanth, Saniya) excluded
• Scores.csv insights integrated for better recommendations`);
      } else {
        alert('No classes meet the STRICT criteria (avgCheckedIn > 5.0 with historic data). Please check your data and try again.');
      }

    } catch (error) {
      console.error('Error populating STRICT top classes:', error);
      alert('Error populating STRICT top classes. Please try again.');
    } finally {
      setIsPopulatingTopClasses(false);
    }
  };

  const handleAutoOptimize = async () => {
    if (csvData.length === 0) {
      alert('Please upload CSV data first');
      return;
    }

    setIsOptimizing(true);

    try {
      console.log('🚀 Starting enhanced AI optimization with Scores.csv integration...');
      
      // Enhanced AI optimization with all constraints and Scores.csv data
      const optimizedSchedule = await generateIntelligentSchedule(csvData, customTeachers, scoresData, {
        prioritizeTopPerformers: true,
        balanceShifts: true,
        optimizeTeacherHours: true,
        respectTimeRestrictions: true,
        minimizeTrainersPerShift: true,
        iteration: optimizationIteration,
        optimizationType: 'balanced',
        targetTeacherHours: 15
      });
      
      console.log(`🎯 Enhanced AI optimization with Scores.csv complete: ${optimizedSchedule.length} classes scheduled`);
      
      // Calculate final teacher hours and stats
      const teacherHoursCheck = calculateTeacherHours(optimizedSchedule);
      const teachersAt15h = Object.values(teacherHoursCheck).filter(h => h >= 14.5).length;
      const teachersAt12h = Object.values(teacherHoursCheck).filter(h => h >= 12).length;
      const totalTeachers = Object.keys(teacherHoursCheck).length;
      const avgUtilization = Object.values(teacherHoursCheck).reduce((sum, hours) => sum + hours, 0) / totalTeachers / 15;
      const topPerformers = optimizedSchedule.filter(cls => cls.isTopPerformer).length;

      setOptimizationIteration(prev => prev + 1);
      setScheduledClasses(optimizedSchedule);
      setTeacherHours(teacherHoursCheck);

      // Show comprehensive optimization results
      alert(`🎯 Enhanced AI Optimization with Scores.csv Complete!

📊 Results:
• ${optimizedSchedule.length} classes scheduled
• ${totalTeachers} teachers utilized
• ${teachersAt15h} teachers at 15h target (${((teachersAt15h/totalTeachers)*100).toFixed(0)}%)
• ${teachersAt12h} teachers at 12+ hours (${((teachersAt12h/totalTeachers)*100).toFixed(0)}%)
• ${(avgUtilization * 100).toFixed(1)}% average teacher utilization
• ${topPerformers} top performer classes

✅ Enhanced Optimization Features with Scores.csv:
• Adjusted scores integrated for optimal combinations
• Popularity and consistency ratings considered
• Studio capacity constraints enforced
• No trainer conflicts or overlaps
• Maximum 2 consecutive classes per trainer
• Maximum 4 classes per day per trainer
• One location per trainer per day
• Weekday second shift starts at 5:00 PM or later
• Shift separation optimized
• All 15-minute intervals utilized
• Location-specific format rules applied
• New trainer restrictions enforced (max 10h/week)
• Teacher hour targets optimized
• Inactive teachers (Nishanth, Saniya) excluded
• Scores.csv insights for better teacher-class matching`);

    } catch (error) {
      console.error('Error optimizing schedule:', error);
      alert('Error optimizing schedule. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleFillAdditionalSlots = async () => {
    if (csvData.length === 0) {
      alert('Please upload CSV data first');
      return;
    }

    setIsFillingSlots(true);

    try {
      console.log('🔄 Filling 5 additional slots with STRICT Scores.csv optimization...');
      
      // Use enhanced fillEmptySlots with STRICT Scores.csv integration
      const enhancedSchedule = await fillEmptySlots(csvData, scheduledClasses, customTeachers, scoresData);
      
      console.log(`✅ Additional STRICT slots filled with Scores.csv: ${enhancedSchedule.length - scheduledClasses.length} new classes added`);
      
      if (enhancedSchedule.length > scheduledClasses.length) {
        setScheduledClasses(enhancedSchedule);
        setTeacherHours(calculateTeacherHours(enhancedSchedule));
        
        const newClasses = enhancedSchedule.length - scheduledClasses.length;
        const teacherHoursCheck = calculateTeacherHours(enhancedSchedule);
        const teachersAt15h = Object.values(teacherHoursCheck).filter(h => h >= 14.5).length;
        const totalTeachers = Object.keys(teacherHoursCheck).length;
        
        alert(`✅ Additional STRICT Slots Filled with Scores.csv Integration!

📊 Results:
• ${newClasses} new STRICT classes added (targeting 5 per click)
• ${enhancedSchedule.length} total classes scheduled
• ${teachersAt15h} teachers now at 15h target
• Optimized trainer hour distribution
• Balanced class mix maintained

🎯 STRICT Features Applied with Scores.csv:
• ONLY classes with avgCheckedIn > 5.0 and historic data
• Best class-teacher combinations using adjusted scores
• Popularity and consistency ratings considered
• Studio availability respected
• Trainer constraints maintained
• Class mix balanced across days
• Weekday second shift compliance (5:00 PM start)
• Inactive teachers excluded
• New trainer restrictions applied
• Performance scoring integrated for optimal selection`);
      } else {
        alert('All available STRICT slots are already optimally filled. No additional classes with avgCheckedIn > 5.0 could be added while respecting constraints.');
      }

    } catch (error) {
      console.error('Error filling additional STRICT slots:', error);
      alert('Error filling additional STRICT slots. Please try again.');
    } finally {
      setIsFillingSlots(false);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setScheduledClasses(scheduleHistory[historyIndex - 1]);
      setTeacherHours(calculateTeacherHours(scheduleHistory[historyIndex - 1]));
    }
  };

  const handleRedo = () => {
    if (historyIndex < scheduleHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setScheduledClasses(scheduleHistory[historyIndex + 1]);
      setTeacherHours(calculateTeacherHours(scheduleHistory[historyIndex + 1]));
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all scheduled classes?')) {
      setScheduledClasses([]);
      setTeacherHours({});
      setLockedClasses(new Set());
      setLockedTeachers(new Set());
      setClassesLocked(false);
      setTeachersLocked(false);
    }
  };

  const toggleClassLock = () => {
    setClassesLocked(!classesLocked);
    if (!classesLocked) {
      const classIds = new Set(scheduledClasses.map(cls => cls.id));
      setLockedClasses(classIds);
    } else {
      setLockedClasses(new Set());
    }
  };

  const toggleTeacherLock = () => {
    setTeachersLocked(!teachersLocked);
    if (!teachersLocked) {
      const teacherNames = new Set(scheduledClasses.map(cls => `${cls.teacherFirstName} ${cls.teacherLastName}`));
      setLockedTeachers(teacherNames);
    } else {
      setLockedTeachers(new Set());
    }
  };

  const classCounts = getClassCounts(scheduledClasses);

  // Show upload screen if no data
  if (csvData.length === 0) {
    return <CSVUpload onDataUpload={handleDataUpload} theme={theme} />;
  }

  const renderMainContent = () => {
    switch (activeView) {
      case 'monthly':
        return <MonthlyView scheduledClasses={scheduledClasses} csvData={csvData} theme={theme} />;
      case 'yearly':
        return <YearlyView scheduledClasses={scheduledClasses} csvData={csvData} theme={theme} />;
      case 'analytics':
        return <AnalyticsView scheduledClasses={scheduledClasses} csvData={csvData} scoresData={scoresData} theme={theme} />;
      default:
        return (
          <>
            {/* Location Tabs */}
            <div className={`flex space-x-1 mb-6 rounded-2xl p-1 ${theme.card} shadow-lg`}>
              {locations.map((location) => (
                <button
                  key={location}
                  onClick={() => setActiveTab(location)}
                  className={`flex-1 py-4 px-6 rounded-xl font-medium transition-all duration-300 ${
                    activeTab === location
                      ? `${theme.buttonPrimary} shadow-lg transform scale-105`
                      : `${theme.textSecondary} ${theme.cardHover}`
                  }`}
                >
                  <div className="flex items-center justify-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    {location.split(',')[0]}
                  </div>
                </button>
              ))}
            </div>

            {/* Teacher Hours Tracker - Collapsible */}
            <div className="mb-6">
              <TeacherHourTracker 
                teacherHours={teacherHours} 
                theme={theme}
                showCards={showTeacherCards}
                onToggleCards={() => setShowTeacherCards(!showTeacherCards)}
              />
            </div>

            {/* Weekly Calendar */}
            {activeTab && (
              <WeeklyCalendar
                location={activeTab}
                csvData={csvData}
                scoresData={scoresData}
                scheduledClasses={scheduledClasses.filter(cls => {
                  if (!filterOptions.showTopPerformers && cls.isTopPerformer) return false;
                  if (!filterOptions.showPrivateClasses && cls.isPrivate) return false;
                  if (!filterOptions.showRegularClasses && !cls.isTopPerformer && !cls.isPrivate) return false;
                  if (filterOptions.selectedTeacher && `${cls.teacherFirstName} ${cls.teacherLastName}` !== filterOptions.selectedTeacher) return false;
                  if (filterOptions.selectedClassFormat && cls.classFormat !== filterOptions.selectedClassFormat) return false;
                  return true;
                })}
                onSlotClick={handleSlotClick}
                onClassEdit={handleClassEdit}
                lockedClasses={lockedClasses}
                theme={theme}
                allowRestrictedScheduling={allowRestrictedScheduling}
              />
            )}
          </>
        );
    }
  };

  return (
    <div className={`min-h-screen ${theme.bg}`}>
      <div className="container mx-auto px-4 py-6">
        {/* Sleek Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <div className="relative mr-4">
              <Sparkles className={`h-12 w-12 ${theme.accent}`} />
            </div>
            <div>
              <h1 className={`text-4xl font-bold ${theme.text}`}>
                Smart Class Scheduler
              </h1>
              <p className={theme.textSecondary}>STRICT filtering: Only avgCheckedIn > 5.0 with historic data</p>
            </div>
          </div>
          
          {/* Theme Toggle */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowThemeSelector(true)}
              className={`p-3 rounded-xl transition-all duration-200 ${theme.button} hover:scale-105`}
              title="Change Theme"
            >
              <Palette className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {/* History Controls */}
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${theme.button} hover:scale-105`}
              title="Undo"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Undo</span>
            </button>

            <button
              onClick={handleRedo}
              disabled={historyIndex >= scheduleHistory.length - 1}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${theme.button} hover:scale-105`}
              title="Redo"
            >
              <RotateCw className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Redo</span>
            </button>

            <button
              onClick={handleClearAll}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 bg-red-600 text-white hover:bg-red-700 hover:scale-105`}
              title="Clear All"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Clear</span>
            </button>

            <button
              onClick={() => handleAutoPopulateTopClasses(csvData)}
              disabled={isPopulatingTopClasses}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 bg-yellow-600 text-white hover:bg-yellow-700`}
              title="STRICT: Only classes with historic data and avgCheckedIn > 5.0"
            >
              {isPopulatingTopClasses ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Star className="h-4 w-4 mr-2" />
              )}
              <span className="text-sm font-medium">STRICT Top Classes</span>
            </button>
            
            <button
              onClick={handleAutoOptimize}
              disabled={isOptimizing}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 bg-green-600 text-white hover:bg-green-700`}
              title="Enhanced AI with Scores.csv integration, ALL constraints and studio capacity checks"
            >
              {isOptimizing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Brain className="h-4 w-4 mr-2" />
              )}
              <span className="text-sm font-medium">Enhanced AI</span>
            </button>

            {/* Enhanced Fill Additional Slots Button */}
            <button
              onClick={handleFillAdditionalSlots}
              disabled={isFillingSlots}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 bg-orange-600 text-white hover:bg-orange-700`}
              title="Add 5 STRICT classes per click (avgCheckedIn > 5.0) to maximize trainer hours"
            >
              {isFillingSlots ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              <span className="text-sm font-medium">Fill STRICT Slots (+5)</span>
            </button>

            <button
              onClick={() => setShowEnhancedOptimizer(true)}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 bg-indigo-600 text-white hover:bg-indigo-700`}
              title="Advanced AI with multiple optimization strategies and Scores.csv integration"
            >
              <Target className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Advanced AI</span>
            </button>

            <button
              onClick={() => setShowDailyOptimizer(true)}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 bg-purple-600 text-white hover:bg-purple-700`}
            >
              <Zap className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Daily AI</span>
            </button>

            <button
              onClick={toggleClassLock}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 ${
                classesLocked 
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : theme.button
              }`}
            >
              {classesLocked ? <Lock className="h-4 w-4 mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
              <span className="text-sm font-medium">{classesLocked ? 'Unlock' : 'Lock'} Classes</span>
            </button>

            <button
              onClick={toggleTeacherLock}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 ${
                teachersLocked 
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : theme.button
              }`}
            >
              {teachersLocked ? <Lock className="h-4 w-4 mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
              <span className="text-sm font-medium">{teachersLocked ? 'Unlock' : 'Lock'} Teachers</span>
            </button>
            
            <button
              onClick={() => setShowOptimizer(true)}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 bg-teal-600 text-white hover:bg-teal-700`}
            >
              <Target className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Optimizer</span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 bg-blue-600 text-white hover:bg-blue-700`}
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Export</span>
            </button>

            <button
              onClick={() => setShowStudioSettings(true)}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 bg-emerald-600 text-white hover:bg-emerald-700`}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Studio</span>
            </button>
            
            <button
              onClick={() => setShowAISettings(true)}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 ${theme.button}`}
            >
              <Settings className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">AI Settings</span>
            </button>
            
            <button
              onClick={() => setCsvData([])}
              className={`flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 ${theme.button}`}
            >
              <Upload className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">New CSV</span>
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className={`flex space-x-1 mb-6 rounded-2xl p-1 ${theme.card} shadow-lg`}>
          {views.map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                activeView === view.id
                  ? `${theme.buttonPrimary} shadow-lg transform scale-105`
                  : `${theme.textSecondary} ${theme.cardHover}`
              }`}
            >
              <view.icon className="h-5 w-5 mr-2" />
              {view.name}
            </button>
          ))}
        </div>

        {/* Main Content */}
        {renderMainContent()}

        {/* Class Scheduling Modal */}
        {isModalOpen && selectedSlot && (
          <ClassModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingClass(null);
            }}
            selectedSlot={selectedSlot}
            editingClass={editingClass}
            csvData={csvData}
            scoresData={scoresData}
            teacherHours={teacherHours}
            customTeachers={customTeachers}
            teacherAvailability={teacherAvailability}
            scheduledClasses={scheduledClasses}
            onSchedule={handleClassSchedule}
            theme={theme}
            allowRestrictedScheduling={allowRestrictedScheduling}
          />
        )}

        {/* Smart Optimizer Modal */}
        {showOptimizer && (
          <SmartOptimizer
            isOpen={showOptimizer}
            onClose={() => setShowOptimizer(false)}
            csvData={csvData}
            scoresData={scoresData}
            currentSchedule={scheduledClasses}
            onOptimize={handleOptimizedSchedule}
            theme={theme}
          />
        )}

        {/* Enhanced Optimizer Modal */}
        {showEnhancedOptimizer && (
          <EnhancedOptimizerModal
            isOpen={showEnhancedOptimizer}
            onClose={() => setShowEnhancedOptimizer(false)}
            csvData={csvData}
            scoresData={scoresData}
            currentSchedule={scheduledClasses}
            onOptimize={handleOptimizedSchedule}
            theme={theme}
          />
        )}

        {/* Daily AI Optimizer Modal */}
        {showDailyOptimizer && (
          <DailyAIOptimizer
            isOpen={showDailyOptimizer}
            onClose={() => setShowDailyOptimizer(false)}
            csvData={csvData}
            scoresData={scoresData}
            currentSchedule={scheduledClasses}
            onOptimize={handleOptimizedSchedule}
            theme={theme}
          />
        )}

        {/* Export Modal */}
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          scheduledClasses={scheduledClasses}
          location={activeTab}
          theme={theme}
        />

        {/* Studio Settings Modal */}
        <StudioSettings
          isOpen={showStudioSettings}
          onClose={() => setShowStudioSettings(false)}
          customTeachers={customTeachers}
          onUpdateTeachers={setCustomTeachers}
          teacherAvailability={teacherAvailability}
          onUpdateAvailability={setTeacherAvailability}
          theme={theme}
          allowRestrictedScheduling={allowRestrictedScheduling}
          onUpdateRestrictedScheduling={(value) => {
            setAllowRestrictedScheduling(value);
            localStorage.setItem('allow_restricted_scheduling', value.toString());
          }}
        />

        {/* AI Settings Modal */}
        <AISettings
          isOpen={showAISettings}
          onClose={() => setShowAISettings(false)}
          theme={theme}
        />

        {/* Theme Selector Modal */}
        <ThemeSelector
          isOpen={showThemeSelector}
          onClose={() => setShowThemeSelector(false)}
          currentTheme={currentTheme}
          themes={THEMES}
          onThemeChange={handleThemeChange}
        />
      </div>
    </div>
  );
}

export default App;