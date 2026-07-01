'use client';

import React, { useState, useRef } from 'react';
import { getCsvColumns } from '../lib/api';

interface FileUploaderProps {
  onParsed: (text: string, sourceType: string, wordCount: number) => void;
  onError: (error: string) => void;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  csvColumns: string[];
  setCsvColumns: (cols: string[]) => void;
  selectedColumn: string;
  setSelectedColumn: (col: string) => void;
}

export default function FileUploader({
  onParsed,
  onError,
  onFileSelect,
  selectedFile,
  csvColumns,
  setCsvColumns,
  selectedColumn,
  setSelectedColumn,
}: FileUploaderProps) {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onFileSelect(file);
    setCsvColumns([]);
    setSelectedColumn('');
    onError('');

    if (!file) return;

    if (file.name.toLowerCase().endsWith('.csv')) {
      setLoading(true);
      try {
        const metadata = await getCsvColumns(file);
        setCsvColumns(metadata.columns);
        if (metadata.columns.length > 0) {
          setSelectedColumn(metadata.columns[0]);
        }
      } catch (err: any) {
        onError(err.message || 'Error processing CSV file columns.');
        onFileSelect(null);
      } finally {
        setLoading(false);
      }
    }
  };

  const clearFile = () => {
    onFileSelect(null);
    setCsvColumns([]);
    setSelectedColumn('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="border border-dashed border-zinc-700 rounded-xl p-6 bg-zinc-900/50 hover:bg-zinc-900/80 transition flex flex-col items-center justify-center text-center">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        id="feedback-file-input"
        accept=".csv,.pdf,.docx,.doc"
      />
      
      {!selectedFile ? (
        <label
          htmlFor="feedback-file-input"
          className="cursor-pointer flex flex-col items-center group w-full"
        >
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-110 transition duration-300">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <span className="text-zinc-200 font-medium mb-1">Click to upload feedback file</span>
          <span className="text-zinc-500 text-sm">Supports CSV, PDF, DOCX (Max 5000 words)</span>
        </label>
      ) : (
        <div className="w-full text-left">
          <div className="flex items-center justify-between bg-zinc-800/80 p-3 rounded-lg border border-zinc-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-200 truncate">{selectedFile.name}</p>
                <p className="text-xs text-zinc-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="text-zinc-400 hover:text-zinc-100 transition p-1 ml-2"
              type="button"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {loading && (
            <div className="mt-4 text-center text-sm text-zinc-400 flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-400"></div>
              <span>Reading columns...</span>
            </div>
          )}

          {csvColumns.length > 0 && (
            <div className="mt-4 p-4 bg-zinc-800/40 rounded-lg border border-zinc-700/60">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Select feedback column
              </label>
              <select
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {csvColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
