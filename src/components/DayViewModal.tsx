import React from 'react';
import { X, Calendar, Clock, Users, TrendingUp, Star, MapPin, Target, Award } from 'lucide-react';
import { ClassData, ScheduledClass } from '../types';
import { getClassAverageForSlot } from '../utils/classUtils';

interface DayViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: string;
  location: string;
  csvData: ClassData[];
  scheduledClasses: ScheduledClass[];
  onSlotClick: (day: string, time: string, location: string) => void;
  isDarkMode: boolean;
}

const DayViewModal: React.FC<DayViewModalProps> = ({
  isOpen,
  onClose,
  day,
  location,
  csvData,
  scheduledClasses,
  onSlotClick,
  isDarkMode
}) => {
  if (!isOpen || !day) return null;

  const timeSlots = [
    '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
  ];

  const dayClasses = scheduledClasses.filter(cls => cls.location === location && cls.day === day);
  const dayHistoricData = csvData.filter(item => 
    item.location === location && 
    item.dayOfWeek === day && 
    !item.cleanedClass.toLowerCase().includes('hosted')
  );

  const getHistoricDataForTime = (time: string) => {
    const timeData = dayHistoricData.filter(item => item.classTime.includes(time.slice(0, 5)));
    if (timeData.length === 0) return null;

    const avgParticipants = timeData.reduce((sum, cls) => sum + cls.participants, 0) / timeData.length;
    const totalRevenue = timeData.reduce((sum, cls) => sum + cls.totalRevenue, 0);
    
    return {
      count: timeData.length,
      avgParticipants: parseFloat(avgParticipants.toFixed(1)),
      totalRevenue: parseFloat(totalRevenue.toFixed(1)),
      bestClass: timeData.sort((a, b) => b.participants - a.participants)[0]
    };
  };

  const getScheduledClassForTime = (time: string) => {
    return dayClasses.find(cls => cls.time === time);
  };

  const modalBg = isDarkMode 
    ? 'bg-gradient-to-br from-gray-900 to-gray-800' 
    : 'bg-gradient-to-br from-white to-gray-50';
  
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';
  const textPrimary = isDarkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = isDarkMode ? 'text-gray-400' : 'text-gray-600';

  // Calculate day statistics
  const totalClasses = dayClasses.length;
  const totalParticipants = dayClasses.reduce((sum, cls) => sum + (cls.participants || 0), 0);
  const avgParticipants = totalClasses > 0 ? parseFloat((totalParticipants / totalClasses).toFixed(1)) : 0;
  const topPerformers = dayClasses.filter(cls => cls.isTopPerformer).length;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`${modalBg} rounded-2xl shadow-2xl max-w-6xl w-full m-4 max-h-[90vh] overflow-y-auto border ${borderColor}`}>
        <div className={`flex items-center justify-between p-6 border-b ${borderColor} bg-gradient-to-r from-blue-600/20 to-purple-600/20`}>
          <div className="flex items-center">
            <Calendar className="h-6 w-6 text-blue-400 mr-3" />
            <div>
              <h2 className={`text-2xl font-bold ${textPrimary}`}>{day} - {location}</h2>
              <p className={textSecondary}>Detailed day view with analytics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`${textSecondary} hover:${textPrimary} transition-colors p-2 hover:bg-gray-700 rounded-lg`}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Day Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-500/20 p-4 rounded-xl border border-blue-500/30">
              <div className={`text-2xl font-bold ${textPrimary}`}>{totalClasses}</div>
              <div className="text-sm text-blue-300">Scheduled Classes</div>
            </div>
            <div className="bg-green-500/20 p-4 rounded-xl border border-green-500/30">
              <div className={`text-2xl font-bold ${textPrimary}`}>{totalParticipants}</div>
              <div className="text-sm text-green-300">Total Participants</div>
            </div>
            <div className="bg-purple-500/20 p-4 rounded-xl border border-purple-500/30">
              <div className={`text-2xl font-bold ${textPrimary}`}>{avgParticipants}</div>
              <div className="text-sm text-purple-300">Avg per Class</div>
            </div>
            <div className="bg-yellow-500/20 p-4 rounded-xl border border-yellow-500/30">
              <div className={`text-2xl font-bold ${textPrimary}`}>{topPerformers}</div>
              <div className="text-sm text-yellow-300">Top Performers</div>
            </div>
          </div>

          {/* Time Slots */}
          <div className="space-y-3">
            <h3 className={`text-lg font-semibold ${textPrimary} mb-4 flex items-center`}>
              <Clock className="h-5 w-5 mr-2 text-blue-400" />
              Time Slots
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              {timeSlots.map(time => {
                const scheduledClass = getScheduledClassForTime(time);
                const historicData = getHistoricDataForTime(time);
                const hour = parseInt(time.split(':')[0]);
                const isRestrictedTime = hour >= 12 && hour < 15.5;

                if (!scheduledClass && !historicData) return null;

                return (
                  <div
                    key={time}
                    onClick={() => onSlotClick(day, time, location)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      scheduledClass
                        ? scheduledClass.isTopPerformer
                          ? 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20'
                          : scheduledClass.isPrivate
                          ? 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20'
                          : 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20'
                        : isDarkMode
                          ? 'bg-gray-800/50 border-gray-600 hover:bg-gray-700/50'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`text-lg font-bold ${textPrimary}`}>{time}</div>
                        
                        {scheduledClass ? (
                          <div className="flex items-center space-x-3">
                            <div>
                              <div className={`font-medium ${textPrimary} flex items-center`}>
                                {scheduledClass.classFormat}
                                {scheduledClass.isTopPerformer && (
                                  <Star className="h-4 w-4 ml-2 text-yellow-400" />
                                )}
                                {scheduledClass.isPrivate && (
                                  <Users className="h-4 w-4 ml-2 text-purple-400" />
                                )}
                              </div>
                              <div className={`text-sm ${textSecondary}`}>
                                {scheduledClass.teacherFirstName} {scheduledClass.teacherLastName}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className={`text-sm ${textSecondary}`}>
                            Available slot
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-6">
                        {scheduledClass && (
                          <div className="text-center">
                            <div className={`text-lg font-bold ${textPrimary}`}>
                              {scheduledClass.participants || 0}
                            </div>
                            <div className={`text-xs ${textSecondary}`}>Expected</div>
                          </div>
                        )}

                        {historicData && (
                          <div className="text-center">
                            <div className={`text-lg font-bold text-blue-400`}>
                              {historicData.avgParticipants}
                            </div>
                            <div className={`text-xs ${textSecondary}`}>Historic Avg</div>
                          </div>
                        )}

                        {historicData && (
                          <div className="text-center">
                            <div className={`text-lg font-bold text-green-400`}>
                              {historicData.count}
                            </div>
                            <div className={`text-xs ${textSecondary}`}>Classes Held</div>
                          </div>
                        )}

                        <div className="text-center">
                          <div className={`text-sm ${textPrimary}`}>
                            {parseFloat((scheduledClass?.duration || '1')) * 60}min
                          </div>
                          <div className={`text-xs ${textSecondary}`}>Duration</div>
                        </div>
                      </div>
                    </div>

                    {historicData?.bestClass && (
                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <div className={`text-xs ${textSecondary}`}>
                          <strong>Best Historic:</strong> {historicData.bestClass.cleanedClass} with {historicData.bestClass.teacherName} 
                          ({historicData.bestClass.participants} participants)
                        </div>
                      </div>
                    )}

                    {isRestrictedTime && !scheduledClass?.isPrivate && (
                      <div className="mt-2 p-2 bg-red-500/20 rounded-lg">
                        <div className="text-red-300 text-xs">
                          Restricted time (12:00 PM - 3:30 PM) - Private classes only
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day Insights */}
          {dayHistoricData.length > 0 && (
            <div className="mt-6 p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/20">
              <h4 className="font-medium text-indigo-300 mb-3 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                {day} Insights
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className={textSecondary}>Most Popular Time:</div>
                  <div className={textPrimary}>
                    {(() => {
                      const times = dayHistoricData.reduce((acc, item) => {
                        const time = item.classTime.slice(0, 5);
                        acc[time] = (acc[time] || 0) + item.participants;
                        return acc;
                      }, {} as any);
                      return Object.entries(times).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'N/A';
                    })()}
                  </div>
                </div>
                <div>
                  <div className={textSecondary}>Best Performing Class:</div>
                  <div className={textPrimary}>
                    {dayHistoricData.sort((a, b) => b.participants - a.participants)[0]?.cleanedClass || 'N/A'}
                  </div>
                </div>
                <div>
                  <div className={textSecondary}>Total Historic Classes:</div>
                  <div className={textPrimary}>{dayHistoricData.length}</div>
                </div>
                <div>
                  <div className={textSecondary}>Historic Avg Participants:</div>
                  <div className={textPrimary}>
                    {(dayHistoricData.reduce((sum, item) => sum + item.participants, 0) / dayHistoricData.length).toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DayViewModal;