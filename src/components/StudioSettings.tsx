import React, { useState } from 'react';
import { X, UserPlus, Calendar, Clock, AlertTriangle, Save, Trash2, Users, Settings, MapPin, Star, Shield, Award, Zap } from 'lucide-react';
import { CustomTeacher, TeacherAvailability } from '../types';

interface StudioSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  customTeachers: CustomTeacher[];
  onUpdateTeachers: (teachers: CustomTeacher[]) => void;
  teacherAvailability: TeacherAvailability;
  onUpdateAvailability: (availability: TeacherAvailability) => void;
  theme: any;
  allowRestrictedScheduling: boolean;
  onUpdateRestrictedScheduling: (value: boolean) => void;
}

const StudioSettings: React.FC<StudioSettingsProps> = ({
  isOpen,
  onClose,
  customTeachers,
  onUpdateTeachers,
  teacherAvailability,
  onUpdateAvailability,
  theme,
  allowRestrictedScheduling,
  onUpdateRestrictedScheduling
}) => {
  const [activeTab, setActiveTab] = useState('teachers');
  const [newTeacher, setNewTeacher] = useState({
    firstName: '',
    lastName: '',
    specialties: [] as string[],
    isNew: true,
    priority: 'normal' as 'high' | 'normal' | 'low',
    preferredDays: [] as string[],
    maxHours: 15,
    minHours: 11
  });
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [isOnLeave, setIsOnLeave] = useState(false);

  const classFormats = [
    'Studio Barre 57', 'Studio Barre 57 (Express)', 'Studio Mat 57', 'Studio Mat 57 (Express)',
    'Studio powerCycle', 'Studio powerCycle (Express)', 'Studio Cardio Barre', 'Studio Cardio Barre (Express)',
    'Studio FIT', 'Studio Back Body Blaze', 'Studio Back Body Blaze (Express)', 'Studio Recovery',
    'Studio Foundations', 'Studio HIIT', 'Studio Amped Up!', 'Studio Pre/Post Natal Class',
    'Studio SWEAT in 30', 'Studio Trainer\'s Choice', 'Studio Hosted Class'
  ];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const priorityTeachers = ['Anisha', 'Vivaran', 'Mrigakshi', 'Pranjali', 'Atulan', 'Cauveri', 'Rohan','Reshma','Richard','Karan','Karanvir'];
  const newTrainers = ['Kabir', 'Simonelle', 'Karan']; // Updated to include Karan
  const inactiveTeachers = ['Nishanth', 'Saniya']; // These will be excluded

  const handleAddTeacher = () => {
    if (!newTeacher.firstName || !newTeacher.lastName) {
      alert('Please enter both first and last name');
      return;
    }

    // Check if teacher is in inactive list
    const teacherName = `${newTeacher.firstName} ${newTeacher.lastName}`;
    if (inactiveTeachers.some(inactive => teacherName.toLowerCase().includes(inactive.toLowerCase()))) {
      alert(`${teacherName} is marked as inactive and cannot be added to the schedule.`);
      return;
    }

    // Check if it's a new trainer with restrictions
    const isNewTrainer = newTrainers.includes(newTeacher.firstName);
    const allowedFormats = isNewTrainer 
      ? ['Studio Barre 57', 'Studio Barre 57 (Express)', 'Studio powerCycle', 'Studio powerCycle (Express)', 'Studio Cardio Barre']
      : classFormats;

    const teacher: CustomTeacher = {
      ...newTeacher,
      specialties: newTeacher.specialties.length > 0 ? newTeacher.specialties : allowedFormats.slice(0, 3),
      maxHours: isNewTrainer ? 10 : newTeacher.maxHours
    };

    onUpdateTeachers([...customTeachers, teacher]);
    setNewTeacher({ 
      firstName: '', 
      lastName: '', 
      specialties: [], 
      isNew: true, 
      priority: 'normal',
      preferredDays: [],
      maxHours: 15,
      minHours: 11
    });
  };

  const handleRemoveTeacher = (index: number) => {
    const updatedTeachers = customTeachers.filter((_, i) => i !== index);
    onUpdateTeachers(updatedTeachers);
  };

  const handleUpdateAvailability = () => {
    if (!selectedTeacher) {
      alert('Please select a teacher');
      return;
    }

    const updatedAvailability = {
      ...teacherAvailability,
      [selectedTeacher]: {
        unavailableDates,
        isOnLeave,
        leaveStartDate: isOnLeave ? leaveStartDate : undefined,
        leaveEndDate: isOnLeave ? leaveEndDate : undefined
      }
    };

    onUpdateAvailability(updatedAvailability);
    alert('Teacher availability updated successfully!');
  };

  const addUnavailableDate = (date: string) => {
    if (date && !unavailableDates.includes(date)) {
      setUnavailableDates([...unavailableDates, date]);
    }
  };

  const removeUnavailableDate = (date: string) => {
    setUnavailableDates(unavailableDates.filter(d => d !== date));
  };

  const toggleSpecialty = (specialty: string) => {
    const isNewTrainer = newTrainers.includes(newTeacher.firstName);
    const allowedFormats = isNewTrainer 
      ? ['Studio Barre 57', 'Studio Barre 57 (Express)', 'Studio powerCycle', 'Studio powerCycle (Express)', 'Studio Cardio Barre']
      : classFormats;

    if (!allowedFormats.includes(specialty) && isNewTrainer) {
      alert(`${newTeacher.firstName} can only teach: ${allowedFormats.join(', ')}`);
      return;
    }

    if (newTeacher.specialties.includes(specialty)) {
      setNewTeacher(prev => ({ 
        ...prev, 
        specialties: prev.specialties.filter(s => s !== specialty) 
      }));
    } else {
      setNewTeacher(prev => ({ 
        ...prev, 
        specialties: [...prev.specialties, specialty] 
      }));
    }
  };

  const togglePreferredDay = (day: string) => {
    if (newTeacher.preferredDays.includes(day)) {
      setNewTeacher(prev => ({ 
        ...prev, 
        preferredDays: prev.preferredDays.filter(d => d !== day) 
      }));
    } else {
      setNewTeacher(prev => ({ 
        ...prev, 
        preferredDays: [...prev.preferredDays, day] 
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`${theme.card} rounded-2xl shadow-2xl max-w-6xl w-full m-4 max-h-[90vh] overflow-y-auto border ${theme.border}`}>
        <div className={`flex items-center justify-between p-6 border-b ${theme.border} bg-gradient-to-r from-indigo-600/20 to-purple-600/20`}>
          <div className="flex items-center">
            <div className="p-2 bg-indigo-500/20 rounded-lg mr-3">
              <Settings className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h2 className={`text-xl font-bold ${theme.text}`}>Studio Settings</h2>
              <p className={`text-sm ${theme.textSecondary}`}>Manage teachers, availability, and studio preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`${theme.textSecondary} hover:${theme.text} transition-colors p-2 hover:bg-gray-700 rounded-lg`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${theme.border}`}>
          <button
            onClick={() => setActiveTab('teachers')}
            className={`flex-1 py-4 px-6 font-medium transition-colors ${
              activeTab === 'teachers'
                ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/10'
                : `${theme.textSecondary} hover:${theme.text}`
            }`}
          >
            <Users className="h-5 w-5 inline mr-2" />
            Teachers
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`flex-1 py-4 px-6 font-medium transition-colors ${
              activeTab === 'availability'
                ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/10'
                : `${theme.textSecondary} hover:${theme.text}`
            }`}
          >
            <Calendar className="h-5 w-5 inline mr-2" />
            Availability
          </button>
          <button
            onClick={() => setActiveTab('studio')}
            className={`flex-1 py-4 px-6 font-medium transition-colors ${
              activeTab === 'studio'
                ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/10'
                : `${theme.textSecondary} hover:${theme.text}`
            }`}
          >
            <MapPin className="h-5 w-5 inline mr-2" />
            Studio Rules
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'teachers' && (
            <div className="space-y-6">
              {/* Add New Teacher */}
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-6 rounded-xl border border-green-500/20">
                <h3 className="font-semibold text-green-300 mb-4 flex items-center">
                  <UserPlus className="h-5 w-5 mr-2" />
                  Add New Teacher
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
                      First Name
                    </label>
                    <input
                      type="text"
                      value={newTeacher.firstName}
                      onChange={(e) => setNewTeacher(prev => ({ ...prev, firstName: e.target.value }))}
                      className={`w-full px-3 py-2 ${theme.card} border ${theme.border} ${theme.text} rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500`}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={newTeacher.lastName}
                      onChange={(e) => setNewTeacher(prev => ({ ...prev, lastName: e.target.value }))}
                      className={`w-full px-3 py-2 ${theme.card} border ${theme.border} ${theme.text} rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500`}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
                      Priority Level
                    </label>
                    <select
                      value={newTeacher.priority}
                      onChange={(e) => setNewTeacher(prev => ({ ...prev, priority: e.target.value as any }))}
                      className={`w-full px-3 py-2 ${theme.card} border ${theme.border} ${theme.text} rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500`}
                    >
                      <option value="high">High Priority</option>
                      <option value="normal">Normal Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
                      Max Hours/Week
                    </label>
                    <input
                      type="number"
                      value={newTeacher.maxHours}
                      onChange={(e) => setNewTeacher(prev => ({ ...prev, maxHours: parseInt(e.target.value) || 15 }))}
                      className={`w-full px-3 py-2 ${theme.card} border ${theme.border} ${theme.text} rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500`}
                      min="1"
                      max="15"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
                      Min Hours/Week
                    </label>
                    <input
                      type="number"
                      value={newTeacher.minHours}
                      onChange={(e) => setNewTeacher(prev => ({ ...prev, minHours: parseInt(e.target.value) || 11 }))}
                      className={`w-full px-3 py-2 ${theme.card} border ${theme.border} ${theme.text} rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500`}
                      min="1"
                      max="15"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
                    Preferred Days
                  </label>
                  <div className="grid grid-cols-7 gap-2">
                    {days.map(day => (
                      <button
                        key={day}
                        onClick={() => togglePreferredDay(day)}
                        className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                          newTeacher.preferredDays.includes(day)
                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                            : `${theme.card} ${theme.textSecondary} border ${theme.border} hover:bg-gray-700`
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
                    Specialties {newTrainers.includes(newTeacher.firstName) && (
                      <span className="text-orange-400 text-xs">(Limited to specific formats)</span>
                    )}
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {classFormats.map(format => {
                      const isNewTrainer = newTrainers.includes(newTeacher.firstName);
                      const allowedFormats = ['Studio Barre 57', 'Studio Barre 57 (Express)', 'Studio powerCycle', 'Studio powerCycle (Express)', 'Studio Cardio Barre'];
                      const isAllowed = !isNewTrainer || allowedFormats.includes(format);
                      
                      return (
                        <button
                          key={format}
                          onClick={() => toggleSpecialty(format)}
                          disabled={!isAllowed}
                          className={`p-2 rounded-lg text-xs font-medium transition-colors text-left ${
                            newTeacher.specialties.includes(format)
                              ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                              : isAllowed
                                ? `${theme.card} ${theme.textSecondary} border ${theme.border} hover:bg-gray-700`
                                : 'bg-gray-600/20 text-gray-500 border border-gray-600/30 cursor-not-allowed'
                          }`}
                        >
                          {format}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={handleAddTeacher}
                  className="mt-4 flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Teacher
                </button>
              </div>

              {/* Current Teachers */}
              <div>
                <h3 className={`font-semibold ${theme.text} mb-4 flex items-center`}>
                  <Users className="h-5 w-5 mr-2 text-blue-400" />
                  Current Teachers
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customTeachers.map((teacher, index) => {
                    const isPriority = priorityTeachers.some(name => teacher.firstName.includes(name));
                    const isNew = newTrainers.includes(teacher.firstName);
                    
                    return (
                      <div key={index} className={`${theme.card} p-4 rounded-xl border ${theme.border}`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mr-3 ${
                              isPriority ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                              isNew ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                              'bg-gradient-to-r from-purple-500 to-pink-500'
                            }`}>
                              {teacher.firstName[0]}{teacher.lastName[0]}
                            </div>
                            <div>
                              <div className={`font-medium ${theme.text} flex items-center`}>
                                {teacher.firstName} {teacher.lastName}
                                {isPriority && <Star className="h-4 w-4 text-yellow-400 ml-2" />}
                                {isNew && <Zap className="h-4 w-4 text-green-400 ml-2" />}
                              </div>
                              <div className="flex items-center space-x-2 text-xs">
                                <span className={`px-2 py-1 rounded-full ${
                                  teacher.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                                  teacher.priority === 'normal' ? 'bg-blue-500/20 text-blue-300' :
                                  'bg-gray-500/20 text-gray-300'
                                }`}>
                                  {teacher.priority} priority
                                </span>
                                <span className={`${theme.textSecondary}`}>
                                  {teacher.minHours}-{teacher.maxHours}h/week
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveTeacher(index)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        
                        <div className={`text-sm ${theme.textSecondary} mb-2`}>
                          <strong>Specialties:</strong> {teacher.specialties.slice(0, 3).join(', ')}
                          {teacher.specialties.length > 3 && ` +${teacher.specialties.length - 3} more`}
                        </div>
                        
                        {teacher.preferredDays && teacher.preferredDays.length > 0 && (
                          <div className={`text-sm ${theme.textSecondary}`}>
                            <strong>Preferred Days:</strong> {teacher.preferredDays.join(', ')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'availability' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-6 rounded-xl border border-yellow-500/20">
                <h3 className="font-semibold text-yellow-300 mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Teacher Availability Management
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
                      Select Teacher
                    </label>
                    <select
                      value={selectedTeacher}
                      onChange={(e) => setSelectedTeacher(e.target.value)}
                      className={`w-full px-3 py-2 ${theme.card} border ${theme.border} ${theme.text} rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500`}
                    >
                      <option value="">Choose a teacher</option>
                      {customTeachers.map((teacher, index) => (
                        <option key={index} value={`${teacher.firstName} ${teacher.lastName}`}>
                          {teacher.firstName} {teacher.lastName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={`flex items-center text-sm ${theme.textSecondary} mb-4`}>
                      <input
                        type="checkbox"
                        checked={isOnLeave}
                        onChange={(e) => setIsOnLeave(e.target.checked)}
                        className="mr-2 rounded"
                      />
                      Teacher is on leave
                    </label>
                  </div>
                </div>

                {isOnLeave && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
                        Leave Start Date
                      </label>
                      <input
                        type="date"
                        value={leaveStartDate}
                        onChange={(e) => setLeaveStartDate(e.target.value)}
                        className={`w-full px-3 py-2 ${theme.card} border ${theme.border} ${theme.text} rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
                        Leave End Date
                      </label>
                      <input
                        type="date"
                        value={leaveEndDate}
                        onChange={(e) => setLeaveEndDate(e.target.value)}
                        className={`w-full px-3 py-2 ${theme.card} border ${theme.border} ${theme.text} rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500`}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
                    Add Unavailable Date
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="date"
                      onChange={(e) => addUnavailableDate(e.target.value)}
                      className={`flex-1 px-3 py-2 ${theme.card} border ${theme.border} ${theme.text} rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500`}
                    />
                  </div>
                </div>

                {unavailableDates.length > 0 && (
                  <div className="mt-4">
                    <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
                      Unavailable Dates
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {unavailableDates.map(date => (
                        <span
                          key={date}
                          className="inline-flex items-center px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm"
                        >
                          {date}
                          <button
                            onClick={() => removeUnavailableDate(date)}
                            className="ml-2 text-red-400 hover:text-red-300"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleUpdateAvailability}
                  className="mt-4 flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Update Availability
                </button>
              </div>
            </div>
          )}

          {activeTab === 'studio' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-6 rounded-xl border border-purple-500/20">
                <h3 className="font-semibold text-purple-300 mb-4 flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Studio Rules & Constraints
                </h3>
                
                <div className="space-y-6">
                  {/* Restricted Scheduling Toggle */}
                  <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-blue-300">Restricted Time Scheduling</h4>
                        <p className="text-sm text-blue-200">Allow scheduling private classes during restricted hours (12 PM - 5 PM)</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allowRestrictedScheduling}
                          onChange={(e) => onUpdateRestrictedScheduling(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    <div className="text-xs text-blue-200">
                      {allowRestrictedScheduling 
                        ? "✅ Private classes can be scheduled during restricted hours" 
                        : "❌ No classes allowed during restricted hours (12 PM - 5 PM)"}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium text-purple-300">Teacher Constraints</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg">
                          <span className={`text-sm ${theme.text}`}>Minimum hours per teacher</span>
                          <span className="text-purple-300 font-medium">11 hours</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg">
                          <span className={`text-sm ${theme.text}`}>Maximum hours per teacher</span>
                          <span className="text-purple-300 font-medium">15 hours</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg">
                          <span className={`text-sm ${theme.text}`}>Mandatory days off per week</span>
                          <span className="text-purple-300 font-medium">2 days</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg">
                          <span className={`text-sm ${theme.text}`}>Maximum hours per day</span>
                          <span className="text-purple-300 font-medium">4 hours</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium text-purple-300">Scheduling Rules</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg">
                          <span className={`text-sm ${theme.text}`}>Weekday morning hours</span>
                          <span className="text-purple-300 font-medium">7:30 AM - 12:00 PM</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg">
                          <span className={`text-sm ${theme.text}`}>Weekday evening hours</span>
                          <span className="text-purple-300 font-medium">5:30 PM - 8:00 PM</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg">
                          <span className={`text-sm ${theme.text}`}>Minimum class performance</span>
                          <span className="text-purple-300 font-medium">&gt;5 avg participants</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg">
                          <span className={`text-sm ${theme.text}`}>Different formats per slot</span>
                          <span className="text-purple-300 font-medium">Required</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                    <h4 className="font-medium text-red-300 mb-3">Inactive Teachers (Excluded from Scheduling)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {inactiveTeachers.map(teacher => (
                        <div key={teacher} className="flex items-center p-3 bg-red-500/20 rounded-lg">
                          <X className="h-4 w-4 text-red-400 mr-2" />
                          <span className="text-red-300">{teacher} (Inactive)</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-red-200">
                      These teachers will not be assigned to any classes and are excluded from all scheduling operations.
                    </div>
                  </div>

                  <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                    <h4 className="font-medium text-green-300 mb-3">New Teachers (Limited Formats)</h4>
                    <div className="space-y-3">
                      {newTrainers.map(trainer => (
                        <div key={trainer} className="p-3 bg-green-500/20 rounded-lg">
                          <div className="flex items-center mb-2">
                            <Zap className="h-4 w-4 text-green-400 mr-2" />
                            <span className="text-green-300 font-medium">{trainer}</span>
                          </div>
                          <div className="text-sm text-green-200">
                            Limited to: Barre 57, Barre 57 Express, PowerCycle, PowerCycle Express, Cardio Barre
                          </div>
                          <div className="text-sm text-green-200">
                            Maximum: 10 hours per week
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20">
                    <h4 className="font-medium text-yellow-300 mb-2">Priority Teachers</h4>
                    <p className="text-sm text-yellow-200 mb-3">
                      These teachers will be prioritized for maximum hours and premium time slots:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {priorityTeachers.map(teacher => (
                        <span
                          key={teacher}
                          className="inline-flex items-center px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm"
                        >
                          <Star className="h-3 w-3 mr-1" />
                          {teacher}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={`flex justify-end space-x-3 p-6 border-t ${theme.border}`}>
          <button
            onClick={onClose}
            className={`px-6 py-3 ${theme.textSecondary} hover:${theme.text} transition-colors`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudioSettings;