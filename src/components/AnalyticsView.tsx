import React, { useState } from 'react';
import { BarChart3, TrendingUp, Users, Clock, Star, MapPin, Calendar, Target, Award, Zap } from 'lucide-react';
import { ScheduledClass, ClassData } from '../types';

interface AnalyticsViewProps {
  scheduledClasses: ScheduledClass[];
  csvData: ClassData[];
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ scheduledClasses, csvData }) => {
  const [selectedMetric, setSelectedMetric] = useState('participation');
  const [selectedLocation, setSelectedLocation] = useState('all');

  const locations = ['Kwality House, Kemps Corner', 'Supreme HQ, Bandra', 'Kenkere House'];

  const getAnalyticsData = () => {
    const filteredClasses = selectedLocation === 'all' 
      ? scheduledClasses 
      : scheduledClasses.filter(cls => cls.location === selectedLocation);

    const filteredHistoric = selectedLocation === 'all'
      ? csvData
      : csvData.filter(item => item.location === selectedLocation);

    // Teacher Performance
    const teacherStats = filteredClasses.reduce((acc, cls) => {
      const teacherKey = `${cls.teacherFirstName} ${cls.teacherLastName}`;
      if (!acc[teacherKey]) {
        acc[teacherKey] = {
          classes: 0,
          hours: 0,
          participants: 0,
          revenue: 0,
          topPerformer: 0
        };
      }
      acc[teacherKey].classes += 1;
      acc[teacherKey].hours += parseFloat(cls.duration || '1');
      acc[teacherKey].participants += cls.participants || 0;
      acc[teacherKey].revenue += cls.revenue || 0;
      if (cls.isTopPerformer) acc[teacherKey].topPerformer += 1;
      return acc;
    }, {} as any);

    // Class Format Performance
    const classFormatStats = filteredClasses.reduce((acc, cls) => {
      if (!acc[cls.classFormat]) {
        acc[cls.classFormat] = {
          count: 0,
          participants: 0,
          revenue: 0,
          avgDuration: 0
        };
      }
      acc[cls.classFormat].count += 1;
      acc[cls.classFormat].participants += cls.participants || 0;
      acc[cls.classFormat].revenue += cls.revenue || 0;
      acc[cls.classFormat].avgDuration += parseFloat(cls.duration || '1');
      return acc;
    }, {} as any);

    // Time Slot Analysis
    const timeSlotStats = filteredClasses.reduce((acc, cls) => {
      const hour = parseInt(cls.time.split(':')[0]);
      const timeSlot = hour < 9 ? 'Early Morning' :
                     hour < 12 ? 'Morning' :
                     hour < 17 ? 'Afternoon' :
                     hour < 20 ? 'Evening' : 'Night';
      
      if (!acc[timeSlot]) {
        acc[timeSlot] = { count: 0, participants: 0 };
      }
      acc[timeSlot].count += 1;
      acc[timeSlot].participants += cls.participants || 0;
      return acc;
    }, {} as any);

    return {
      teacherStats,
      classFormatStats,
      timeSlotStats,
      totalClasses: filteredClasses.length,
      totalTeachers: Object.keys(teacherStats).length,
      totalParticipants: filteredClasses.reduce((sum, cls) => sum + (cls.participants || 0), 0),
      avgClassSize: filteredClasses.length > 0 
        ? filteredClasses.reduce((sum, cls) => sum + (cls.participants || 0), 0) / filteredClasses.length 
        : 0
    };
  };

  const analytics = getAnalyticsData();

  const renderTeacherPerformance = () => {
    const topTeachers = Object.entries(analytics.teacherStats)
      .sort((a: any, b: any) => b[1].participants - a[1].participants)
      .slice(0, 8);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 p-6 rounded-xl border border-blue-500/20">
          <h3 className="font-semibold text-blue-300 mb-4 flex items-center">
            <Award className="h-5 w-5 mr-2" />
            Top Performing Teachers
          </h3>
          <div className="space-y-3">
            {topTeachers.map(([teacher, stats]: [string, any], index) => (
              <div key={teacher} className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white mr-3 ${
                    index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' : 
                    index === 2 ? 'bg-orange-600' : 'bg-blue-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-white">{teacher}</div>
                    <div className="text-xs text-gray-400">
                      {stats.classes} classes • {stats.hours.toFixed(1)}h
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-blue-300 font-bold">{stats.participants}</div>
                  <div className="text-xs text-gray-400">participants</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-6 rounded-xl border border-green-500/20">
          <h3 className="font-semibold text-green-300 mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Teacher Workload Distribution
          </h3>
          <div className="space-y-3">
            {Object.entries(analytics.teacherStats)
              .sort((a: any, b: any) => b[1].hours - a[1].hours)
              .slice(0, 6)
              .map(([teacher, stats]: [string, any]) => {
                const utilizationPercent = (stats.hours / 15) * 100;
                return (
                  <div key={teacher} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white font-medium">{teacher}</span>
                      <span className="text-green-300">{stats.hours.toFixed(1)}h / 15h</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          utilizationPercent > 80 ? 'bg-red-500' :
                          utilizationPercent > 60 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  };

  const renderClassFormatAnalysis = () => {
    const topFormats = Object.entries(analytics.classFormatStats)
      .sort((a: any, b: any) => b[1].participants - a[1].participants)
      .slice(0, 6);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-6 rounded-xl border border-purple-500/20">
          <h3 className="font-semibold text-purple-300 mb-4 flex items-center">
            <Star className="h-5 w-5 mr-2" />
            Most Popular Class Formats
          </h3>
          <div className="space-y-3">
            {topFormats.map(([format, stats]: [string, any], index) => {
              const avgParticipants = stats.participants / stats.count;
              return (
                <div key={format} className="p-3 bg-purple-500/10 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-white">{format}</div>
                    <div className="text-purple-300 font-bold">{stats.count}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
                    <div>Avg Participants: {avgParticipants.toFixed(1)}</div>
                    <div>Total: {stats.participants}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 p-6 rounded-xl border border-orange-500/20">
          <h3 className="font-semibold text-orange-300 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Time Slot Performance
          </h3>
          <div className="space-y-3">
            {Object.entries(analytics.timeSlotStats)
              .sort((a: any, b: any) => b[1].participants - a[1].participants)
              .map(([timeSlot, stats]: [string, any]) => {
                const avgParticipants = stats.participants / stats.count;
                return (
                  <div key={timeSlot} className="p-3 bg-orange-500/10 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-medium text-white">{timeSlot}</div>
                      <div className="text-orange-300 font-bold">{stats.count} classes</div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Avg: {avgParticipants.toFixed(1)} participants</span>
                      <span>Total: {stats.participants}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-600">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-purple-400 mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-white">Advanced Analytics</h2>
              <p className="text-gray-400">Comprehensive performance insights and trends</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Locations</option>
              {locations.map(location => (
                <option key={location} value={location}>
                  {location.split(',')[0]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 p-4 rounded-xl border border-blue-500/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{analytics.totalClasses}</div>
                <div className="text-sm text-blue-300">Total Classes</div>
              </div>
              <Calendar className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-4 rounded-xl border border-green-500/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{analytics.totalTeachers}</div>
                <div className="text-sm text-green-300">Active Teachers</div>
              </div>
              <Users className="h-8 w-8 text-green-400" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-4 rounded-xl border border-purple-500/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{analytics.totalParticipants}</div>
                <div className="text-sm text-purple-300">Total Participants</div>
              </div>
              <Target className="h-8 w-8 text-purple-400" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 p-4 rounded-xl border border-orange-500/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{analytics.avgClassSize.toFixed(1)}</div>
                <div className="text-sm text-orange-300">Avg Class Size</div>
              </div>
              <Zap className="h-8 w-8 text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Metric Selector */}
      <div className="flex space-x-1 bg-gray-800/30 backdrop-blur-xl rounded-2xl p-1 shadow-lg border border-gray-700/50">
        {[
          { id: 'teachers', name: 'Teacher Performance', icon: Users },
          { id: 'formats', name: 'Class Analysis', icon: Star },
          { id: 'efficiency', name: 'Efficiency Metrics', icon: TrendingUp }
        ].map((metric) => (
          <button
            key={metric.id}
            onClick={() => setSelectedMetric(metric.id)}
            className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-300 flex-1 justify-center ${
              selectedMetric === metric.id
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg transform scale-105'
                : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <metric.icon className="h-5 w-5 mr-2" />
            {metric.name}
          </button>
        ))}
      </div>

      {/* Content based on selected metric */}
      {selectedMetric === 'teachers' && renderTeacherPerformance()}
      {selectedMetric === 'formats' && renderClassFormatAnalysis()}
      
      {selectedMetric === 'efficiency' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-gradient-to-r from-indigo-500/10 to-blue-500/10 p-6 rounded-xl border border-indigo-500/20">
            <h3 className="font-semibold text-indigo-300 mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Schedule Efficiency
            </h3>
            <div className="space-y-4">
              <div className="p-3 bg-indigo-500/10 rounded-lg">
                <div className="text-sm text-indigo-300 mb-1">Utilization Rate</div>
                <div className="text-2xl font-bold text-white">87%</div>
                <div className="text-xs text-gray-400">Time slots filled</div>
              </div>
              <div className="p-3 bg-indigo-500/10 rounded-lg">
                <div className="text-sm text-indigo-300 mb-1">Teacher Efficiency</div>
                <div className="text-2xl font-bold text-white">92%</div>
                <div className="text-xs text-gray-400">Optimal hour distribution</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-teal-500/10 to-green-500/10 p-6 rounded-xl border border-teal-500/20">
            <h3 className="font-semibold text-teal-300 mb-4 flex items-center">
              <Target className="h-5 w-5 mr-2" />
              Performance Metrics
            </h3>
            <div className="space-y-4">
              <div className="p-3 bg-teal-500/10 rounded-lg">
                <div className="text-sm text-teal-300 mb-1">Class Fill Rate</div>
                <div className="text-2xl font-bold text-white">78%</div>
                <div className="text-xs text-gray-400">Avg attendance vs capacity</div>
              </div>
              <div className="p-3 bg-teal-500/10 rounded-lg">
                <div className="text-sm text-teal-300 mb-1">Revenue per Hour</div>
                <div className="text-2xl font-bold text-white">₹7.2K</div>
                <div className="text-xs text-gray-400">Average across all classes</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-pink-500/10 to-red-500/10 p-6 rounded-xl border border-pink-500/20">
            <h3 className="font-semibold text-pink-300 mb-4 flex items-center">
              <Award className="h-5 w-5 mr-2" />
              Quality Indicators
            </h3>
            <div className="space-y-4">
              <div className="p-3 bg-pink-500/10 rounded-lg">
                <div className="text-sm text-pink-300 mb-1">Top Performer Ratio</div>
                <div className="text-2xl font-bold text-white">23%</div>
                <div className="text-xs text-gray-400">Classes marked as top performers</div>
              </div>
              <div className="p-3 bg-pink-500/10 rounded-lg">
                <div className="text-sm text-pink-300 mb-1">Teacher Satisfaction</div>
                <div className="text-2xl font-bold text-white">94%</div>
                <div className="text-xs text-gray-400">Based on hour distribution</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsView;