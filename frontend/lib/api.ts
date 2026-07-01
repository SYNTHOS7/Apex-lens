import { supabase } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ParseResult {
  text: string;
  word_count: number;
  source_type: 'text' | 'csv' | 'pdf' | 'docx';
  rows?: string[];
}

export interface SentimentScores {
  positive: number;
  neutral: number;
  negative: number;
}

export interface Theme {
  label: string;
  count: number;
  sentiment: 'positive' | 'neutral' | 'negative';
}

export interface AnalysisResultData {
  sentiment_scores: SentimentScores;
  themes: Theme[];
  top_complaints: string[];
  feature_requests: string[];
  executive_summary: string;
}

export interface BatchData {
  id: string;
  user_id: string;
  label: string;
  raw_text: string;
  source_type: string;
  created_at: string;
  analysis_results?: {
    sentiment_json: SentimentScores;
    themes_json: {
      themes: Theme[];
      top_complaints: string[];
      feature_requests: string[];
    };
    summary_text: string;
  }[] | any;
  themes?: Theme[];
}

export interface TrendData {
  batch_id: string;
  label: string;
  created_at: string;
  sentiment_scores: SentimentScores;
}

export interface AdminMetrics {
  total_batches: number;
  total_users: number;
  average_sentiment: SentimentScores;
  recent_batches: {
    id: string;
    label: string;
    source_type: string;
    created_at: string;
    user_id: string;
  }[];
}

async function getAuthHeaders(): Promise<HeadersInit> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { 'Authorization': `Bearer ${session.access_token}` };
    }
  } catch (e) {
    console.warn('Error reading Supabase session, using fallback:', e);
  }
  // Bypassing auth with test-token if no active user session is found
  return { 'Authorization': 'Bearer test-token' };
}

export async function parseText(text: string): Promise<ParseResult> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/analyse/parse-text`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to parse text input.');
  }
  return res.json();
}

export async function getCsvColumns(file: File): Promise<{ columns: string[]; filename: string }> {
  const headers = await getAuthHeaders();
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/api/analyse/upload-csv-metadata`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to extract CSV columns.');
  }
  return res.json();
}

export async function parseFile(file: File, columnName?: string): Promise<ParseResult> {
  const headers = await getAuthHeaders();
  const formData = new FormData();
  formData.append('file', file);
  if (columnName) {
    formData.append('column_name', columnName);
  }

  const res = await fetch(`${API_BASE_URL}/api/analyse/parse-file`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to parse file content.');
  }
  return res.json();
}

export async function runAnalysis(text: string, label: string, sourceType: string): Promise<{ batch_id: string; analysis: AnalysisResultData }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/analyse/run-analysis`, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, label, source_type: sourceType }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to execute feedback analysis.');
  }
  return res.json();
}

export async function getBatches(): Promise<BatchData[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/batches`, {
    headers,
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to retrieve batches.');
  }
  return res.json();
}

export async function getBatchDetails(batchId: string): Promise<BatchData> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/batches/${batchId}`, {
    headers,
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to retrieve batch details.');
  }
  return res.json();
}

export async function deleteBatch(batchId: string): Promise<{ status: string; message: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/batches/${batchId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to delete batch.');
  }
  return res.json();
}

export async function getTrends(): Promise<TrendData[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/batches/trends`, {
    headers,
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to retrieve trends.');
  }
  return res.json();
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/admin/metrics`, {
    headers,
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || 'Failed to retrieve admin metrics.');
  }
  return res.json();
}

export function getExportPdfUrl(batchId: string): string {
  return `${API_BASE_URL}/api/analyse/export-pdf/${batchId}`;
}
