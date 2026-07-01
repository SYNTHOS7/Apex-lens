'use client';

import React, { useEffect, useState } from 'react';
import { getAdminMetrics, AdminMetrics } from '../../lib/api';
import SentimentChart from '../../components/SentimentChart';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);

  useEffect(() => {
    setLoading(true);
    getAdminMetrics()
      .then((data) => {
        setMetrics(data);
        setError('');
      })
      .catch((err) => {
        setError(err.message || 'Access Denied. You must be an admin user.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="text-zinc-400 text-sm">Retrieving global admin metrics...</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-6 rounded-2xl text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 mx-auto">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-zinc-200">Admin Section Restricted</h3>
          <p className="text-sm text-zinc-400">{error || 'You do not have administrative privileges to view this page.'}</p>
          <a
            href="/"
            className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-6 rounded-xl transition text-sm shadow-md"
          >
            Return Home
          </a>
        </div>
      </div>
    );
  }

  const sentiment = metrics.average_sentiment || { positive: 0, neutral: 0, negative: 0 };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 md:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Admin Console</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Monitor overall product usage, active users, and system-wide sentiment analysis metrics.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Batches Processed</span>
            <span className="block text-3xl font-extrabold text-indigo-400 mt-2">{metrics.total_batches}</span>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Active Segments (Users)</span>
            <span className="block text-3xl font-extrabold text-emerald-400 mt-2">{metrics.total_users}</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">System Avg Sentiment</span>
            <div className="flex items-center space-x-3 mt-2">
              <span className="text-emerald-400 font-extrabold text-2xl">{sentiment.positive}% P</span>
              <span className="text-zinc-500 font-extrabold text-2xl">•</span>
              <span className="text-red-400 font-extrabold text-2xl">{sentiment.negative}% N</span>
            </div>
          </div>
          <div className="p-3 bg-zinc-500/10 text-zinc-400 rounded-xl">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sentiment donut */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-zinc-200 mb-4">System Sentiment Breakdown</h3>
          <SentimentChart
            positive={sentiment.positive}
            neutral={sentiment.neutral}
            negative={sentiment.negative}
          />
        </div>

        {/* Recent batches table */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-zinc-200 mb-4">Recent Batch Submissions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="text-xs text-zinc-500 uppercase tracking-wider bg-zinc-950 border-b border-zinc-800">
                  <tr>
                    <th className="px-4 py-3">Label</th>
                    <th className="px-4 py-3">Source Type</th>
                    <th className="px-4 py-3">User ID (Owner)</th>
                    <th className="px-4 py-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 bg-zinc-900/50">
                  {metrics.recent_batches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-zinc-800/40 transition">
                      <td className="px-4 py-3 font-semibold text-zinc-200 truncate max-w-xs">{batch.label}</td>
                      <td className="px-4 py-3 capitalize">{batch.source_type}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-500 truncate max-w-xs">{batch.user_id}</td>
                      <td className="px-4 py-3 text-xs">{new Date(batch.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                  {metrics.recent_batches.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-zinc-650">No batches uploaded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
