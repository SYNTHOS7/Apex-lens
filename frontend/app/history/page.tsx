'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getBatches, getTrends, deleteBatch, BatchData, TrendData } from '../../lib/api';
import TrendChart from '../../components/TrendChart';

export default function HistoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [batches, setBatches] = useState<BatchData[]>([]);
  const [trends, setTrends] = useState<TrendData[]>([]);
  
  // Comparison States
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<BatchData[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const batchesList = await getBatches();
      const trendsList = await getTrends();
      setBatches(batchesList);
      setTrends(trendsList);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve history logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm('Are you sure you want to delete this batch run? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteBatch(id);
      // Reload lists
      loadData();
      // Remove from selection if deleted
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete the batch.');
    }
  };

  const handleSelectCompare = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      if (selectedIds.length >= 2) {
        alert('You can select a maximum of 2 batches for side-by-side comparison.');
        return;
      }
      setSelectedIds([...selectedIds, id]);
    }
  };

  const triggerComparison = () => {
    if (selectedIds.length !== 2) {
      alert('Please select exactly 2 batches to compare.');
      return;
    }
    const compared = batches.filter(b => selectedIds.includes(b.id));
    setComparisonData(compared);
    setCompareMode(true);
  };

  const formattedTrendData = trends.map(t => {
    const sents = t.sentiment_scores || { positive: 0, neutral: 0, negative: 0 };
    return {
      date: new Date(t.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      label: t.label,
      Positive: sents.positive,
      Neutral: sents.neutral,
      Negative: sents.negative,
    };
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 md:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-800 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">History & Sentiment Trends</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Browse through your past customer feedback analysis runs and compare metrics over time.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="text-zinc-400 text-sm">Loading historical dataset...</p>
        </div>
      ) : error ? (
        <div className="p-5 bg-red-950/30 border border-red-900/50 rounded-2xl text-center text-sm text-red-400">
          {error}
        </div>
      ) : (
        <>
          {/* Trend Section */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-zinc-200">Historical Sentiment Trends</h3>
            <TrendChart data={formattedTrendData} />
          </div>

          {/* Compare widget */}
          {selectedIds.length > 0 && !compareMode && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-zinc-900 border border-indigo-500/50 shadow-2xl shadow-indigo-500/10 rounded-2xl p-4 flex items-center justify-between space-x-6 max-w-lg w-full">
              <span className="text-sm font-semibold text-zinc-200">
                {selectedIds.length} of 2 batches selected for comparison
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 px-3 rounded-lg border border-zinc-700 font-medium"
                  type="button"
                >
                  Clear
                </button>
                <button
                  onClick={triggerComparison}
                  disabled={selectedIds.length !== 2}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2 px-4 rounded-lg font-semibold transition"
                  type="button"
                >
                  Compare Side-by-Side
                </button>
              </div>
            </div>
          )}

          {/* Comparison Panel */}
          {compareMode && comparisonData.length === 2 && (
            <div className="bg-zinc-900 border border-indigo-500/30 rounded-2xl p-6 space-y-6 relative">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <h3 className="text-lg font-bold text-indigo-400">Side-by-Side Batch Comparison</h3>
                <button
                  onClick={() => {
                    setCompareMode(false);
                    setComparisonData([]);
                  }}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-1.5 px-3 rounded-lg border border-zinc-700"
                  type="button"
                >
                  Exit Comparison
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {comparisonData.map((data, idx) => {
                  const analysisResults = data.analysis_results;
                  const analysis = analysisResults 
                    ? (Array.isArray(analysisResults) ? (analysisResults.length > 0 ? analysisResults[0] : null) : analysisResults)
                    : null;
                  const sentiment = analysis?.sentiment_json || { positive: 0, neutral: 0, negative: 0 };
                  const payloadJson = analysis?.themes_json || {};
                  const complaints = (payloadJson as any).top_complaints || [];
                  const requests = (payloadJson as any).feature_requests || [];

                  return (
                    <div key={data.id} className="space-y-6 p-4 rounded-xl bg-zinc-950 border border-zinc-850">
                      <div>
                        <span className="text-xs text-indigo-400 font-semibold tracking-wider uppercase">Batch #{idx + 1}</span>
                        <h4 className="text-xl font-bold text-zinc-100 mt-1">{data.label}</h4>
                        <p className="text-xs text-zinc-500">Created: {new Date(data.created_at).toLocaleDateString()}</p>
                      </div>

                      {/* Sentiment */}
                      <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-3">Sentiment Scores</span>
                        <div className="flex items-center justify-around text-center">
                          <div>
                            <span className="block text-xl font-extrabold text-emerald-400">{sentiment.positive}%</span>
                            <span className="text-xs text-zinc-500">Positive</span>
                          </div>
                          <div>
                            <span className="block text-xl font-extrabold text-zinc-400">{sentiment.neutral}%</span>
                            <span className="text-xs text-zinc-500">Neutral</span>
                          </div>
                          <div>
                            <span className="block text-xl font-extrabold text-red-400">{sentiment.negative}%</span>
                            <span className="text-xs text-zinc-500">Negative</span>
                          </div>
                        </div>
                      </div>

                      {/* Executive Summary */}
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">AI Executive Summary</span>
                        <p className="text-sm text-zinc-300 italic leading-relaxed bg-zinc-900/20 p-3 rounded border border-zinc-800/40">
                          &ldquo;{analysis?.summary_text || 'No summary generated.'}&rdquo;
                        </p>
                      </div>

                      {/* Complaints */}
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Top Complaints</span>
                        <ul className="space-y-1 text-sm text-zinc-400">
                          {complaints.slice(0, 3).map((comp: string, i: number) => (
                            <li key={i} className="truncate">• {comp}</li>
                          ))}
                          {complaints.length === 0 && <li className="text-zinc-600 italic">None</li>}
                        </ul>
                      </div>

                      {/* Feature Requests */}
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Feature Requests</span>
                        <ul className="space-y-1 text-sm text-zinc-400">
                          {requests.slice(0, 3).map((req: string, i: number) => (
                            <li key={i} className="truncate">• {req}</li>
                          ))}
                          {requests.length === 0 && <li className="text-zinc-600 italic">None</li>}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* History Batches List */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-zinc-200">Past Analysis Runs ({batches.length})</h3>
            {batches.length === 0 ? (
              <div className="p-12 border border-zinc-800 rounded-2xl bg-zinc-900/10 text-center text-zinc-500 text-sm">
                No past analysis runs found. Go to the home page to start your first analysis.
              </div>
            ) : (
              <div className="overflow-hidden border border-zinc-800 rounded-2xl bg-zinc-900/30">
                <div className="divide-y divide-zinc-800">
                  {batches.map((batch) => {
                    const analysisResults = batch.analysis_results;
                    const analysis = analysisResults 
                      ? (Array.isArray(analysisResults) ? (analysisResults.length > 0 ? analysisResults[0] : null) : analysisResults)
                      : null;
                    const sentiment = analysis?.sentiment_json || { positive: 0, neutral: 0, negative: 0 };
                    const isSelected = selectedIds.includes(batch.id);

                    return (
                      <div
                        key={batch.id}
                        className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-900/40 transition duration-150 ${
                          isSelected ? 'bg-indigo-500/5' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          <button
                            onClick={() => handleSelectCompare(batch.id)}
                            className={`w-5 h-5 rounded border mt-1 flex items-center justify-center transition flex-shrink-0 ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600'
                            }`}
                            type="button"
                          >
                            {isSelected && (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <Link href={`/dashboard?id=${batch.id}`} className="block font-bold text-zinc-200 hover:text-indigo-400 transition truncate">
                              {batch.label}
                            </Link>
                            <div className="flex items-center space-x-2 text-xs text-zinc-500 mt-1 flex-wrap gap-y-1">
                              <span className="capitalize">{batch.source_type} format</span>
                              <span>•</span>
                              <span>{new Date(batch.created_at).toLocaleDateString()}</span>
                              <span>•</span>
                              <span className="text-zinc-400">{analysis ? 'Analyzed' : 'Parsing only'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Sentiment values badge */}
                        <div className="flex items-center space-x-6 flex-shrink-0">
                          <div className="flex space-x-3 text-xs font-semibold">
                            <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                              {sentiment.positive}%
                            </span>
                            <span className="text-zinc-400 bg-zinc-500/10 px-2 py-1 rounded">
                              {sentiment.neutral}%
                            </span>
                            <span className="text-red-400 bg-red-500/10 px-2 py-1 rounded">
                              {sentiment.negative}%
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Link
                              href={`/dashboard?id=${batch.id}`}
                              className="text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-zinc-300 font-medium py-1.5 px-3 rounded-lg transition"
                            >
                              Details
                            </Link>
                            <button
                              onClick={(e) => handleDelete(batch.id, e)}
                              className="text-xs bg-zinc-950 hover:bg-red-950/40 border border-zinc-850 hover:border-red-900/50 text-zinc-500 hover:text-red-400 p-1.5 rounded-lg transition"
                              type="button"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
