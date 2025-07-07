import { ClassData, ScheduledClass, CustomTeacher } from '../types';
import { generateIntelligentSchedule } from './classUtils';
import { aiService } from './aiService';

export interface OptimizationIteration {
  id: string;
  name: string;
  description: string;
  schedule: ScheduledClass[];
  metrics: {
    totalRevenue: number;
    totalAttendance: number;
    teacherUtilization: number;
    fillRate: number;
    efficiency: number;
  };
  trainerAssignments: Record<string, {
    hours: number;
    shifts: string[];
    locations: string[];
    consecutiveClasses: number;
  }>;
}

interface LocationCapacity {
  [location: string]: {
    [studio: string]: number;
  };
}

const LOCATION_CAPACITIES: LocationCapacity = {
  'Supreme HQ, Bandra': {
    'Main Studio': 14,
    'Cycle Studio': 14
  },
  'Kwality House, Kemps Corner': {
    'Studio 1': 20,
    'Studio 2': 12,
    'Mat Studio': 13,
    'Fit Studio': 14
  },
  'Kenkere House': {
    'Main Studio': 12,
    'Secondary Studio': 10
  }
};

const DAY_GUIDELINES = {
  'Monday': {
    focus: 'Strong start with high-demand formats & senior trainers',
    avoid: ['Studio Recovery'],
    priority: ['Studio Barre 57', 'Studio FIT', 'Studio powerCycle', 'Studio Mat 57'],
    maxClasses: 12
  },
  'Tuesday': {
    focus: 'Balance beginner & intermediate classes',
    avoid: ['Studio HIIT', 'Studio Amped Up!'],
    priority: ['Studio Barre 57', 'Studio Mat 57', 'Studio Foundations', 'Studio Cardio Barre'],
    maxClasses: 12
  },
  'Wednesday': {
    focus: 'Midweek peak - repeat Monday\'s popular formats',
    avoid: [],
    priority: ['Studio Barre 57', 'Studio FIT', 'Studio powerCycle', 'Studio Mat 57'],
    maxClasses: 12
  },
  'Thursday': {
    focus: 'Lighter mix with recovery formats',
    avoid: [],
    priority: ['Studio Recovery', 'Studio Mat 57', 'Studio Cardio Barre', 'Studio Back Body Blaze'],
    maxClasses: 10
  },
  'Friday': {
    focus: 'Energy-focused with HIIT/Advanced classes',
    avoid: [],
    priority: ['Studio HIIT', 'Studio Amped Up!', 'Studio FIT', 'Studio Cardio Barre'],
    maxClasses: 12
  },
  'Saturday': {
    focus: 'Family-friendly & community formats',
    avoid: ['Studio HIIT'],
    priority: ['Studio Barre 57', 'Studio Foundations', 'Studio Recovery', 'Studio Mat 57'],
    maxClasses: 10
  },
  'Sunday': {
    focus: 'Max 4-5 classes, highest scoring formats only',
    avoid: ['Studio HIIT', 'Studio Amped Up!'],
    priority: ['Studio Barre 57', 'Studio Recovery', 'Studio Mat 57'],
    maxClasses: 5
  }
};

const PEAK_HOURS = {
  morning: ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30'],
  evening: ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00']
};

const SENIOR_TRAINERS = ['Anisha', 'Vivaran', 'Mrigakshi', 'Pranjali', 'Atulan', 'Cauveri', 'Rohan'];
const NEW_TRAINERS = ['Kabir', 'Simonelle'];
const ADVANCED_FORMATS = ['Studio HIIT', 'Studio Amped Up!'];

export class EnhancedOptimizer {
  private csvData: ClassData[];
  private customTeachers: CustomTeacher[];
  private locations = ['Kwality House, Kemps Corner', 'Supreme HQ, Bandra', 'Kenkere House'];
  private days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  constructor(csvData: ClassData[], customTeachers: CustomTeacher[] = []) {
    this.csvData = csvData;
    this.customTeachers = customTeachers;
  }

