import React, { useCallback, useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import Papa from 'papaparse';
import { ClassData } from '../types';

interface CSVUploadProps {
  onDataUpload: (data: ClassData[]) => void;
  theme: any;
}

const CSVUpload: React.FC<CSVUploadProps> = ({ onDataUpload, theme }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const processCSV = useCallback((csvText: string) => {
    try {
      setIsProcessing(true);
      setUploadStatus('idle');
      
      console.log('Starting CSV processing...');
      console.log('First 500 characters:', csvText.substring(0, 500));
      
      // Detect delimiter - check if it's tab-separated or comma-separated
      const firstLine = csvText.split('\n')[0];
      const tabCount = (firstLine.match(/\t/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      const delimiter = tabCount > commaCount ? '\t' : ',';
      
      console.log('Detected delimiter:', delimiter === '\t' ? 'TAB' : 'COMMA');
      console.log('Tab count:', tabCount, 'Comma count:', commaCount);
      
      Papa.parse(csvText, {
        header: true,
        delimiter: delimiter,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          console.log('Papa Parse completed:', results);
          console.log('Headers found:', results.meta.fields);
          
          if (results.errors.length > 0) {
            console.warn('CSV parsing warnings:', results.errors);
          }

          if (!results.data || results.data.length === 0) {
            setUploadStatus('error');
            setErrorMessage('No data found in CSV file');
            setIsProcessing(false);
            return;
          }

          // Check for required columns
          const requiredColumns = [
            'Variant Name', 'Class date', 'Location', 'Total Revenue', 
            'Participants', 'Teacher First Name', 'Teacher Last Name', 
            'Day of the Week', 'Class Time', 'Cleaned Class'
          ];
          
          const headers = results.meta.fields || [];
          const missingColumns = requiredColumns.filter(col => !headers.includes(col));
          
          if (missingColumns.length > 0) {
            setUploadStatus('error');
            setErrorMessage(`Missing required columns: ${missingColumns.join(', ')}`);
            setIsProcessing(false);
            return;
          }

          try {
            const data: ClassData[] = results.data
              .map((row: any, index: number) => {
                try {
                  // Handle the specific data format from your sample
                  const classDate = String(row['Class date'] || '').trim();
                  const location = String(row['Location'] || '').trim();
                  const cleanedClass = String(row['Cleaned Class'] || '').trim();
                  const dayOfWeek = String(row['Day of the Week'] || '').trim();
                  const teacherFirstName = String(row['Teacher First Name'] || '').trim();
                  const teacherLastName = String(row['Teacher Last Name'] || '').trim();
                  
                  // Skip rows with missing essential data
                  if (!cleanedClass || !location || !dayOfWeek || !teacherFirstName || !teacherLastName) {
                    console.log(`Skipping row ${index + 1}: missing essential data`);
                    return null;
                  }
                  
                  // Parse numeric values with better error handling
                  const parseNumber = (value: any, defaultValue: number = 0): number => {
                    if (value === null || value === undefined || value === '') return defaultValue;
                    const parsed = typeof value === 'string' ? parseFloat(value.replace(/[^\d.-]/g, '')) : parseFloat(value);
                    return isNaN(parsed) ? defaultValue : parsed;
                  };
                  
                  const parseInt = (value: any, defaultValue: number = 0): number => {
                    if (value === null || value === undefined || value === '') return defaultValue;
                    const parsed = typeof value === 'string' ? Number.parseInt(value.replace(/[^\d-]/g, '')) : Number.parseInt(value);
                    return isNaN(parsed) ? defaultValue : parsed;
                  };

                  return {
                    variantName: String(row['Variant Name'] || '').trim(),
                    classDate: classDate,
                    location: location,
                    payrate: String(row['Payrate'] || '').trim(),
                    totalRevenue: parseNumber(row['Total Revenue']),
                    basePayout: parseNumber(row['Base Payout']),
                    additionalPayout: parseNumber(row['Additional Payout']),
                    totalPayout: parseNumber(row['Total Payout']),
                    tip: parseNumber(row['Tip']),
                    participants: parseInt(row['Participants']),
                    checkedIn: parseInt(row['Checked in']),
                    comps: parseInt(row['Comps']),
                    checkedInComps: parseInt(row['Checked In Comps']),
                    lateCancellations: parseInt(row['Late cancellations']),
                    nonPaidCustomers: parseInt(row['Non Paid Customers']),
                    timeHours: parseNumber(row['Time (h)']),
                    teacherFirstName: teacherFirstName,
                    teacherLastName: teacherLastName,
                    teacherName: String(row['Teacher Name'] || `${teacherFirstName} ${teacherLastName}`).trim(),
                    dayOfWeek: dayOfWeek,
                    classTime: String(row['Class Time'] || '').trim(),
                    cleanedClass: cleanedClass,
                    unique1: String(row['Unique 1'] || '').trim(),
                    unique2: String(row['Uniqiue 2'] || row['Unique 2'] || '').trim(), // Handle typo in column name
                  };
                } catch (error) {
                  console.error(`Error processing row ${index + 1}:`, error, row);
                  return null;
                }
              })
              .filter((item): item is ClassData => {
                if (item === null) return false;
                
                // Additional validation
                const isValid = item.cleanedClass && 
                       item.location && 
                       item.dayOfWeek &&
                       item.teacherFirstName &&
                       item.teacherLastName &&
                       !isNaN(item.participants);
                
                if (!isValid) {
                  console.log('Filtered out invalid item:', item);
                }
                
                return isValid;
              });

            console.log(`Processed ${data.length} valid records from ${results.data.length} total rows`);
            
            if (data.length === 0) {
              setUploadStatus('error');
              setErrorMessage('No valid data found. Please check the CSV format and required columns.');
              setIsProcessing(false);
              return;
            }

            // Log sample data for debugging
            console.log('Sample processed data:', data.slice(0, 3));
            console.log('Unique locations:', [...new Set(data.map(d => d.location))]);
            console.log('Unique days:', [...new Set(data.map(d => d.dayOfWeek))]);
            console.log('Unique classes:', [...new Set(data.map(d => d.cleanedClass))]);

            onDataUpload(data);
            setUploadStatus('success');
            setErrorMessage('');
            
          } catch (processingError) {
            console.error('Error processing data:', processingError);
            setUploadStatus('error');
            setErrorMessage('Error processing CSV data. Please check the format.');
          }
        },
        error: (error) => {
          console.error('Papa Parse error:', error);
          setUploadStatus('error');
          setErrorMessage(`Error parsing CSV file: ${error.message}`);
        }
      });
    } catch (error) {
      console.error('Error in processCSV:', error);
      setUploadStatus('error');
      setErrorMessage('Error processing CSV file. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [onDataUpload]);

  const handleFileUpload = useCallback((file: File) => {
    console.log('File selected:', file.name, file.size, file.type);
    setUploadStatus('idle');
    setErrorMessage('');
    
    // Accept various file types that might contain CSV data
    const validTypes = [
      'text/csv',
      'text/tab-separated-values',
      'application/vnd.ms-excel',
      'text/plain',
      'application/csv'
    ];
    
    const validExtensions = ['.csv', '.tsv', '.txt'];
    const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    const hasValidType = validTypes.includes(file.type) || file.type === '';
    
    if (!hasValidExtension && !hasValidType) {
      setUploadStatus('error');
      setErrorMessage('Please upload a CSV, TSV, or TXT file containing tab-separated data.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      console.log('File read, length:', csvText.length);
      console.log('File encoding detected, first line:', csvText.split('\n')[0]);
      processCSV(csvText);
    };
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      setUploadStatus('error');
      setErrorMessage('Error reading file. Please try again.');
      setIsProcessing(false);
    };
    reader.readAsText(file, 'UTF-8'); // Explicitly specify UTF-8 encoding
  }, [processCSV]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const dataFile = files.find(file => {
      const validExtensions = ['.csv', '.tsv', '.txt'];
      return validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    });
    
    if (dataFile) {
      handleFileUpload(dataFile);
    } else {
      setUploadStatus('error');
      setErrorMessage('Please upload a CSV, TSV, or TXT file.');
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  return (
    <div className={`min-h-screen ${theme.bg} flex items-center justify-center p-4`}>
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <Sparkles className={`h-16 w-16 ${theme.accent} animate-pulse`} />
            </div>
          </div>
          <h1 className={`text-5xl font-bold mb-4 ${theme.text}`}>
            Smart Class Scheduler
          </h1>
          <p className={`text-xl max-w-2xl mx-auto ${theme.textSecondary}`}>
            AI-powered class scheduling optimizer for fitness studios with advanced analytics and intelligent recommendations
          </p>
        </div>

        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
            isDragging
              ? 'border-blue-400 bg-blue-500/10 scale-105 shadow-2xl'
              : uploadStatus === 'success'
              ? 'border-green-400 bg-green-500/10 shadow-xl'
              : uploadStatus === 'error'
              ? 'border-red-400 bg-red-500/10 shadow-xl'
              : `${theme.border} ${theme.card} ${theme.cardHover} shadow-lg`
          }`}
        >
          <div className="flex flex-col items-center space-y-6">
            <div className={`p-6 rounded-full ${
              uploadStatus === 'success' ? 'bg-green-500/20' : 
              uploadStatus === 'error' ? 'bg-red-500/20' : 
              theme.card
            }`}>
              {isProcessing ? (
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-400 border-t-transparent"></div>
                  <Sparkles className={`absolute inset-0 h-16 w-16 ${theme.accent} animate-pulse`} />
                </div>
              ) : uploadStatus === 'success' ? (
                <CheckCircle className="h-16 w-16 text-green-400" />
              ) : uploadStatus === 'error' ? (
                <AlertCircle className="h-16 w-16 text-red-400" />
              ) : (
                <FileText className={`h-16 w-16 ${theme.accent}`} />
              )}
            </div>
            
            <div>
              <h3 className={`text-3xl font-bold mb-3 ${theme.text}`}>
                {uploadStatus === 'success' ? 'Upload Successful!' :
                 uploadStatus === 'error' ? 'Upload Failed' :
                 isProcessing ? 'Processing Data...' :
                 'Upload Your Class Data'}
              </h3>
              <p className={`text-lg mb-6 ${theme.textSecondary}`}>
                {uploadStatus === 'success' ? 'Your CSV file has been processed successfully. Ready to optimize!' :
                 uploadStatus === 'error' ? errorMessage :
                 isProcessing ? 'Analyzing your data with AI-powered insights...' :
                 'Drag and drop your CSV/TSV file here, or click to browse'}
              </p>
            </div>

            {uploadStatus !== 'success' && !isProcessing && (
              <div>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className={`inline-flex items-center px-8 py-4 ${theme.buttonPrimary} font-semibold rounded-xl focus:outline-none cursor-pointer transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105`}
                >
                  <Upload className="h-6 w-6 mr-3" />
                  Choose File
                </label>
              </div>
            )}

            {uploadStatus === 'error' && (
              <button
                onClick={() => {
                  setUploadStatus('idle');
                  setErrorMessage('');
                }}
                className={`text-sm ${theme.accent} hover:underline`}
              >
                Try Again
              </button>
            )}
          </div>
        </div>

        {/* Features Preview */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`${theme.card} rounded-xl p-6 border ${theme.border} shadow-lg`}>
            <div className={`${theme.accent} mb-3`}>
              <Sparkles className="h-8 w-8" />
            </div>
            <h4 className={`text-lg font-semibold mb-2 ${theme.text}`}>AI Optimization</h4>
            <p className={`text-sm ${theme.textSecondary}`}>Advanced AI algorithms optimize schedules based on historic performance and teacher expertise</p>
          </div>
          <div className={`${theme.card} rounded-xl p-6 border ${theme.border} shadow-lg`}>
            <div className="text-green-400 mb-3">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h4 className={`text-lg font-semibold mb-2 ${theme.text}`}>Smart Analytics</h4>
            <p className={`text-sm ${theme.textSecondary}`}>Real-time insights and recommendations based on attendance patterns and revenue data</p>
          </div>
          <div className={`${theme.card} rounded-xl p-6 border ${theme.border} shadow-lg`}>
            <div className="text-blue-400 mb-3">
              <FileText className="h-8 w-8" />
            </div>
            <h4 className={`text-lg font-semibold mb-2 ${theme.text}`}>Easy Management</h4>
            <p className={`text-sm ${theme.textSecondary}`}>Intuitive interface for scheduling, teacher management, and schedule optimization</p>
          </div>
        </div>

        {/* Sample Data Format */}
        <div className={`mt-8 ${theme.card} rounded-xl p-6 border ${theme.border} shadow-lg`}>
          <h4 className={`text-lg font-semibold mb-4 ${theme.text}`}>Expected File Format:</h4>
          <div className={`text-sm space-y-3 ${theme.textSecondary}`}>
            <div className={`${theme.card} p-4 rounded-lg`}>
              <p><strong className={theme.accent}>Required columns:</strong></p>
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <span>• Variant Name</span>
                <span>• Class date</span>
                <span>• Location</span>
                <span>• Total Revenue</span>
                <span>• Participants</span>
                <span>• Teacher First Name</span>
                <span>• Teacher Last Name</span>
                <span>• Day of the Week</span>
                <span>• Class Time</span>
                <span>• Cleaned Class</span>
              </div>
            </div>
            <p><strong className={theme.accent}>File format:</strong> Tab-separated values (.csv, .tsv, or .txt)</p>
            <p><strong className={theme.accent}>Sample data:</strong></p>
            <div className={`${theme.card} p-3 rounded-lg text-xs font-mono overflow-x-auto`}>
              <div className={`whitespace-nowrap ${theme.textSecondary}`}>
                Studio Barre 57&nbsp;&nbsp;&nbsp;&nbsp;2025-07-03, 11:00&nbsp;&nbsp;&nbsp;&nbsp;Supreme HQ, Bandra&nbsp;&nbsp;&nbsp;&nbsp;...
              </div>
            </div>
            <p><strong className={theme.accent}>Supported locations:</strong> Kwality House, Kemps Corner | Supreme HQ, Bandra | Kenkere House</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CSVUpload;