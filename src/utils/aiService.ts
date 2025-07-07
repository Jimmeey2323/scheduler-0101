import { ClassData, AIRecommendation, AIProvider, ScheduledClass, OptimizationSuggestion, HistoricScoreRow } from '../types';
import { generateIntelligentSchedule } from './classUtils';

class AIService {
  private provider: AIProvider | null = null;

  constructor() {
    // Don't set a default provider with potentially invalid key
    this.provider = null;
  }

  setProvider(provider: AIProvider) {
    this.provider = provider;
    console.log(`🤖 AI Service: Provider set to ${provider.name}`);
  }

  async generateRecommendations(
    historicData: ClassData[],
    day: string,
    time: string,
    location: string,
    scoresData: HistoricScoreRow[] = []
  ): Promise<AIRecommendation[]> {
    // Always return fallback recommendations if no provider is configured or key is missing
    if (!this.provider || !this.provider.key || this.provider.key.trim() === '') {
      console.warn('🤖 AI Service: Provider not configured or missing API key, using enhanced fallback recommendations');
      return this.getEnhancedFallbackRecommendations(historicData, location, day, time, scoresData);
    }

    // Filter out inactive teachers from historical data
    const relevantData = historicData.filter(
      item => item.location === location && 
      item.dayOfWeek === day && 
      item.classTime.includes(time.slice(0, 5)) &&
      !item.cleanedClass.toLowerCase().includes('hosted') && // Filter out hosted classes
      !this.isInactiveTeacher(item.teacherName || `${item.teacherFirstName} ${item.teacherLastName}`)
    );

    if (relevantData.length === 0) {
      return this.getEnhancedFallbackRecommendations(historicData, location, day, time, scoresData);
    }

    const prompt = this.buildAdvancedRecommendationPrompt(relevantData, day, time, location, historicData, scoresData);
    
    try {
      console.log(`🤖 AI Service: Generating recommendations for ${location} on ${day} at ${time}...`);
      const response = await this.callAI(prompt);
      const recommendations = this.parseAIResponse(response);
      console.log(`✅ AI Service: Generated ${recommendations.length} recommendations`);
      return recommendations.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      console.warn('🤖 AI Service: Error generating recommendations, falling back to enhanced local recommendations:', error);
      return this.getEnhancedFallbackRecommendations(historicData, location, day, time, scoresData);
    }
  }

  async generateOptimizedSchedule(
    historicData: ClassData[],
    currentSchedule: ScheduledClass[],
    customTeachers: any[] = [],
    scoresData: HistoricScoreRow[] = [],
    options: any = {}
  ): Promise<ScheduledClass[]> {
    if (!this.provider || !this.provider.key || this.provider.key.trim() === '') {
      console.warn('🤖 AI Service: Provider not configured, using enhanced intelligent local optimization');
      return this.generateEnhancedLocalSchedule(historicData, currentSchedule, customTeachers, scoresData, options);
    }

    const prompt = this.buildAdvancedOptimizationPrompt(historicData, currentSchedule, customTeachers, scoresData, options);
    
    try {
      console.log(`🤖 AI Service: Generating optimized schedule with ${options.optimizationType || 'balanced'} strategy...`);
      const response = await this.callAI(prompt);
      const optimizedSchedule = this.parseOptimizedScheduleResponse(response, historicData);
      console.log(`✅ AI Service: Generated optimized schedule with ${optimizedSchedule.length} classes`);
      return optimizedSchedule;
    } catch (error) {
      console.warn('🤖 AI Service: Optimization error, falling back to enhanced intelligent local optimization:', error);
      return this.generateEnhancedLocalSchedule(historicData, currentSchedule, customTeachers, scoresData, options);
    }
  }

