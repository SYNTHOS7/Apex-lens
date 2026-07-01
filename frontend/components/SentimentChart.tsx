'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface SentimentChartProps {
  positive: number;
  neutral: number;
  negative: number;
}

export default function SentimentChart({ positive, neutral, negative }: SentimentChartProps) {
  const data = [
    { name: 'Positive', value: positive, color: '#10B981' }, // Emerald-500
    { name: 'Neutral', value: neutral, color: '#64748B' },   // Slate-500
    { name: 'Negative', value: negative, color: '#EF4444' }, // Red-500
  ].filter(item => item.value > 0);

  return (
    <div className="w-full h-64 flex items-center justify-center">
      {data.length === 0 ? (
        <span className="text-sm text-zinc-500">No sentiment data available.</span>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b', // zinc-900
                border: '1px solid #27272a', // zinc-800
                borderRadius: '8px',
                color: '#f4f4f5',
              }}
              formatter={(value: any) => [`${value}%`, 'Score']}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
