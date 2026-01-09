'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ValidationResult {
  id: string;
  match_key: string;
  team_number: number;
  field_path: string;
  expected_value: unknown;
  actual_value: unknown;
  accuracy_score: number;
  validation_outcome: string;
  notes: string;
  event_key: string;
}

interface HistoryEntry {
  id: string;
  elo_before: number;
  elo_after: number;
  elo_delta: number;
  outcome: string;
  accuracy_score: number;
  match_key: string;
  team_number: number;
  event_key: string;
  created_at: string;
  validation_results: ValidationResult;
}

interface CurrentRating {
  current_elo: number;
  peak_elo: number;
  lowest_elo: number;
  total_validations: number;
  successful_validations: number;
  failed_validations: number;
  confidence_level: number;
}

export default function ScouterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const scouterId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRating, setCurrentRating] = useState<CurrentRating | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    fetchScouterHistory();
  }, [scouterId]);

  async function fetchScouterHistory() {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/scouters/${scouterId}/history?seasonYear=2025`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch scouter history');
      }

      setCurrentRating(data.data.currentRating);
      setHistory(data.data.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  function formatFieldName(fieldPath: string): string {
    // Convert field_path like "tba.autoCoralCount" to "Auto Coral"
    const parts = fieldPath.split('.');
    const lastPart = parts[parts.length - 1];
    return lastPart
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace('Count', '')
      .trim();
  }

  function getOutcomeIcon(delta: number) {
    if (delta > 0.5) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (delta < -0.5) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  }

  function getOutcomeBadge(outcome: string) {
    const colors = {
      exact_match: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      close_match: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      mismatch: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      critical_error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${colors[outcome as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {outcome.replace('_', ' ')}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={() => router.back()} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="text-center py-12">Loading scouter history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={() => router.back()} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <Card className="p-6 border-red-200 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        </Card>
      </div>
    );
  }

  const successRate = currentRating
    ? Math.round((currentRating.successful_validations / currentRating.total_validations) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={() => router.back()} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Scouter Details</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ID: {scouterId.substring(0, 8)}...
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {currentRating && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Current ELO</div>
            <div className="text-2xl font-bold">{Math.round(currentRating.current_elo)}</div>
            <div className="text-xs text-gray-500 mt-1">
              Peak: {Math.round(currentRating.peak_elo)} | Low: {Math.round(currentRating.lowest_elo)}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Validations</div>
            <div className="text-2xl font-bold">{currentRating.total_validations}</div>
            <div className="text-xs text-gray-500 mt-1">
              {currentRating.successful_validations} / {currentRating.failed_validations}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Success Rate</div>
            <div className="text-2xl font-bold">{successRate}%</div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full mt-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${successRate}%` }}
              />
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">Confidence</div>
            <div className="text-2xl font-bold">
              {Math.round(currentRating.confidence_level * 100)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Statistical confidence</div>
          </Card>
        </div>
      )}

      {/* History Timeline */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">ELO History</h2>

        {history.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No validation history found</p>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => (
              <div
                key={entry.id}
                className="border dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getOutcomeIcon(entry.elo_delta)}
                      <span className="font-mono text-sm font-medium">
                        {entry.match_key}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Team {entry.team_number}
                      </span>
                      {getOutcomeBadge(entry.validation_results.validation_outcome)}
                    </div>

                    <div className="ml-7 space-y-1">
                      <div className="text-sm">
                        <span className="font-medium">{formatFieldName(entry.validation_results.field_path)}:</span>
                        {' '}
                        <span className="text-red-600 dark:text-red-400">
                          Expected {JSON.stringify(entry.validation_results.expected_value)}
                        </span>
                        {' → '}
                        <span className="text-blue-600 dark:text-blue-400">
                          Recorded {JSON.stringify(entry.validation_results.actual_value)}
                        </span>
                      </div>

                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {entry.validation_results.notes}
                      </div>

                      <div className="text-xs text-gray-500">
                        Accuracy: {Math.round(entry.accuracy_score * 100)}%
                      </div>
                    </div>
                  </div>

                  <div className="text-right ml-4">
                    <div className={`text-lg font-bold ${entry.elo_delta > 0 ? 'text-green-600 dark:text-green-400' : entry.elo_delta < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600'}`}>
                      {entry.elo_delta > 0 ? '+' : ''}{entry.elo_delta.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {Math.round(entry.elo_before)} → {Math.round(entry.elo_after)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