  private buildAdvancedRecommendationPrompt(
    data: ClassData[], 
    day: string, 
    time: string, 
    location: string,
    allData: ClassData[],
    scoresData: HistoricScoreRow[]
  ): string {
    const classPerformance = this.analyzeClassPerformance(data);
    const teacherPerformance = this.analyzeTeacherPerformance(data);
    const timeSlotAnalysis = this.analyzeTimeSlotPerformance(allData, location, day, time);
    const competitorAnalysis = this.analyzeCompetitorSlots(allData, location, day, time);
    const scoresAnalysis = this.analyzeScoresData(scoresData, location, day, time);

    return `
      You are an expert fitness studio scheduling AI with deep understanding of trainer optimization and studio capacity constraints. Analyze this data for ${location} on ${day} at ${time} and provide intelligent class recommendations.

      CRITICAL SCHEDULING RULES (NON-NEGOTIABLE):
      1. Studio Capacity: Kwality House (2 studios), Supreme HQ (3 studios), Kenkere House (2 studios)
      2. NO classes between 12:30 PM - 5:00 PM except Sundays (4:00 PM earliest) and Saturdays (4:00 PM earliest)
      3. Supreme HQ Bandra: PowerCycle ONLY, NO Amped Up/HIIT
      4. Other locations: NO PowerCycle classes
      5. Max 15 hours/week per teacher, max 4 hours/day per teacher, max 4 classes/day per teacher
      6. Each teacher needs minimum 2 days off per week
      7. Minimize trainers per shift while maintaining quality (prefer 2-3 trainers covering multiple classes)
      8. NO cross-location assignments on same day (teacher can only work at ONE location per day)
      9. Prefer morning/evening shift separation (avoid same teacher working both shifts)
      10. Max 2 consecutive classes per teacher
      11. Multiple classes in same slot must have above-average attendance
      12. Avoid same class format in same time slot
      13. Prioritize top performers (avg > 5 participants) with best historic teachers
      14. NEVER recommend hosted classes for automatic scheduling
      15. Recovery classes are 30 minutes, not 45 minutes
      16. NO recovery classes on Monday, Tuesday, Wednesday
      17. EXCLUDE INACTIVE TEACHERS: Nishanth, Saniya (these teachers cannot be assigned)
      18. NEW TRAINERS (Kabir, Simonelle, Karan): Limited to 10 hours/week and specific formats only
      19. PRIORITY TEACHERS: Anisha, Vivaran, Mrigakshi, Pranjali, Atulan, Cauveri, Rohan, Reshma, Richard, Karan, Karanvir
      20. WEEKDAY SECOND SHIFT: Must start at 5:00 PM or later (not before)

      HISTORIC PERFORMANCE DATA (Excluding Inactive Teachers):
      ${classPerformance.map(p => `- ${p.classFormat}: ${p.avgParticipants.toFixed(1)} avg participants, ₹${p.avgRevenue.toFixed(0)} revenue, ${p.frequency} classes held`).join('\n')}
      
      TEACHER PERFORMANCE (Active Teachers Only):
      ${teacherPerformance.map(p => `- ${p.teacher}: ${p.avgParticipants.toFixed(1)} avg participants, ${p.classesCount} classes taught`).join('\n')}
      
      TIME SLOT ANALYSIS:
      - Peak attendance: ${timeSlotAnalysis.peakAttendance} participants
      - Average revenue: ₹${timeSlotAnalysis.avgRevenue.toFixed(0)}
      - Success rate: ${(timeSlotAnalysis.successRate * 100).toFixed(1)}%
      - Best performing format: ${timeSlotAnalysis.bestFormat}
      
      COMPETITIVE ANALYSIS:
      - Similar time slots performance: ${competitorAnalysis.similarSlotsAvg.toFixed(1)} avg participants
      - Market opportunity score: ${competitorAnalysis.opportunityScore}/10

      ENHANCED SCORES.CSV INSIGHTS:
      ${scoresAnalysis.insights.length > 0 ? scoresAnalysis.insights.join('\n') : 'No specific score data available for this slot'}
      
      TOP PERFORMING COMBINATIONS FROM SCORES.CSV:
      ${scoresAnalysis.topCombinations.map(combo => `- ${combo.format} with ${combo.trainer}: Score ${combo.score}, ${combo.popularity} popularity, ${combo.consistency} consistency`).join('\n')}

      Provide 5 data-driven recommendations in JSON format:
      {
        "recommendations": [
          {
            "classFormat": "specific class name from data",
            "teacher": "best ACTIVE teacher name from performance data (NOT Nishanth or Saniya)", 
            "reasoning": "detailed data-driven explanation with specific metrics, scores.csv insights, and trainer optimization logic",
            "confidence": 0.85,
            "expectedParticipants": 12,
            "expectedRevenue": 8000,
            "priority": 9,
            "timeSlot": "${time}",
            "location": "${location}",
            "riskFactors": ["potential issues"],
            "successProbability": 0.92,
            "trainerOptimization": "explanation of how this fits trainer assignment strategy",
            "adjustedScore": 125.5,
            "popularityRating": "Hot/Steady/Declining",
            "consistencyRating": "Stable/Fluctuating"
          }
        ]
      }
      
      Focus on:
      - Highest ROI combinations based on historic data AND Scores.csv adjusted scores
      - Teacher-class format synergy from past performance (ACTIVE teachers only)
      - Trainer assignment efficiency (minimize cross-location, prefer shift separation)
      - Studio capacity optimization
      - Time slot optimization for maximum attendance
      - Revenue maximization strategies
      - Risk mitigation based on failure patterns
      - STRICT exclusion of inactive teachers (Nishanth, Saniya)
      - Proper utilization of new trainers (Kabir, Simonelle, Karan) within their constraints
      - Integration of Scores.csv insights for popularity, consistency, and trainer variance
      - Weekday second shift compliance (5:00 PM or later start)
    `;
  }

