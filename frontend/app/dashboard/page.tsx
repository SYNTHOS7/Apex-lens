'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getBatchDetails, getExportPdfUrl, BatchData } from '../../lib/api';
import SentimentChart from '../../components/SentimentChart';
import ThemeCard from '../../components/ThemeCard';

function DashboardContent() {
  const searchParams = useSearchParams();
  const batchId = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [batch, setBatch] = useState<BatchData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!batchId) {
      setError('No batch ID provided in URL.');
      setLoading(false);
      return;
    }

    setLoading(true);
    getBatchDetails(batchId)
      .then((data) => {
        setBatch(data);
        setError('');
      })
      .catch((err) => {
        setError(err.message || 'Failed to load batch analysis.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [batchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="text-zinc-400 text-sm">Loading feedback analysis details...</p>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-6 rounded-2xl text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 mx-auto">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-zinc-200">Error Loading Dashboard</h3>
          <p className="text-sm text-zinc-400">{error || 'Unable to retrieve analysis details.'}</p>
          <a
            href="/"
            className="inline-block bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold py-2 px-6 rounded-xl transition text-sm"
          >
            Go Back
          </a>
        </div>
      </div>
    );
  }

  // Safely extract analysis payloads (supports both one-to-many list format and one-to-one object format from Supabase)
  const analysisResults = batch.analysis_results;
  const analysis = analysisResults 
    ? (Array.isArray(analysisResults) ? (analysisResults.length > 0 ? analysisResults[0] : null) : analysisResults)
    : null;
  const sentiment = analysis?.sentiment_json || { positive: 0, neutral: 0, negative: 0 };
  const themes = batch.themes || [];
  
  // Extract complaints and requests from themes_json column dictionary
  const themesJsonPayload = analysis?.themes_json || {};
  const topComplaints = (themesJsonPayload as any).top_complaints || [];
  const featureRequests = (themesJsonPayload as any).feature_requests || [];

  const copySummary = () => {
    if (!analysis) return;
    navigator.clipboard.writeText(analysis.summary_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 md:px-8 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100">{batch.label}</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Batch ID: <span className="font-mono text-zinc-400">{batch.id}</span> • Source: <span className="capitalize text-zinc-400">{batch.source_type}</span> • Created: <span className="text-zinc-400">{new Date(batch.created_at).toLocaleString()}</span>
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <a
            href={getExportPdfUrl(batch.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-5 rounded-xl transition duration-150 text-sm shadow-lg shadow-indigo-600/10"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export PDF Report</span>
          </a>
        </div>
      </div>

      {/* Grid: Sentiment + Executive Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sentiment Box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
          <h3 className="text-lg font-bold text-zinc-200 mb-4">Overall Sentiment</h3>
          <SentimentChart
            positive={sentiment.positive}
            neutral={sentiment.neutral}
            negative={sentiment.negative}
          />
          <div className="flex items-center justify-around mt-4 pt-4 border-t border-zinc-800 text-sm">
            <span className="text-emerald-400 font-semibold">{sentiment.positive}% Positive</span>
            <span className="text-zinc-400 font-semibold">{sentiment.neutral}% Neutral</span>
            <span className="text-red-400 font-semibold">{sentiment.negative}% Negative</span>
          </div>
        </div>

        {/* Executive Summary Box */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-zinc-200">AI Executive Summary</h3>
              <button
                onClick={copySummary}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-1 px-2.5 rounded-lg border border-zinc-700/60 transition flex items-center space-x-1"
                type="button"
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-5 4h5m-5 4h5m-2 5h2" />
                    </svg>
                    <span>Copy Summary</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-zinc-300 leading-relaxed text-base italic">
              &ldquo;{analysis?.summary_text || 'No summary generated.'}&rdquo;
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
            <span>Powered by Google Gemini 1.5 Flash</span>
            <span>Character Count: {analysis?.summary_text.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Grid: Auto-Clustered Themes */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-zinc-200">Auto-Clustered Themes</h3>
        {themes.length === 0 ? (
          <div className="p-8 border border-zinc-800 rounded-xl bg-zinc-900/20 text-center text-zinc-500 text-sm">
            No dynamic themes could be clustered. Try submitting a larger feedback batch.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {themes.map((theme, index) => (
              <ThemeCard
                key={index}
                label={theme.label}
                count={theme.count}
                sentiment={theme.sentiment}
              />
            ))}
          </div>
        )}
      </div>

      {/* Grid: Complaints & Feature Requests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Complaints */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-red-400 flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Top Recurring Complaints</span>
          </h3>
          {topComplaints.length === 0 ? (
            <p className="text-sm text-zinc-500 italic">No major complaints extracted.</p>
          ) : (
            <ul className="space-y-3">
              {topComplaints.map((complaint: string, idx: number) => (
                <li key={idx} className="flex items-start space-x-3 text-sm text-zinc-300">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center font-bold text-xs">
                    {idx + 1}
                  </span>
                  <span className="pt-0.5 leading-relaxed">{complaint}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Feature Requests */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-emerald-400 flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>Top Feature Requests</span>
          </h3>
          {featureRequests.length === 0 ? (
            <p className="text-sm text-zinc-500 italic">No feature requests extracted.</p>
          ) : (
            <ul className="space-y-3">
              {featureRequests.map((request: string, idx: number) => (
                <li key={idx} className="flex items-start space-x-3 text-sm text-zinc-300">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    {idx + 1}
                  </span>
                  <span className="pt-0.5 leading-relaxed">{request}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="text-zinc-400 text-sm">Initializing dashboard...</p>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
