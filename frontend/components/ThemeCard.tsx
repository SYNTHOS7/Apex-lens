'use client';

import React from 'react';

interface ThemeCardProps {
  label: string;
  count: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export default function ThemeCard({ label, count, sentiment }: ThemeCardProps) {
  const getSentimentColors = () => {
    switch (sentiment) {
      case 'positive':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'negative':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 hover:bg-zinc-900/80 transition shadow-md">
      <div className="flex items-start justify-between space-x-2">
        <h4 className="text-zinc-200 font-semibold text-base leading-tight truncate flex-1">{label}</h4>
        <span className={`text-xs px-2.5 py-0.5 rounded-full border ${getSentimentColors()} capitalize font-medium flex-shrink-0`}>
          {sentiment}
        </span>
      </div>
      <div className="mt-4 flex items-center space-x-1.5 text-zinc-500 text-sm">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span>{count} mentions</span>
      </div>
    </div>
  );
}
