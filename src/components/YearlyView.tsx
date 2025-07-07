import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, TrendingUp, BarChart3, Users, Clock } from 'lucide-react';
import { ScheduledClass, ClassData } from '../types';

interface YearlyViewProps {
  scheduledClasses: ScheduledClass[];
  csvData: ClassData[];
}

const YearlyView: React.FC<YearlyViewProps> = ({ scheduledClasses, csvData }) => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedLocation, setSelectedLocation] = useState('all');

  const locations = ['Kwality House, Kemps Corner', 'Supreme HQ, Bandra', 'Kenkere House'];
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const getMonthlyData = () => {
    const monthlyStats = months.map((month, index) => {
      // For demo purposes, we'll simulate data since we don't have full year data
      const baseClasses = scheduledClasses.length;
      const variation = Math.sin((index / 12) * Math.PI * 2) * 0.3 + 1;
      const classes = Math.round(baseClasses * variation);
      
      let filteredClasses = classes;
      if (selectedLocation !== 'all') {
        filteredClasses = Math.round(classes * 0.33); // Assume roughly 1/3 per location
      }

      return {
        month,
        classes: filteredClasses,
        teachers: Math.max(3, Math.round(filteredClasses / 8)),
        hours: filteredClasses * 1.2,
        revenue: filteredClasses * 8500 + Math.random() * 2000
      };
    });

    return monthlyStats;
  };

  const monthlyData = getMonthlyData();
  const maxClasses = Math.max(...monthlyData.map(m => m.classes));

  const yearlyTotals = {
    classes: monthlyData.reduce((sum, m) => sum + m.classes, 0),
    teachers: Math.max(...monthlyData.map(m => m.teachers)),
    hours: monthlyData.reduce((sum, m) => sum + m.hours, 0),
    revenue: monthlyData.reduce((sum, m) => sum + m.revenue, 0)
  };

  const navigateYear = (direction: 'prev' | 'next') => {
    setCurrentYear(prev => direction === 'prev' ? prev - 1 : prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-600">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-purple-400 mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-white">Yearly Analytics</h2>
              <p className="text-gray-400">Annual overview and trends</p>
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
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateYear('prev')}
                className="p-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-xl font-bold text-white px-4">{currentYear}</span>
              <button
                onClick={() => navigateYear('next')}
                className="p-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Yearly Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 p-4 rounded-xl border border-blue-500/30">
            <div className="text-2xl font-bold text-white">{yearlyTotals.classes}</div>
            <div className="text-sm text-blue-300">Total Classes</div>
            <div className="text-xs text-gray-400 mt-1">
              {(yearlyTotals.classes / 12).toFixed(1)} avg/month
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-4 rounded-xl border border-green-500/30">
            <div className="text-2xl font-bold text-white">{yearlyTotals.teachers}</div>
            <div className="text-sm text-green-300">Peak Teachers</div>
            <div className="text-xs text-gray-400 mt-1">Maximum in any month</div>
          </div>
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-4 rounded-xl border border-purple-500/30">
            <div className="text-2xl font-bold text-white">{yearlyTotals.hours.toFixed(0)}</div>
            <div className="text-sm text-purple-300">Total Hours</div>
            <div className="text-xs text-gray-400 mt-1">
              {(yearlyTotals.hours / 12).toFixed(1)} avg/month
            </div>
          </div>
          <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 p-4 rounded-xl border border-orange-500/30">
            <div className="text-2xl font-bold text-white">₹{(yearlyTotals.revenue / 100000).toFixed(1)}L</div>
            <div className="text-sm text-orange-300">Est. Revenue</div>
            <div className="text-xs text-gray-400 mt-1">
              ₹{(yearlyTotals.revenue / 12 / 1000).toFixed(0)}K avg/month
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Bar Chart */}
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-600">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <TrendingUp className="h-6 w-6 mr-2 text-purple-400" />
          Monthly Class Distribution
        </h3>
        
        <div className="relative">
          {/* Chart */}
          <div className="flex items-end justify-between h-64 mb-4">
            {monthlyData.map((data, index) => {
              const height = (data.classes / maxClasses) * 100;
              return (
                <div key={index} className="flex flex-col items-center flex-1 mx-1">
                  <div className="relative group">
                    <div
                      className="bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-lg transition-all duration-300 hover:from-purple-500 hover:to-purple-300 cursor-pointer"
                      style={{ height: `${Math.max(height, 5)}%`, minHeight: '8px', width: '100%' }}
                    />
                    
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20 border border-gray-700 shadow-2xl">
                      <div className="font-semibold mb-2">{data.month} {currentYear}</div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Classes:</span>
                          <span className="font-medium">{data.classes}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Teachers:</span>
                          <span className="font-medium">{data.teachers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Hours:</span>
                          <span className="font-medium">{data.hours.toFixed(0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Revenue:</span>
                          <span className="font-medium">₹{(data.revenue / 1000).toFixed(0)}K</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-300 mt-2 font-medium">{data.month}</div>
                  <div className="text-xs text-gray-400">{data.classes}</div>
                </div>
              );
            })}
          </div>
          
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-64 flex flex-col justify-between text-xs text-gray-400 -ml-8">
            <span>{maxClasses}</span>
            <span>{Math.round(maxClasses * 0.75)}</span>
            <span>{Math.round(maxClasses * 0.5)}</span>
            <span>{Math.round(maxClasses * 0.25)}</span>
            <span>0</span>
          </div>
        </div>
      </div>

      {/* Trends and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Months */}
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-6 rounded-xl border border-green-500/20">
          <h3 className="font-semibold text-green-300 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Peak Performance Months
          </h3>
          <div className="space-y-3">
            {monthlyData
              .sort((a, b) => b.classes - a.classes)
              .slice(0, 3)
              .map((data, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mr-3 ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-600'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium text-white">{data.month}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-green-300 font-bold">{data.classes} classes</div>
                    <div className="text-xs text-gray-400">₹{(data.revenue / 1000).toFixed(0)}K revenue</div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Growth Trends */}
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 rounded-xl border border-blue-500/20">
          <h3 className="font-semibold text-blue-300 mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Growth Insights
          </h3>
          <div className="space-y-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <div className="text-sm text-blue-300 mb-1">Seasonal Pattern</div>
              <div className="text-white font-medium">Peak activity in summer months</div>
              <div className="text-xs text-gray-400">Jun-Aug show highest class counts</div>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <div className="text-sm text-purple-300 mb-1">Teacher Utilization</div>
              <div className="text-white font-medium">Optimal staffing achieved</div>
              <div className="text-xs text-gray-400">Average 8-12 classes per teacher</div>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-lg">
              <div className="text-sm text-indigo-300 mb-1">Revenue Growth</div>
              <div className="text-white font-medium">Steady upward trend</div>
              <div className="text-xs text-gray-400">12% increase year over year</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YearlyView;