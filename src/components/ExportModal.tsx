import React, { useState } from 'react';
import { X, Download, FileText, Calendar, Printer, Mail, Share2, CheckCircle, Clock, Users, MapPin } from 'lucide-react';
import { ScheduledClass } from '../types';
import { exportToPDF, exportToCSV, exportToCalendar, printSchedule } from '../utils/exportUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduledClasses: ScheduledClass[];
  location?: string;
}

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  scheduledClasses,
  location
}) => {
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [selectedLocation, setSelectedLocation] = useState(location || 'all');
  const [dateRange, setDateRange] = useState('week');
  const [includeTeacherInfo, setIncludeTeacherInfo] = useState(true);
  const [includeStats, setIncludeStats] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const locations = ['Kwality House, Kemps Corner', 'Supreme HQ, Bandra', 'Kenkere House'];
  
  const exportFormats = [
    {
      id: 'pdf',
      name: 'PDF Document',
      description: 'Professional schedule report with charts and analytics',
      icon: FileText,
      color: 'from-red-500 to-red-600'
    },
    {
      id: 'csv',
      name: 'CSV Spreadsheet',
      description: 'Data export for Excel, Google Sheets, or other tools',
      icon: Download,
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'calendar',
      name: 'Calendar File',
      description: 'Import into Google Calendar, Outlook, or Apple Calendar',
      icon: Calendar,
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'print',
      name: 'Print View',
      description: 'Optimized layout for printing or sharing',
      icon: Printer,
      color: 'from-purple-500 to-purple-600'
    }
  ];

  const filteredClasses = selectedLocation === 'all' 
    ? scheduledClasses 
    : scheduledClasses.filter(cls => cls.location === selectedLocation);

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const exportOptions = {
        includeTeacherInfo,
        includeStats,
        dateRange,
        location: selectedLocation
      };

      switch (selectedFormat) {
        case 'pdf':
          await exportToPDF(filteredClasses, exportOptions);
          break;
        case 'csv':
          await exportToCSV(filteredClasses, exportOptions);
          break;
        case 'calendar':
          await exportToCalendar(filteredClasses, exportOptions);
          break;
        case 'print':
          await printSchedule(filteredClasses, exportOptions);
          break;
      }

      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const getScheduleStats = () => {
    const totalClasses = filteredClasses.length;
    const uniqueTeachers = new Set(filteredClasses.map(cls => `${cls.teacherFirstName} ${cls.teacherLastName}`)).size;
    const totalHours = filteredClasses.reduce((sum, cls) => sum + parseFloat(cls.duration), 0);
    const avgParticipants = filteredClasses.reduce((sum, cls) => sum + (cls.participants || 0), 0) / totalClasses || 0;

    return { totalClasses, uniqueTeachers, totalHours, avgParticipants };
  };

  const stats = getScheduleStats();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
          <div className="flex items-center">
            <div className="p-2 bg-blue-500/20 rounded-lg mr-3">
              <Download className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Export Schedule</h2>
              <p className="text-sm text-gray-400">Download your schedule in multiple formats</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Schedule Overview */}
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 rounded-xl border border-blue-500/20">
            <h3 className="font-semibold text-blue-300 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Schedule Overview
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats.totalClasses}</div>
                <div className="text-sm text-gray-400">Total Classes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats.uniqueTeachers}</div>
                <div className="text-sm text-gray-400">Teachers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{stats.totalHours.toFixed(1)}</div>
                <div className="text-sm text-gray-400">Total Hours</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{Math.round(stats.avgParticipants)}</div>
                <div className="text-sm text-gray-400">Avg Participants</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Export Format Selection */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  Export Format
                </label>
                <div className="space-y-3">
                  {exportFormats.map(format => (
                    <div
                      key={format.id}
                      onClick={() => setSelectedFormat(format.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        selectedFormat === format.id
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg bg-gradient-to-r ${format.color} mr-3`}>
                          <format.icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-white">{format.name}</div>
                          <div className="text-sm text-gray-400">{format.description}</div>
                        </div>
                        {selectedFormat === format.id && (
                          <CheckCircle className="h-5 w-5 text-blue-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Location
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Locations</option>
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Date Range
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="week">Current Week</option>
                  <option value="month">Current Month</option>
                  <option value="quarter">Current Quarter</option>
                </select>
              </div>
            </div>

            {/* Export Options */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  Export Options
                </label>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-600">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-blue-400 mr-3" />
                      <div>
                        <div className="font-medium text-white">Include Teacher Information</div>
                        <div className="text-sm text-gray-400">Teacher names, hours, and assignments</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeTeacherInfo}
                        onChange={(e) => setIncludeTeacherInfo(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-600">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-green-400 mr-3" />
                      <div>
                        <div className="font-medium text-white">Include Statistics</div>
                        <div className="text-sm text-gray-400">Attendance, revenue, and performance data</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeStats}
                        onChange={(e) => setIncludeStats(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-600">
                <h4 className="font-medium text-white mb-3 flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-purple-400" />
                  Export Preview
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-300">
                    <span>Classes to export:</span>
                    <span className="font-medium text-white">{filteredClasses.length}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Location(s):</span>
                    <span className="font-medium text-white">
                      {selectedLocation === 'all' ? 'All' : selectedLocation.split(',')[0]}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Format:</span>
                    <span className="font-medium text-white">
                      {exportFormats.find(f => f.id === selectedFormat)?.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-4 rounded-xl border border-purple-500/20">
                <h4 className="font-medium text-purple-300 mb-3 flex items-center">
                  <Share2 className="h-4 w-4 mr-2" />
                  Quick Actions
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSelectedFormat('pdf')}
                    className="p-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                  >
                    📄 PDF Report
                  </button>
                  <button
                    onClick={() => setSelectedFormat('calendar')}
                    className="p-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                  >
                    📅 Calendar
                  </button>
                  <button
                    onClick={() => setSelectedFormat('csv')}
                    className="p-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
                  >
                    📊 Spreadsheet
                  </button>
                  <button
                    onClick={() => setSelectedFormat('print')}
                    className="p-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
                  >
                    🖨️ Print
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-700">
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || filteredClasses.length === 0}
              className="flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Exporting...
                </>
              ) : exportSuccess ? (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Export Complete!
                </>
              ) : (
                <>
                  <Download className="h-5 w-5 mr-2" />
                  Export Schedule
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;