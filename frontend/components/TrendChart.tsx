'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TrendChartProps {
  data: {
    date: string;
    label: string;
    Positive: number;
    Neutral: number;
    Negative: number;
  }[];
}

export default function TrendChart({ data }: TrendChartProps) {
  return (
    <div className="w-full h-80">
      {data.length === 0 ? (
        <div className="w-full h-full flex items-center justify-center border border-zinc-800 rounded-xl bg-zinc-900/20 text-zinc-500 text-sm">
          No historical batches found. Upload batches to view trends over time.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorNeutral" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#64748B" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#64748B" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
            <YAxis stroke="#71717a" fontSize={11} tickLine={false} domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                border: '1px solid #27272a',
                borderRadius: '8px',
                color: '#f4f4f5',
              }}
              labelFormatter={(label, items) => {
                const item = items[0]?.payload;
                return item ? `${item.label} (${label})` : label;
              }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            <Area type="monotone" dataKey="Positive" stroke="#10B981" fillOpacity={1} fill="url(#colorPositive)" strokeWidth={2} />
            <Area type="monotone" dataKey="Neutral" stroke="#64748B" fillOpacity={1} fill="url(#colorNeutral)" strokeWidth={2} />
            <Area type="monotone" dataKey="Negative" stroke="#EF4444" fillOpacity={1} fill="url(#colorNegative)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