  async generateOptimizedSchedules(): Promise<OptimizationIteration[]> {
    const iterations: OptimizationIteration[] = [];

    console.log('🚀 Enhanced Optimizer: Generating multiple optimization strategies...');

    try {
      // Generate 3 different optimization approaches using AI when available
      const [revenueSchedule, attendanceSchedule, balancedSchedule] = await Promise.all([
        this.generateAIOptimizedSchedule('revenue'),
        this.generateAIOptimizedSchedule('attendance'),
        this.generateAIOptimizedSchedule('balanced')
      ]);

      iterations.push({
        id: 'revenue-maximizer',
        name: 'Revenue Maximizer',
        description: 'AI-optimized for maximum revenue generation with premium classes in peak hours and high-performing teacher-class combinations',
        schedule: revenueSchedule,
        metrics: this.calculateMetrics(revenueSchedule),
        trainerAssignments: this.getTrainerAssignments(revenueSchedule)
      });

      iterations.push({
        id: 'attendance-maximizer',
        name: 'Attendance Maximizer',
        description: 'AI-optimized for maximum footfall and studio utilization with popular class formats and proven teacher combinations',
        schedule: attendanceSchedule,
        metrics: this.calculateMetrics(attendanceSchedule),
        trainerAssignments: this.getTrainerAssignments(attendanceSchedule)
      });

      iterations.push({
        id: 'balanced-schedule',
        name: 'Balanced Schedule',
        description: 'AI-balanced approach optimizing revenue, attendance, and trainer workload with comprehensive rule compliance',
        schedule: balancedSchedule,
        metrics: this.calculateMetrics(balancedSchedule),
        trainerAssignments: this.getTrainerAssignments(balancedSchedule)
      });

      console.log('✅ Enhanced Optimizer: Generated 3 optimization strategies successfully');
      return iterations;

    } catch (error) {
      console.error('❌ Enhanced Optimizer: Error generating schedules:', error);
      
      // Fallback to local optimization if AI fails
      console.log('🔄 Enhanced Optimizer: Falling back to local optimization...');
      return this.generateFallbackSchedules();
    }
  }

  private async generateAIOptimizedSchedule(optimizationType: 'revenue' | 'attendance' | 'balanced'): Promise<ScheduledClass[]> {
    try {
      // First try to use AI service for optimization
      const aiOptimizedSchedule = await aiService.generateOptimizedSchedule(
        this.csvData,
        [],
        this.customTeachers,
        { optimizationType, iteration: Math.floor(Math.random() * 100) }
      );

      if (aiOptimizedSchedule && aiOptimizedSchedule.length > 0) {
        console.log(`✅ AI Service generated ${optimizationType} schedule with ${aiOptimizedSchedule.length} classes`);
        return aiOptimizedSchedule;
      }
    } catch (error) {
      console.warn(`⚠️ AI Service failed for ${optimizationType} optimization:`, error);
    }

    // Fallback to enhanced local optimization
    console.log(`🔄 Using enhanced local optimization for ${optimizationType}...`);
    return await generateIntelligentSchedule(this.csvData, this.customTeachers, {
      prioritizeTopPerformers: true,
      balanceShifts: true,
      optimizeTeacherHours: true,
      respectTimeRestrictions: true,
      minimizeTrainersPerShift: true,
      optimizationType,
      iteration: Math.floor(Math.random() * 100)
    });
  }