  private buildAdvancedOptimizationPrompt(
    historicData: ClassData[], 
    currentSchedule: ScheduledClass[],
    customTeachers: any[],
    scoresData: HistoricScoreRow[],
    options: any
  ): string {
    const priorityTeachers = ['Anisha', 'Vivaran', 'Mrigakshi', 'Pranjali', 'Atulan', 'Cauveri', 'Rohan','Reshma','Richard','Karan','Karanvir'];
    const newTrainers = ['Kabir', 'Simonelle', 'Karan'];
    const inactiveTeachers = ['Nishanth', 'Saniya'];
    const locationAnalysis = this.analyzeLocationPerformance(historicData);
    const teacherUtilization = this.analyzeTeacherUtilization(currentSchedule);
    const globalScoresAnalysis = this.analyzeGlobalScoresData(scoresData);
    
    return `
      You are an expert AI fitness studio scheduler with deep understanding of trainer optimization and operational efficiency. Create an optimized weekly schedule following these STRICT rules:
      
      MANDATORY CONSTRAINTS (NON-NEGOTIABLE):
      1. Studio Capacity Limits:
         - Kwality House: 2 studios max (2 parallel classes)
         - Supreme HQ Bandra: 3 studios max (3 parallel classes)
         - Kenkere House: 2 studios max (2 parallel classes)
      
      2. Time Restrictions:
         - NO classes 12:30 PM - 5:00 PM (except Sundays: 4:00 PM earliest, Saturdays: 4:00 PM earliest)
         - WEEKDAY SECOND SHIFT: Must start at 5:00 PM or later (not 4:00 PM)
         - Balance morning (7 AM - 12 PM) and evening (5 PM - 8 PM) classes equally
      
      3. Location Rules:
         - Supreme HQ Bandra: PowerCycle classes ONLY, max 3 parallel classes
         - Other locations: NO PowerCycle, max 2 parallel classes
         - NO Amped Up/HIIT at Supreme HQ Bandra
      
      4. Enhanced Teacher Constraints:
         - Max 15 hours/week per teacher
         - Max 4 hours/day per teacher
         - Max 4 classes/day per teacher
         - Max 2 consecutive classes per teacher
         - Minimum 2 days off per week per teacher
         - NO cross-location assignments on same day (ONE location per teacher per day)
         - Prefer morning/evening shift separation (avoid same teacher working both shifts)
         - Priority teachers (${priorityTeachers.join(', ')}) should get 12-15 hours
         - Minimize trainers per shift (prefer 2-3 trainers covering 4-6 classes)
         - EXCLUDE INACTIVE TEACHERS: ${inactiveTeachers.join(', ')} (NEVER assign these teachers)
         - NEW TRAINERS (${newTrainers.join(', ')}): Max 10 hours/week, limited formats only
      
      5. Quality Standards:
         - Multiple classes in same slot must have above-average historic attendance
         - No duplicate class formats in same time slot
         - Prioritize class-teacher combinations with proven success (>5 avg participants)
         - New teachers only for: Barre 57, Foundations, Recovery, Power Cycle
         - Advanced formats (HIIT, Amped Up) only for senior trainers
         - NEVER schedule hosted classes automatically
         - Recovery classes are 30 minutes duration
         - NO recovery classes on Monday, Tuesday, Wednesday
         - Sunday limits: Kwality House (5 classes), Supreme HQ (7 classes), Kenkere House (6 classes)

      CURRENT SCHEDULE ANALYSIS:
      ${currentSchedule.map(cls => `${cls.day} ${cls.time} - ${cls.classFormat} with ${cls.teacherFirstName} ${cls.teacherLastName} at ${cls.location} (${cls.participants || 0} expected)`).join('\n')}
      
      LOCATION PERFORMANCE DATA (Excluding Inactive Teachers):
      ${Object.entries(locationAnalysis).map(([loc, data]: [string, any]) => 
        `${loc}: ${data.avgParticipants.toFixed(1)} avg participants, ${data.totalClasses} classes, ₹${data.avgRevenue.toFixed(0)} avg revenue`
      ).join('\n')}
      
      TEACHER UTILIZATION (Active Teachers Only):
      ${Object.entries(teacherUtilization)
        .filter(([teacher]) => !inactiveTeachers.some(inactive => teacher.toLowerCase().includes(inactive.toLowerCase())))
        .map(([teacher, hours]: [string, any]) => 
          `${teacher}: ${hours.toFixed(1)}h/week (${((hours/15)*100).toFixed(0)}% utilization)`
        ).join('\n')}

      ENHANCED SCORES.CSV GLOBAL INSIGHTS:
      ${globalScoresAnalysis.insights.join('\n')}
      
      TOP PERFORMING COMBINATIONS FROM SCORES.CSV:
      ${globalScoresAnalysis.topCombinations.map(combo => 
        `- ${combo.format} at ${combo.location} on ${combo.day} ${combo.time}: Score ${combo.score}, ${combo.trainer} (${combo.popularity})`
      ).join('\n')}

      Generate a complete optimized schedule in JSON format:
      {
        "optimizedSchedule": [
          {
            "day": "Monday",
            "time": "07:00",
            "location": "Supreme HQ, Bandra",
            "classFormat": "PowerCycle",
            "teacherFirstName": "Anisha",
            "teacherLastName": "",
            "duration": "1",
            "expectedParticipants": 12,
            "expectedRevenue": 8500,
            "priority": 9,
            "reasoning": "data-driven explanation with trainer optimization logic and scores.csv insights",
            "isTopPerformer": true,
            "adjustedScore": 125.5,
            "popularityRating": "Hot",
            "consistencyRating": "Stable"
          }
        ],
        "optimizationMetrics": {
          "totalClasses": 85,
          "avgUtilization": 0.87,
          "revenueProjection": 750000,
          "teacherSatisfaction": 0.94,
          "scheduleEfficiency": 0.91,
          "studioUtilization": 0.89,
          "trainerOptimization": "summary of trainer assignment strategy",
          "inactiveTeachersExcluded": "${inactiveTeachers.join(', ')}",
          "newTrainersOptimized": "${newTrainers.join(', ')}",
          "scoresIntegration": "summary of how Scores.csv data influenced decisions",
          "weekdayShiftCompliance": "confirmation of 5:00 PM second shift start"
        },
        "improvements": [
          "specific improvements made with metrics, trainer optimization details, and scores.csv insights"
        ]
      }
      
      OPTIMIZATION GOALS (Priority Order for ${options.optimizationType || 'balanced'}):
      ${this.getOptimizationGoals(options.optimizationType)}
      
      CRITICAL: 
      - Ensure NO inactive teachers (${inactiveTeachers.join(', ')}) are assigned to any classes.
      - Ensure weekday second shift classes start at 5:00 PM or later.
      - Integrate Scores.csv insights for optimal class-teacher-time combinations.
      - Use iteration ${options.iteration || 0} to create unique variations while maintaining quality and trainer optimization.
    `;
  }

