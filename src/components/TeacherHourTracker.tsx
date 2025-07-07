import React, { useState } from 'react';
import { Clock, AlertTriangle, CheckCircle, User, TrendingUp, Award, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { TeacherHours } from '../types';

interface TeacherHourTrackerProps {
  teacherHours: TeacherHours;
  theme: any;
  showCards: boolean;
  onToggleCards: () => void;
}

const TeacherHourTracker: React.FC<TeacherHourTrackerProps> = ({ teacherHours, theme, showCards, onToggleCards }) => {
  const getStatusColor = (hours: number) => {
    if (hours >= 15) return 'from-red-500 to-red-600';
    if (hours >= 12) return 'from-yellow-500 to-orange-500';
    return 'from-green-500 to-emerald-500';
  };

  const getStatusIcon = (hours: number) => {
    if (hours >= 15) return <AlertTriangle className="h-4 w-4" />;
    if (hours >= 12) return <AlertTriangle className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getStatusText = (hours: number) => {
    if (hours >= 15) return 'Limit Exceeded';
    if (hours >= 12) return 'Near Limit';
    return 'Available';
  };

  const priorityTeachers = ['Anisha', 'Vivaran', 'Mrigakshi', 'Pranjali', 'Atulan', 'Cauveri', 'Rohan'];
  const teachers = Object.entries(teacherHours).sort((a, b) => {
    // Sort priority teachers first, then by hours
    const aIsPriority = priorityTeachers.some(name => a[0].includes(name));
    const bIsPriority = priorityTeachers.some(name => b[0].includes(name));
    
    if (aIsPriority && !bIsPriority) return -1;
    if (!aIsPriority && bIsPriority) return 1;
    return b[1] - a[1];
  });

  if (teachers.length === 0) {
    return null;
  }

  const totalHours = teachers.reduce((sum, [, hours]) => sum + hours, 0);
  const averageHours = totalHours / teachers.length;

  return (
    <div className={`${theme.card} rounded-2xl p-6 mb-6 border ${theme.border} shadow-lg`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className={`text-xl font-semibold ${theme.text} flex items-center`}>
            <Clock className={`h-6 w-6 mr-3 ${theme.accent}`} />
            Teacher Hour Tracker
          </h3>
          <p className={`${theme.textSecondary} mt-1`}>Weekly limit: 15 hours per teacher</p>
        </div>
        <div className="flex items-center space-x-6 text-sm">
          <div className="text-center">
            <div className={`text-2xl font-bold ${theme.text}`}>{totalHours.toFixed(1)}</div>
            <div className={theme.textSecondary}>Total Hours</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${theme.text}`}>{averageHours.toFixed(1)}</div>
            <div className={theme.textSecondary}>Avg per Teacher</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${theme.text}`}>{teachers.length}</div>
            <div className={theme.textSecondary}>Active Teachers</div>
          </div>
          <button
            onClick={onToggleCards}
            className={`flex items-center px-4 py-2 ${theme.button} rounded-lg transition-colors`}
          >
            <Users className={`h-4 w-4 mr-2 ${theme.accent}`} />
            <span className={theme.text}>Teacher Cards</span>
            {showCards ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
          </button>
        </div>
      </div>
      
      {/* Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-500/20 p-4 rounded-xl border border-blue-500/30">
          <div className={`text-2xl font-bold ${theme.text}`}>{teachers.filter(([, hours]) => hours < 9).length}</div>
          <div className="text-sm text-blue-300">Under 9h</div>
        </div>
        <div className="bg-green-500/20 p-4 rounded-xl border border-green-500/30">
          <div className={`text-2xl font-bold ${theme.text}`}>{teachers.filter(([, hours]) => hours >= 9 && hours < 12).length}</div>
          <div className="text-sm text-green-300">9-12h</div>
        </div>
        <div className="bg-yellow-500/20 p-4 rounded-xl border border-yellow-500/30">
          <div className={`text-2xl font-bold ${theme.text}`}>{teachers.filter(([, hours]) => hours >= 12 && hours < 15).length}</div>
          <div className="text-sm text-yellow-300">12-15h</div>
        </div>
        <div className="bg-red-500/20 p-4 rounded-xl border border-red-500/30">
          <div className={`text-2xl font-bold ${theme.text}`}>{teachers.filter(([, hours]) => hours >= 15).length}</div>
          <div className="text-sm text-red-300">Over 15h</div>
        </div>
      </div>

      {/* Teacher Cards - Collapsible */}
      {showCards && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {teachers.map(([teacherName, hours]) => {
            const isPriority = priorityTeachers.some(name => teacherName.includes(name));
            const progressPercentage = Math.min((hours / 15) * 100, 100);
            
            return (
              <div
                key={teacherName}
                className={`relative p-5 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                  hours >= 15 ? 'border-red-500/50 bg-red-500/10' : 
                  hours >= 12 ? 'border-yellow-500/50 bg-yellow-500/10' : 
                  'border-green-500/50 bg-green-500/10'
                }`}
              >
                {isPriority && (
                  <div className="absolute -top-2 -right-2">
                    <Award className="h-5 w-5 text-yellow-400" />
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className={`p-2 ${theme.card} rounded-lg mr-3`}>
                      <User className={`h-4 w-4 ${theme.textSecondary}`} />
                    </div>
                    <div>
                      <div className={`font-medium ${theme.text} text-sm`}>{teacherName}</div>
                      {isPriority && (
                        <div className="text-xs text-yellow-400">Priority Teacher</div>
                      )}
                    </div>
                  </div>
                  <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${getStatusColor(hours)}`}>
                    {getStatusIcon(hours)}
                    <span className="ml-1 text-white">{hours}h</span>
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className={`flex justify-between text-xs ${theme.textSecondary} mb-1`}>
                    <span>Progress</span>
                    <span>{progressPercentage.toFixed(0)}%</span>
                  </div>
                  <div className={`w-full ${theme.card} rounded-full h-2`}>
                    <div
                      className={`h-2 rounded-full transition-all duration-500 bg-gradient-to-r ${getStatusColor(hours)}`}
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className={`text-xs font-medium ${
                    hours >= 15 ? 'text-red-300' : 
                    hours >= 12 ? 'text-yellow-300' : 
                    'text-green-300'
                  }`}>
                    {getStatusText(hours)}
                  </div>
                  <div className={`text-xs ${theme.textSecondary}`}>
                    {hours >= 15 ? 'Over limit' : 
                     hours >= 12 ? `${(15 - hours).toFixed(1)}h left` : 
                     `${(15 - hours).toFixed(1)}h available`}
                  </div>
                </div>
                
                {hours > averageHours && (
                  <div className="absolute top-2 left-2">
                    <TrendingUp className="h-3 w-3 text-blue-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeacherHourTracker;