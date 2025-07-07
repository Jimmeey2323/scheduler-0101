// Data persistence utilities
const saveToLocalStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

const loadFromLocalStorage = (key: string) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return null;
  }
};

export const saveCSVData = (data: any[]) => {
  saveToLocalStorage('csvData', data);
};

export const loadCSVData = () => {
  return loadFromLocalStorage('csvData') || [];
};

export const saveScheduledClasses = (classes: any[]) => {
  saveToLocalStorage('scheduledClasses', classes);
};

export const loadScheduledClasses = () => {
  return loadFromLocalStorage('scheduledClasses') || [];
};

export const saveCustomTeachers = (teachers: any[]) => {
  saveToLocalStorage('customTeachers', teachers);
};

export const loadCustomTeachers = () => {
  return loadFromLocalStorage('customTeachers') || [];
};

export const saveTeacherAvailability = (availability: any) => {
  saveToLocalStorage('teacherAvailability', availability);
};

export const loadTeacherAvailability = () => {
  return loadFromLocalStorage('teacherAvailability') || {};
};

// New functions for Scores.csv data
export const saveScoresData = (data: any[]) => {
  saveToLocalStorage('scoresData', data);
};

export const loadScoresData = () => {
  return loadFromLocalStorage('scoresData') || [];
};