  private analyzeScoresData(scoresData: HistoricScoreRow[], location: string, day: string, time: string) {
    const relevantScores = scoresData.filter(score => 
      score.location === location &&
      score.dayOfWeek === day &&
      score.classTime.includes(time.slice(0, 5))
    );

    const insights: string[] = [];
    const topCombinations: any[] = [];

    if (relevantScores.length > 0) {
      const bestScore = relevantScores.sort((a, b) => b.adjustedScore - a.adjustedScore)[0];
      
      insights.push(`- Best performing combination: ${bestScore.cleanedClass} with ${bestScore.trainerName} (Score: ${bestScore.adjustedScore})`);
      insights.push(`- Popularity: ${bestScore.popularity}, Consistency: ${bestScore.consistency}`);
      insights.push(`- Trainer Variance: ${bestScore.trainerVariance}`);
      
      if (bestScore.observations) {
        insights.push(`- Key Observations: ${bestScore.observations}`);
      }
      
      if (bestScore.topTrainerRecommendations) {
        insights.push(`- Top Trainer Recommendations: ${bestScore.topTrainerRecommendations}`);
      }

      topCombinations.push(...relevantScores.map(score => ({
        format: score.cleanedClass,
        trainer: score.trainerName,
        score: score.adjustedScore,
        popularity: score.popularity,
        consistency: score.consistency
      })));
    }

    return { insights, topCombinations };
  }

  private analyzeGlobalScoresData(scoresData: HistoricScoreRow[]) {
    const insights: string[] = [];
    const topCombinations: any[] = [];

    if (scoresData.length > 0) {
      // Get top 10 performing combinations globally
      const topGlobal = scoresData
        .sort((a, b) => b.adjustedScore - a.adjustedScore)
        .slice(0, 10);

      insights.push(`- Total analyzed combinations: ${scoresData.length}`);
      insights.push(`- Highest adjusted score: ${topGlobal[0]?.adjustedScore || 'N/A'}`);
      insights.push(`- Average adjusted score: ${(scoresData.reduce((sum, s) => sum + s.adjustedScore, 0) / scoresData.length).toFixed(1)}`);

      // Analyze popularity distribution
      const popularityStats = scoresData.reduce((acc, score) => {
        acc[score.popularity] = (acc[score.popularity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      insights.push(`- Popularity distribution: ${Object.entries(popularityStats).map(([pop, count]) => `${pop}: ${count}`).join(', ')}`);

      topCombinations.push(...topGlobal.map(score => ({
        format: score.cleanedClass,
        location: score.location,
        day: score.dayOfWeek,
        time: score.classTime,
        trainer: score.trainerName,
        score: score.adjustedScore,
        popularity: score.popularity
      })));
    }

    return { insights, topCombinations };
  }

  private getOptimizationGoals(optimizationType: string): string {
    switch (optimizationType) {
      case 'revenue':
        return `
        1. Maximize revenue per hour across all locations using Scores.csv adjusted scores
        2. Prioritize peak hours with highest-performing class-teacher combinations
        3. Achieve 90%+ teacher utilization for priority teachers
        4. Optimize studio capacity utilization during peak hours
        5. Minimize operational complexity (fewer trainers per shift)
        6. Ensure teacher work-life balance (2+ days off)
        7. Exclude inactive teachers completely
        8. Optimize new trainer assignments within constraints
        9. Ensure weekday second shift starts at 5:00 PM or later
        `;
      case 'attendance':
        return `
        1. Maximize total attendance across all classes using Scores.csv insights
        2. Prioritize proven high-attendance class-teacher combinations
        3. Achieve balanced class distribution throughout the week
        4. Optimize for consistent attendance patterns
        5. Minimize trainer conflicts and cross-location assignments
        6. Ensure sustainable teacher workload distribution
        7. Exclude inactive teachers completely
        8. Properly utilize new trainers within format restrictions
        9. Ensure weekday second shift starts at 5:00 PM or later
        `;
      default: // balanced
        return `
        1. Balance revenue optimization with attendance maximization using Scores.csv data
        2. Achieve 85%+ teacher utilization (12-15h for priority teachers)
        3. Maintain 90%+ class fill rates based on historic data and scores
        4. Minimize operational complexity (fewer trainers per shift)
        5. Ensure teacher work-life balance (2+ days off)
        6. Create diverse class offerings throughout the week
        7. Optimize for peak time slots with best teachers
        8. Completely exclude inactive teachers (Nishanth, Saniya)
        9. Optimize new trainer usage within their constraints
        10. Ensure weekday second shift starts at 5:00 PM or later
        11. Integrate Scores.csv popularity and consistency ratings
        `;
    }
  }

  private analyzeTimeSlotPerformance(data: ClassData[], location: string, day: string, time: string) {
    const slotData = data.filter(item => 
      item.location === location && 
      item.dayOfWeek === day && 
      item.classTime.includes(time.slice(0, 5)) &&
      !this.isInactiveTeacher(item.teacherName || `${item.teacherFirstName} ${item.teacherLastName}`)
    );

    if (slotData.length === 0) {
      return { peakAttendance: 0, avgRevenue: 0, successRate: 0, bestFormat: 'N/A' };
    }

    const peakAttendance = Math.max(...slotData.map(item => item.checkedIn));
    const avgRevenue = slotData.reduce((sum, item) => sum + item.totalRevenue, 0) / slotData.length;
    const avgParticipants = slotData.reduce((sum, item) => sum + item.checkedIn, 0) / slotData.length;
    const successRate = slotData.filter(item => item.checkedIn > avgParticipants).length / slotData.length;
    
    const formatStats = slotData.reduce((acc, item) => {
      if (!acc[item.cleanedClass]) acc[item.cleanedClass] = 0;
      acc[item.cleanedClass] += item.checkedIn;
      return acc;
    }, {} as any);
    
    const bestFormat = Object.entries(formatStats).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { peakAttendance, avgRevenue, successRate, bestFormat };
  }

  private analyzeCompetitorSlots(data: ClassData[], location: string, day: string, time: string) {
    const hour = parseInt(time.split(':')[0]);
    const similarSlots = data.filter(item => {
      const itemHour = parseInt(item.classTime.split(':')[0]);
      const teacherName = item.teacherName || `${item.teacherFirstName} ${item.teacherLastName}`;
      return item.location === location && 
             item.dayOfWeek === day && 
             Math.abs(itemHour - hour) <= 1 && // Within 1 hour
             !this.isInactiveTeacher(teacherName);
    });

    const similarSlotsAvg = similarSlots.length > 0 
      ? similarSlots.reduce((sum, item) => sum + item.checkedIn, 0) / similarSlots.length 
      : 0;

    // Calculate opportunity score based on performance gaps
    const opportunityScore = Math.min(10, Math.max(1, 
      (similarSlotsAvg > 8 ? 9 : similarSlotsAvg > 5 ? 7 : 5) + 
      (similarSlots.length > 10 ? 1 : 0)
    ));

    return { similarSlotsAvg, opportunityScore };
  }

  private analyzeLocationPerformance(data: ClassData[]) {
    const locations = ['Kwality House, Kemps Corner', 'Supreme HQ, Bandra', 'Kenkere House'];
    
    return locations.reduce((acc, location) => {
      const locationData = data.filter(item => {
        const teacherName = item.teacherName || `${item.teacherFirstName} ${item.teacherLastName}`;
        return item.location === location && !this.isInactiveTeacher(teacherName);
      });
      
      if (locationData.length === 0) {
        acc[location] = { avgParticipants: 0, totalClasses: 0, avgRevenue: 0 };
        return acc;
      }

      acc[location] = {
        avgParticipants: locationData.reduce((sum, item) => sum + item.checkedIn, 0) / locationData.length,
        totalClasses: locationData.length,
        avgRevenue: locationData.reduce((sum, item) => sum + item.totalRevenue, 0) / locationData.length
      };
      return acc;
    }, {} as any);
  }

  private analyzeTeacherUtilization(schedule: ScheduledClass[]) {
    return schedule.reduce((acc, cls) => {
      const teacher = `${cls.teacherFirstName} ${cls.teacherLastName}`;
      if (!this.isInactiveTeacher(teacher)) {
        acc[teacher] = (acc[teacher] || 0) + parseFloat(cls.duration);
      }
      return acc;
    }, {} as any);
  }

  private async generateEnhancedLocalSchedule(
    historicData: ClassData[],
    currentSchedule: ScheduledClass[],
    customTeachers: any[],
    scoresData: HistoricScoreRow[],
    options: any
): Promise<ScheduledClass[]> {
    console.log(`🔄 AI Service: Generating enhanced local schedule with Scores.csv integration and ${options.optimizationType || 'balanced'} optimization...`);
    
    // Use the enhanced generateIntelligentSchedule function from classUtils
    const schedule = await generateIntelligentSchedule(historicData, customTeachers, scoresData, {
      prioritizeTopPerformers: true,
      balanceShifts: true,
      optimizeTeacherHours: true,
      respectTimeRestrictions: true,
      minimizeTrainersPerShift: true,
      optimizationType: options.optimizationType || 'balanced',
      iteration: options.iteration || 0
    });

    console.log(`✅ AI Service: Generated enhanced local schedule with Scores.csv integration: ${schedule.length} classes`);
    return schedule;
  }

  private parseOptimizedScheduleResponse(response: string, historicData: ClassData[]): ScheduledClass[] {
    try {
      const parsed = JSON.parse(response);
      const schedule = parsed.optimizedSchedule || [];
      
      return schedule
        .filter((cls: any) => {
          const teacherName = `${cls.teacherFirstName} ${cls.teacherLastName}`;
          return !this.isInactiveTeacher(teacherName); // Filter out inactive teachers
        })
        .map((cls: any, index: number) => ({
          id: `ai-optimized-scores-${Date.now()}-${index}`,
          day: cls.day,
          time: cls.time,
          location: cls.location,
          classFormat: cls.classFormat,
          teacherFirstName: cls.teacherFirstName,
          teacherLastName: cls.teacherLastName,
          duration: cls.duration || '1',
          participants: cls.expectedParticipants,
          revenue: cls.expectedRevenue,
          isTopPerformer: cls.isTopPerformer || cls.priority >= 8 || (cls.adjustedScore && cls.adjustedScore > 100)
        }));
    } catch (error) {
      console.error('🤖 AI Service: Failed to parse optimized schedule response:', error);
      return this.generateEnhancedLocalSchedule(historicData, [], [], [], {});
    }
  }

  async optimizeSchedule(
    historicData: ClassData[],
    currentSchedule: ScheduledClass[],
    teacherAvailability: any = {},
    scoresData: HistoricScoreRow[] = []
  ): Promise<OptimizationSuggestion[]> {
    // Always return fallback optimizations if no provider is configured or key is missing
    if (!this.provider || !this.provider.key || this.provider.key.trim() === '') {
      console.warn('🤖 AI Service: Provider not configured or missing API key, using enhanced fallback optimizations');
      return this.getEnhancedFallbackOptimizations(historicData, currentSchedule, scoresData);
    }

    const prompt = this.buildOptimizationPrompt(historicData, currentSchedule, teacherAvailability, scoresData);
    
    try {
      console.log('🤖 AI Service: Generating optimization suggestions with Scores.csv integration...');
      const response = await this.callAI(prompt);
      const suggestions = this.parseOptimizationResponse(response);
      console.log(`✅ AI Service: Generated ${suggestions.length} optimization suggestions`);
      return suggestions.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      console.warn('🤖 AI Service: Optimization error, falling back to enhanced local optimizations:', error);
      return this.getEnhancedFallbackOptimizations(historicData, currentSchedule, scoresData);
    }
  }

  private buildOptimizationPrompt(
    historicData: ClassData[], 
    currentSchedule: ScheduledClass[],
    teacherAvailability: any,
    scoresData: HistoricScoreRow[]
  ): string {
    const priorityTeachers = ['Anisha', 'Vivaran', 'Mrigakshi', 'Pranjali', 'Atulan', 'Cauveri', 'Rohan','Reshma','Richard','Karan','Karanvir'];
    const inactiveTeachers = ['Nishanth', 'Saniya'];
    const globalScoresAnalysis = this.analyzeGlobalScoresData(scoresData);
    
    return `
      Optimize this fitness studio schedule following these strict rules with enhanced trainer optimization and Scores.csv integration:
      
      Current Schedule:
      ${currentSchedule.map(cls => `${cls.day} ${cls.time} - ${cls.classFormat} with ${cls.teacherFirstName} ${cls.teacherLastName} at ${cls.location}`).join('\n')}
      
      OPTIMIZATION RULES:
      1. Max 15 classes per teacher per week (prioritize Anisha, Mrigakshi, Vivaran for overages)
      2. Max 4 classes per teacher per day
      3. Max 2 consecutive classes per teacher
      4. NO cross-location assignments on same day (ONE location per teacher per day)
      5. Prefer morning/evening shift separation (avoid same teacher working both shifts)
      6. WEEKDAY SECOND SHIFT: Must start at 5:00 PM or later (not before)
      7. Minimize trainers per shift per location (prefer 2 trainers for 4-5 classes)
      8. Assign experienced teachers to formats they've succeeded with
      9. Give all teachers 2 days off per week
      10. New teachers only for: Barre 57, Foundations, Recovery, Power Cycle
      11. Prioritize max hours for: ${priorityTeachers.join(', ')}
      12. Don't change successful historic combinations
      13. No overlapping classes for same teacher
      14. Fair mix of class levels horizontally and vertically
      15. Max 3-4 hours per teacher per day
      16. Studio capacity limits: Kwality (2), Supreme HQ (3), Kenkere (2)
      17. NEVER suggest hosted classes for automatic scheduling
      18. Recovery classes are 30 minutes, not 45 minutes
      19. NO recovery classes on Monday, Tuesday, Wednesday
      20. EXCLUDE INACTIVE TEACHERS: ${inactiveTeachers.join(', ')} (NEVER suggest these teachers)
      21. NEW TRAINERS (Kabir, Simonelle, Karan): Max 10 hours/week, limited formats
      22. Integrate Scores.csv insights for optimal class-teacher-time combinations
      
      ENHANCED SCORES.CSV INSIGHTS:
      ${globalScoresAnalysis.insights.join('\n')}
      
      TOP PERFORMING COMBINATIONS FROM SCORES.CSV:
      ${globalScoresAnalysis.topCombinations.slice(0, 10).map(combo => 
        `- ${combo.format} at ${combo.location} on ${combo.day} ${combo.time}: Score ${combo.score}, ${combo.trainer} (${combo.popularity})`
      ).join('\n')}
      
      Provide optimization suggestions in JSON format:
      {
        "suggestions": [
          {
            "type": "teacher_change",
            "originalClass": {...},
            "suggestedClass": {...},
            "reason": "explanation with trainer optimization logic and Scores.csv insights (ensure no inactive teachers suggested)",
            "impact": "expected improvement including trainer efficiency and score-based benefits",
            "priority": 8,
            "adjustedScore": 125.5,
            "popularityRating": "Hot/Steady/Declining",
            "consistencyRating": "Stable/Fluctuating"
          }
        ]
      }
    `;
  }

  private analyzeClassPerformance(data: ClassData[]) {
    const classStats = data.reduce((acc, item) => {
      const teacherName = item.teacherName || `${item.teacherFirstName} ${item.teacherLastName}`;
      if (this.isInactiveTeacher(teacherName)) return acc; // Skip inactive teachers
      
      if (!acc[item.cleanedClass]) {
        acc[item.cleanedClass] = { checkedIn: 0, revenue: 0, count: 0 };
      }
      acc[item.cleanedClass].checkedIn += item.checkedIn;
      acc[item.cleanedClass].revenue += item.totalRevenue;
      acc[item.cleanedClass].count += 1;
      return acc;
    }, {} as any);

    return Object.entries(classStats)
      .map(([classFormat, stats]: [string, any]) => ({
        classFormat,
        avgParticipants: stats.checkedIn / stats.count,
        avgRevenue: stats.revenue / stats.count,
        frequency: stats.count
      }))
      .sort((a, b) => b.avgParticipants - a.avgParticipants);
  }

  private analyzeTeacherPerformance(data: ClassData[]) {
    const teacherStats = data.reduce((acc, item) => {
      const teacherName = item.teacherName || `${item.teacherFirstName} ${item.teacherLastName}`;
      if (this.isInactiveTeacher(teacherName)) return acc; // Skip inactive teachers
      
      if (!acc[teacherName]) {
        acc[teacherName] = { checkedIn: 0, count: 0 };
      }
      acc[teacherName].checkedIn += item.checkedIn;
      acc[teacherName].count += 1;
      return acc;
    }, {} as any);

    return Object.entries(teacherStats)
      .map(([teacher, stats]: [string, any]) => ({
        teacher,
        avgParticipants: stats.checkedIn / stats.count,
        classesCount: stats.count
      }))
      .sort((a, b) => b.avgParticipants - a.avgParticipants);
  }

  private async callAI(prompt: string): Promise<string> {
    if (!this.provider) throw new Error('No AI provider configured');
    if (!this.provider.key || this.provider.key.trim() === '') {
      throw new Error('No API key provided');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.provider.key}`
    };

    let body: any;
    let url = this.provider.endpoint;

    switch (this.provider.name) {
      case 'OpenAI':
        body = {
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 4000
        };
        break;
      
      case 'Anthropic':
        headers['anthropic-version'] = '2023-06-01';
        body = {
          model: 'claude-3-sonnet-20240229',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4000
        };
        break;
      
      case 'DeepSeek':
        body = {
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 4000
        };
        break;
      
      case 'Groq':
        body = {
          model: 'mixtral-8x7b-32768',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 4000
        };
        break;
      
      default:
        throw new Error('Unsupported AI provider');
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API error (${response.status}): ${response.statusText}. ${errorText}`);
      }

      const data = await response.json();
      
      if (this.provider.name === 'Anthropic') {
        return data.content?.[0]?.text || '';
      } else {
        return data.choices?.[0]?.message?.content || '';
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to AI service. Please check your internet connection.');
      }
      throw error;
    }
  }

  private parseAIResponse(response: string): AIRecommendation[] {
    try {
      const parsed = JSON.parse(response);
      return (parsed.recommendations || [])
        .filter((rec: any) => {
          return !this.isInactiveTeacher(rec.teacher); // Filter out inactive teachers
        })
        .map((rec: any) => ({
          ...rec,
          priority: rec.priority || 5
        }));
    } catch (error) {
      console.error('🤖 AI Service: Failed to parse AI response:', error);
      return [];
    }
  }

  private parseOptimizationResponse(response: string): OptimizationSuggestion[] {
    try {
      const parsed = JSON.parse(response);
      return (parsed.suggestions || [])
        .filter((sug: any) => {
          // Filter out suggestions involving inactive teachers
          if (sug.originalClass) {
            const originalTeacher = `${sug.originalClass.teacherFirstName} ${sug.originalClass.teacherLastName}`;
            if (this.isInactiveTeacher(originalTeacher)) return false;
          }
          if (sug.suggestedClass) {
            const suggestedTeacher = `${sug.suggestedClass.teacherFirstName} ${sug.suggestedClass.teacherLastName}`;
            if (this.isInactiveTeacher(suggestedTeacher)) return false;
          }
          return true;
        })
        .map((sug: any) => ({
          ...sug,
          priority: sug.priority || 5
        }));
    } catch (error) {
      console.error('🤖 AI Service: Failed to parse optimization response:', error);
      return [];
    }
  }

  private getEnhancedFallbackRecommendations(
    data: ClassData[], 
    location: string, 
    day: string, 
    time: string,
    scoresData: HistoricScoreRow[]
): AIRecommendation[] {
    console.log(`🔄 AI Service: Generating enhanced fallback recommendations with Scores.csv for ${location} on ${day} at ${time}`);
    
    // Filter out inactive teachers from data
    const activeData = data.filter(item => {
      const teacherName = item.teacherName || `${item.teacherFirstName} ${item.teacherLastName}`;
      return !this.isInactiveTeacher(teacherName);
    });
    
    const locationData = activeData.filter(item => 
      item.location === location && 
      !item.cleanedClass.toLowerCase().includes('hosted') // Filter out hosted classes
    );
    const classStats = this.analyzeClassPerformance(locationData);

    // If no location data, use all active data
    const analysisData = locationData.length > 0 ? locationData : activeData.filter(item => 
      !item.cleanedClass.toLowerCase().includes('hosted')
    );
    const finalStats = locationData.length > 0 ? classStats : this.analyzeClassPerformance(analysisData);

    // Enhance with Scores.csv data
    const enhancedStats = finalStats.map(stat => {
      const scoreRow = scoresData.find(score => 
        score.location === location &&
        score.dayOfWeek === day &&
        score.classTime.includes(time.slice(0, 5)) &&
        score.cleanedClass === stat.classFormat
      );

      return {
        ...stat,
        adjustedScore: scoreRow?.adjustedScore || 0,
        popularity: scoreRow?.popularity || 'Unknown',
        consistency: scoreRow?.consistency || 'Unknown'
      };
    }).sort((a, b) => {
      // Prioritize by adjusted score if available, then by avgParticipants
      if (a.adjustedScore && b.adjustedScore) {
        return b.adjustedScore - a.adjustedScore;
      }
      return b.avgParticipants - a.avgParticipants;
    });

    return enhancedStats.slice(0, 5).map((stats, index) => ({
      classFormat: stats.classFormat,
      teacher: 'Best Available (Enhanced with Scores.csv)',
      reasoning: `High-performing class with ${stats.avgParticipants.toFixed(1)} average check-ins and adjusted score of ${stats.adjustedScore || 'N/A'} (${stats.popularity} popularity, ${stats.consistency} consistency). Enhanced analysis excludes inactive teachers and integrates performance scoring.`,
      confidence: Math.min(0.9, stats.frequency / 10),
      expectedParticipants: Math.round(stats.avgParticipants),
      expectedRevenue: Math.round(stats.avgRevenue),
      priority: 10 - index * 2,
      timeSlot: time,
      location: location
    }));
  }

  private getEnhancedFallbackOptimizations(
    historicData: ClassData[],
    currentSchedule: ScheduledClass[],
    scoresData: HistoricScoreRow[]
  ): OptimizationSuggestion[] {
    console.log('🔄 AI Service: Generating enhanced fallback optimizations with Scores.csv integration...');
    
    // Enhanced optimization logic as fallback
    const suggestions: OptimizationSuggestion[] = [];
    const inactiveTeachers = ['Nishanth', 'Saniya'];
    
    // Find teachers with too many hours (excluding inactive teachers)
    const teacherHours: Record<string, number> = {};
    const teacherDailyClasses: Record<string, Record<string, number>> = {};
    const teacherLocations: Record<string, Record<string, string[]>> = {};
    
    currentSchedule.forEach(cls => {
      const teacherName = `${cls.teacherFirstName} ${cls.teacherLastName}`;
      if (this.isInactiveTeacher(teacherName)) return; // Skip inactive teachers
      
      teacherHours[teacherName] = (teacherHours[teacherName] || 0) + parseFloat(cls.duration || '1');
      
      if (!teacherDailyClasses[teacherName]) teacherDailyClasses[teacherName] = {};
      if (!teacherLocations[teacherName]) teacherLocations[teacherName] = {};
      
      teacherDailyClasses[teacherName][cls.day] = (teacherDailyClasses[teacherName][cls.day] || 0) + 1;
      
      if (!teacherLocations[teacherName][cls.day]) teacherLocations[teacherName][cls.day] = [];
      if (!teacherLocations[teacherName][cls.day].includes(cls.location)) {
        teacherLocations[teacherName][cls.day].push(cls.location);
      }
    });

    // Check for weekday second shift violations (before 5 PM)
    currentSchedule.forEach(cls => {
      const hour = parseInt(cls.time.split(':')[0]);
      const isWeekday = !['Saturday', 'Sunday'].includes(cls.day);
      const isAfternoonShift = hour >= 12 && hour < 17;
      
      if (isWeekday && isAfternoonShift && hour < 17) {
        suggestions.push({
          type: 'time_change',
          originalClass: cls,
          suggestedClass: {
            ...cls,
            time: '17:00' // Move to 5 PM
          },
          reason: `Weekday second shift class at ${cls.time} violates 5:00 PM minimum start time rule. Enhanced optimization ensures compliance with updated shift timing requirements.`,
          impact: 'Ensures compliance with weekday second shift timing rules and improves operational efficiency',
          priority: 9
        });
      }
    });

    // Suggest redistributing hours for overloaded teachers
    Object.entries(teacherHours).forEach(([teacher, hours]) => {
      if (hours > 15) {
        const overloadedClasses = currentSchedule.filter(cls => 
          `${cls.teacherFirstName} ${cls.teacherLastName}` === teacher
        );
        
        if (overloadedClasses.length > 0) {
          // Find better alternative using Scores.csv data
          const classToReassign = overloadedClasses[0];
          const scoreRow = scoresData.find(score => 
            score.location === classToReassign.location &&
            score.dayOfWeek === classToReassign.day &&
            score.classTime.includes(classToReassign.time.slice(0, 5)) &&
            score.cleanedClass === classToReassign.classFormat
          );

          suggestions.push({
            type: 'teacher_change',
            originalClass: classToReassign,
            suggestedClass: {
              ...classToReassign,
              teacherFirstName: 'Alternative',
              teacherLastName: 'Teacher'
            },
            reason: `${teacher} is overloaded with ${hours.toFixed(1)} hours. Enhanced optimization with Scores.csv suggests redistributing classes to maintain work-life balance and prevent trainer burnout. ${scoreRow ? `Current combination has adjusted score of ${scoreRow.adjustedScore}.` : ''} Note: Inactive teachers (${inactiveTeachers.join(', ')}) are excluded from assignments.`,
            impact: `Better work-life balance, reduced teacher fatigue, and improved class quality through optimal trainer assignment. ${scoreRow ? `Opportunity to improve score from ${scoreRow.adjustedScore}.` : ''}`,
            priority: 8
          });
        }
      }
    });

    // Check for cross-location assignments
    Object.entries(teacherLocations).forEach(([teacher, dayLocations]) => {
      Object.entries(dayLocations).forEach(([day, locations]) => {
        if (locations.length > 1) {
          const crossLocationClasses = currentSchedule.filter(cls => 
            `${cls.teacherFirstName} ${cls.teacherLastName}` === teacher && cls.day === day
          );
          
          if (crossLocationClasses.length > 1) {
            suggestions.push({
              type: 'teacher_change',
              originalClass: crossLocationClasses[1],
              suggestedClass: {
                ...crossLocationClasses[1],
                teacherFirstName: 'Location-Consistent',
                teacherLastName: 'Teacher'
              },
              reason: `${teacher} is assigned to multiple locations on ${day} (${locations.join(', ')}). Enhanced optimization requires one location per teacher per day. Inactive teachers (${inactiveTeachers.join(', ')}) are excluded from reassignments.`,
              impact: 'Improved operational efficiency, reduced travel time, and better trainer focus',
              priority: 9
            });
          }
        }
      });
    });

    // Check for daily class limits
    Object.entries(teacherDailyClasses).forEach(([teacher, dailyClasses]) => {
      Object.entries(dailyClasses).forEach(([day, classCount]) => {
        if (classCount > 4) {
          const dayClasses = currentSchedule.filter(cls => 
            `${cls.teacherFirstName} ${cls.teacherLastName}` === teacher && cls.day === day
          );
          
          if (dayClasses.length > 0) {
            suggestions.push({
              type: 'teacher_change',
              originalClass: dayClasses[dayClasses.length - 1],
              suggestedClass: {
                ...dayClasses[dayClasses.length - 1],
                teacherFirstName: 'Alternative',
                teacherLastName: 'Teacher'
              },
              reason: `${teacher} has ${classCount} classes on ${day}, exceeding the 4-class daily limit. Enhanced optimization ensures sustainable workload. Inactive teachers (${inactiveTeachers.join(', ')}) are not considered for reassignment.`,
              impact: 'Prevents trainer fatigue and maintains high-quality instruction throughout the day',
              priority: 8
            });
          }
        }
      });
    });

    console.log(`✅ AI Service: Generated ${suggestions.length} enhanced fallback optimization suggestions with Scores.csv integration (excluding inactive teachers)`);
    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  private isInactiveTeacher(teacherName: string): boolean {
    const inactiveTeachers = ['Nishanth', 'Saniya'];
    return inactiveTeachers.some(inactive => 
      teacherName.toLowerCase().includes(inactive.toLowerCase())
    );
  }
}

export const aiService = new AIService();