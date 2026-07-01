'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import FileUploader from '../components/FileUploader';
import { parseText, parseFile, runAnalysis } from '../lib/api';

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'paste' | 'upload'>('paste');
  const [batchLabel, setBatchLabel] = useState('');
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // File states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState('');

  const executeAnalysis = async (rawText: string, sourceType: string) => {
    setLoading(true);
    setStatusMessage('Running Gemini analysis & database insertion...');
    try {
      const label = batchLabel.trim() || `Feedback Batch (${new Date().toLocaleDateString()})`;
      const result = await runAnalysis(rawText, label, sourceType);
      
      setStatusMessage('Success! Navigating to dashboard...');
      router.push(`/dashboard?id=${result.batch_id}`);
    } catch (err: any) {
      setError(err.message || 'An error occurred during AI analysis execution.');
      setLoading(false);
    }
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');

    if (!textInput.trim()) {
      setError('Please paste or write some customer feedback.');
      return;
    }

    const words = textInput.trim().split(/\s+/);
    if (words.length > 5000) {
      setError(`Your input is ${words.length} words, which exceeds the 5000-word limit.`);
      return;
    }

    setLoading(true);
    setStatusMessage('Parsing paste input...');
    try {
      const parsed = await parseText(textInput);
      await executeAnalysis(parsed.text, 'text');
    } catch (err: any) {
      setError(err.message || 'An error occurred while parsing text input.');
      setLoading(false);
    }
  };

  const handleFileUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');

    if (!selectedFile) {
      setError('Please upload a feedback document.');
      return;
    }

    setLoading(true);
    setStatusMessage('Uploading and parsing document...');
    try {
      const parsed = await parseFile(selectedFile, selectedColumn || undefined);
      await executeAnalysis(parsed.text, parsed.source_type);
    } catch (err: any) {
      setError(err.message || 'An error occurred while uploading/parsing the file.');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center py-16 px-4">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/10 text-indigo-400 px-3 h-8 rounded-full border border-indigo-500/20 text-xs font-semibold uppercase tracking-wider mb-3">
            <span>✨ AI Feedback Clustering</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
            Apex Lens
          </h1>
          <p className="mt-3 text-lg text-zinc-400">
            Paste customer reviews or upload documents. Gemini AI will analyze sentiments, auto-cluster recurring themes, and extract complaints & feature requests.
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
          {/* Label Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              Batch Label / Campaign Name
            </label>
            <input
              type="text"
              value={batchLabel}
              onChange={(e) => setBatchLabel(e.target.value)}
              placeholder="e.g. App Store Reviews June 2026"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
          </div>

          {/* Tabs */}
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => {
                setActiveTab('paste');
                setError('');
              }}
              className={`pb-4 px-4 font-medium text-sm transition relative ${
                activeTab === 'paste' ? 'text-indigo-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              type="button"
            >
              Paste Feedback
              {activeTab === 'paste' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('upload');
                setError('');
              }}
              className={`pb-4 px-4 font-medium text-sm transition relative ${
                activeTab === 'upload' ? 'text-indigo-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              type="button"
            >
              Upload Document
              {activeTab === 'upload' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
              )}
            </button>
          </div>

          {/* Paste Form */}
          {activeTab === 'paste' && (
            <form onSubmit={handlePasteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Feedback Content
                </label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Paste support tickets, survey responses, or reviews here (Max 5000 words)..."
                  rows={8}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Word count: {textInput.trim() ? textInput.trim().split(/\s+/).length : 0} / 5000</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3.5 rounded-xl transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{statusMessage || 'Analyzing...'}</span>
                  </>
                ) : (
                  <span>Run Complete Analysis</span>
                )}
              </button>
            </form>
          )}

          {/* Upload Form */}
          {activeTab === 'upload' && (
            <form onSubmit={handleFileUploadSubmit} className="space-y-4">
              <FileUploader
                onParsed={() => {}}
                onError={setError}
                onFileSelect={setSelectedFile}
                selectedFile={selectedFile}
                csvColumns={csvColumns}
                setCsvColumns={setCsvColumns}
                selectedColumn={selectedColumn}
                setSelectedColumn={setSelectedColumn}
              />

              <button
                type="submit"
                disabled={loading || !selectedFile}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3.5 rounded-xl transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{statusMessage || 'Analyzing...'}</span>
                  </>
                ) : (
                  <span>Upload & Run Complete Analysis</span>
                )}
              </button>
            </form>
          )}

          {/* Errors */}
          {error && (
            <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-xl text-sm text-red-400 flex items-start space-x-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