  private async generateFallbackSchedules(): Promise<OptimizationIteration[]> {
    const iterations: OptimizationIteration[] = [];

    // Generate local optimizations with different strategies
    const revenueSchedule = await generateIntelligentSchedule(this.csvData, this.customTeachers, {
      prioritizeTopPerformers: true,
      balanceShifts: true,
      optimizeTeacherHours: true,
      respectTimeRestrictions: true,
      minimizeTrainersPerShift: true,
      optimizationType: 'revenue',
      iteration: 1
    });

    const attendanceSchedule = await generateIntelligentSchedule(this.csvData, this.customTeachers, {
      prioritizeTopPerformers: true,
      balanceShifts: true,
      optimizeTeacherHours: true,
      respectTimeRestrictions: true,
      minimizeTrainersPerShift: true,
      optimizationType: 'attendance',
      iteration: 2
    });

    const balancedSchedule = await generateIntelligentSchedule(this.csvData, this.customTeachers, {
      prioritizeTopPerformers: true,
      balanceShifts: true,
      optimizeTeacherHours: true,
      respectTimeRestrictions: true,
      minimizeTrainersPerShift: true,
      optimizationType: 'balanced',
      iteration: 3
    });

    iterations.push({
      id: 'revenue-maximizer',
      name: 'Revenue Maximizer (Local)',
      description: 'Local optimization for maximum revenue with enhanced trainer assignment logic',
      schedule: revenueSchedule,
      metrics: this.calculateMetrics(revenueSchedule),
      trainerAssignments: this.getTrainerAssignments(revenueSchedule)
    });

    iterations.push({
      id: 'attendance-maximizer',
      name: 'Attendance Maximizer (Local)',
      description: 'Local optimization for maximum attendance with smart trainer distribution',
      schedule: attendanceSchedule,
      metrics: this.calculateMetrics(attendanceSchedule),
      trainerAssignments: this.getTrainerAssignments(attendanceSchedule)
    });

    iterations.push({
      id: 'balanced-schedule',
      name: 'Balanced Schedule (Local)',
      description: 'Local balanced optimization with comprehensive constraint compliance',
      schedule: balancedSchedule,
      metrics: this.calculateMetrics(balancedSchedule),
      trainerAssignments: this.getTrainerAssignments(balancedSchedule)
    });

    return iterations;
  }

  private calculateMetrics(schedule: ScheduledClass[]): any {
    const totalRevenue = schedule.reduce((sum, cls) => sum + (cls.revenue || 0), 0);
    const totalAttendance = schedule.reduce((sum, cls) => sum + (cls.participants || 0), 0);
    const totalHours = schedule.reduce((sum, cls) => sum + parseFloat(cls.duration), 0);
    const uniqueTeachers = new Set(schedule.map(cls => `${cls.teacherFirstName} ${cls.teacherLastName}`)).size;
    
    return {
      totalRevenue,
      totalAttendance,
      teacherUtilization: uniqueTeachers > 0 ? totalHours / (uniqueTeachers * 15) : 0, // Percentage of max possible hours
      fillRate: schedule.length > 0 ? totalAttendance / (schedule.length * 15) : 0, // Assuming 15 average capacity
      efficiency: totalHours > 0 ? (totalRevenue / totalHours) / 1000 : 0 // Revenue per hour in thousands
    };
  }

  private getTrainerAssignments(schedule: ScheduledClass[]): any {
    const assignments: any = {};
    
    schedule.forEach(cls => {
      const teacher = `${cls.teacherFirstName} ${cls.teacherLastName}`;
      
      if (!assignments[teacher]) {
        assignments[teacher] = {
          hours: 0,
          shifts: [],
          locations: [],
          consecutiveClasses: 0
        };
      }
      
      assignments[teacher].hours += parseFloat(cls.duration);
      
      const shift = `${cls.day} ${this.getShift(cls.time)}`;
      if (!assignments[teacher].shifts.includes(shift)) {
        assignments[teacher].shifts.push(shift);
      }
      
      if (!assignments[teacher].locations.includes(cls.location)) {
        assignments[teacher].locations.push(cls.location);
      }
    });
    
    return assignments;
  }

  private getShift(time: string): string {
    const hour = parseInt(time.split(':')[0]);
    if (hour < 14) return 'morning';
    return 'evening';
  }
}