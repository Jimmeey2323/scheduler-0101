import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Users, Clock, TrendingUp, MapPin } from 'lucide-react';
import { ScheduledClass, ClassData } from '../types';

interface MonthlyViewProps {
  scheduledClasses: ScheduledClass[];
  csvData: ClassData[];
}

const MonthlyView: React.FC<MonthlyViewProps> = ({ scheduledClasses, csvData }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedLocation, setSelectedLocation] = useState('all');

  const locations = ['Kwality House, Kemps Corner', 'Supreme HQ, Bandra', 'Kenkere House'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getClassesForDate = (date: Date | null) => {
    if (!date) return [];
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    let classes = scheduledClasses.filter(cls => cls.day === dayName);
    
    if (selectedLocation !== 'all') {
      classes = classes.filter(cls => cls.location === selectedLocation);
    }
    
    return classes;
  };

  const getHeatmapIntensity = (date: Date | null) => {
    if (!date) return 0;
    const classes = getClassesForDate(date);
    const intensity = Math.min(classes.length / 8, 1); // Normalize to 0-1
    return intensity;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const totalClasses = scheduledClasses.filter(cls => 
    selectedLocation === 'all' || cls.location === selectedLocation
  ).length;

  const uniqueTeachers = new Set(
    scheduledClasses
      .filter(cls => selectedLocation === 'all' || cls.location === selectedLocation)
      .map(cls => `${cls.teacherFirstName} ${cls.teacherLastName}`)
  ).size;

  const avgClassesPerDay = totalClasses / days.filter(day => day !== null).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-600">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-blue-400 mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-white">Monthly Schedule View</h2>
              <p className="text-gray-400">Heatmap visualization of class distribution</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-500/20 p-4 rounded-xl border border-blue-500/30">
            <div className="text-2xl font-bold text-white">{totalClasses}</div>
            <div className="text-sm text-blue-300">Total Classes</div>
          </div>
          <div className="bg-green-500/20 p-4 rounded-xl border border-green-500/30">
            <div className="text-2xl font-bold text-white">{uniqueTeachers}</div>
            <div className="text-sm text-green-300">Active Teachers</div>
          </div>
          <div className="bg-purple-500/20 p-4 rounded-xl border border-purple-500/30">
            <div className="text-2xl font-bold text-white">{avgClassesPerDay.toFixed(1)}</div>
            <div className="text-sm text-purple-300">Avg Classes/Day</div>
          </div>
          <div className="bg-orange-500/20 p-4 rounded-xl border border-orange-500/30">
            <div className="text-2xl font-bold text-white">{monthName.split(' ')[0]}</div>
            <div className="text-sm text-orange-300">Current Month</div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/50 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-600">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600/30 to-purple-600/30 border-b border-gray-600">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          
          <h3 className="text-xl font-bold text-white">{monthName}</h3>
          
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 bg-gray-800/50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-4 text-center font-semibold text-gray-300 border-b border-gray-600">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {days.map((date, index) => {
            const classes = getClassesForDate(date);
            const intensity = getHeatmapIntensity(date);
            const isToday = date && date.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={index}
                className={`relative h-24 border-b border-r border-gray-600 transition-all duration-200 hover:bg-gray-700/30 ${
                  date ? 'cursor-pointer' : ''
                } ${isToday ? 'ring-2 ring-blue-400' : ''}`}
                style={{
                  backgroundColor: date && intensity > 0 
                    ? `rgba(139, 92, 246, ${0.1 + intensity * 0.4})` 
                    : undefined
                }}
              >
                {date && (
                  <>
                    <div className="p-2">
                      <div className={`text-sm font-medium ${
                        isToday ? 'text-blue-400' : 'text-white'
                      }`}>
                        {date.getDate()}
                      </div>
                      {classes.length > 0 && (
                        <div className="mt-1">
                          <div className="text-xs text-gray-300">
                            {classes.length} class{classes.length !== 1 ? 'es' : ''}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {classes.slice(0, 3).map((cls, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${
                                  cls.isTopPerformer ? 'bg-yellow-400' :
                                  cls.isPrivate ? 'bg-purple-400' :
                                  'bg-green-400'
                                }`}
                              />
                            ))}
                            {classes.length > 3 && (
                              <div className="text-xs text-gray-400">+{classes.length - 3}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Hover Tooltip */}
                    {classes.length > 0 && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20 border border-gray-700 shadow-2xl">
                        <div className="font-semibold mb-2">
                          {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="space-y-1">
                          {classes.slice(0, 5).map((cls, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <span className="truncate">{cls.time} - {cls.classFormat}</span>
                              <span className="text-gray-400 ml-2">{cls.teacherFirstName}</span>
                            </div>
                          ))}
                          {classes.length > 5 && (
                            <div className="text-gray-400 text-center">
                              +{classes.length - 5} more classes
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-600">
        <h3 className="font-semibold text-white mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-blue-400" />
          Heatmap Legend
        </h3>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-700 rounded"></div>
            <span className="text-sm text-gray-300">No Classes</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-purple-500/30 rounded"></div>
            <span className="text-sm text-gray-300">Low Activity</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-purple-500/60 rounded"></div>
            <span className="text-sm text-gray-300">Medium Activity</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span className="text-sm text-gray-300">High Activity</span>
          </div>
        </div>
        
        <div className="mt-4 flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            <span className="text-sm text-gray-300">Top Performer</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
            <span className="text-sm text-gray-300">Private Class</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            <span className="text-sm text-gray-300">Regular Class</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyView;