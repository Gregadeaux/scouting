'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/admin/Toast';
import { Play, ExternalLink, CheckCircle, XCircle, AlertCircle, TrendingUp, Users } from 'lucide-react';
import type { ValidationExecutionSummary, ValidationStrategyType } from '@/types/validation';

export default function ValidationPage() {
  const { showToast } = useToast();
  const [events, setEvents] = useState<Array<{ event_key: string; event_name: string; year: number }>>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [selectedStrategies, setSelectedStrategies] = useState<Set<ValidationStrategyType>>(
    new Set(['consensus', 'tba'])
  );
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [executionResult, setExecutionResult] = useState<ValidationExecutionSummary | null>(null);

  // Fetch events
  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const currentYear = new Date().getFullYear();
      const params = new URLSearchParams({
        year: currentYear.toString(),
        limit: '100',
        sortBy: 'start_date',
        sortOrder: 'desc',
      });

      const response = await fetch(`/api/admin/events?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.data || []);
      } else {
        showToast('error', 'Failed to fetch events');
        setEvents([]);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      showToast('error', 'An error occurred while fetching events');
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Toggle strategy selection
  const toggleStrategy = (strategy: ValidationStrategyType) => {
    setSelectedStrategies((prev) => {
      const next = new Set(prev);
      if (next.has(strategy)) {
        next.delete(strategy);
      } else {
        next.add(strategy);
      }
      return next;
    });
  };

  // Execute validation
  const executeValidation = async () => {
    if (!selectedEvent) {
      showToast('error', 'Please select an event');
      return;
    }

    if (selectedStrategies.size === 0) {
      showToast('error', 'Please select at least one validation strategy');
      return;
    }

    setLoading(true);
    setExecutionResult(null);

    try {
      const response = await fetch('/api/admin/validation/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventKey: selectedEvent,
          strategies: Array.from(selectedStrategies),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setExecutionResult(data.data);
        showToast('success', 'Validation completed successfully');
      } else {
        const error = await response.json();
        showToast('error', error.error || 'Failed to execute validation');
      }
    } catch (error) {
      console.error('Error executing validation:', error);
      showToast('error', 'An error occurred while executing validation');
    } finally {
      setLoading(false);
    }
  };

  // Event options for dropdown
  const eventOptions = events.map((event) => ({
    value: event.event_key,
    label: `${event.event_name} (${event.year})`,
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Scouter Validation
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Validate scouter accuracy and update ELO ratings
          </p>
        </div>
        <Link href="/admin/leaderboard">
          <Button variant="outline">
            <TrendingUp className="w-4 h-4 mr-2" />
            View Leaderboard
          </Button>
        </Link>
      </div>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Event Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event *
            </label>
            <Select
              value={selectedEvent}
              onValueChange={(value) => setSelectedEvent(value)}
              disabled={eventsLoading || loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an event..." />
              </SelectTrigger>
              <SelectContent>
                {eventOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Select the event to validate scouting data for
            </p>
          </div>

          {/* Strategy Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Validation Strategies *
            </label>
            <div className="space-y-3">
              {/* Consensus Strategy */}
              <div
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedStrategies.has('consensus')
                    ? 'border-frc-blue bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => toggleStrategy('consensus')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={selectedStrategies.has('consensus')}
                        onChange={() => toggleStrategy('consensus')}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-frc-blue"
                      />
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Consensus Validation
                      </h4>
                      <Badge variant="success">High Confidence</Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 ml-6">
                      Compare each scouter&apos;s data against the consensus value from all scouts.
                      Most accurate for fields where multiple scouts observed the same robot.
                    </p>
                    <div className="flex items-center gap-4 mt-2 ml-6 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Requires 3+ scouts
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Field-by-field comparison
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* TBA Strategy */}
              <div
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedStrategies.has('tba')
                    ? 'border-frc-blue bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => toggleStrategy('tba')}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={selectedStrategies.has('tba')}
                        onChange={() => toggleStrategy('tba')}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-frc-blue"
                      />
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        TBA Validation
                      </h4>
                      <Badge variant="secondary">Medium Confidence</Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 ml-6">
                      Compare alliance totals against The Blue Alliance official data.
                      Useful for detecting systematic errors across all scouters.
                    </p>
                    <div className="flex items-center gap-4 mt-2 ml-6 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        Uses TBA API
                      </span>
                      <span className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Alliance-level aggregation
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Execute Button */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={executeValidation}
              disabled={!selectedEvent || selectedStrategies.size === 0 || loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Executing Validation...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Validation
                </>
              )}
            </Button>
            {loading && (
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                This may take a few minutes for large events...
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      {executionResult && (
        <Card>
          <CardHeader>
            <CardTitle>Validation Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Scouts</span>
                  <Users className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {executionResult.scoutersAffected}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Validations</span>
                  <CheckCircle className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {executionResult.totalValidations}
                </p>
              </div>

              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">ELO Updates</span>
                  <TrendingUp className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {executionResult.eloUpdates.length}
                </p>
              </div>
            </div>

            {/* ELO Updates Summary */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                ELO Rating Changes
              </h4>
              <div className="space-y-2">
                {executionResult.eloUpdates.slice(0, 5).map((update) => (
                  <div key={update.scouterId} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Scouter {update.scouterId.substring(0, 8)}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({update.validationsProcessed} validations)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {Math.round(update.oldRating)} → {Math.round(update.newRating)}
                      </span>
                      <span className={`text-sm font-bold ${
                        update.delta > 0
                          ? 'text-green-600 dark:text-green-400'
                          : update.delta < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {update.delta > 0 ? '+' : ''}{Math.round(update.delta)}
                      </span>
                    </div>
                  </div>
                ))}
                {executionResult.eloUpdates.length > 5 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                    + {executionResult.eloUpdates.length - 5} more updates
                  </p>
                )}
              </div>
            </div>

            {/* Duration and Execution Info */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  Execution ID: <code className="text-xs">{executionResult.executionId}</code>
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  Duration: {executionResult.durationMs}ms
                </span>
              </div>
            </div>

            {/* View Leaderboard Button */}
            <div className="pt-2">
              <Link href="/admin/leaderboard">
                <Button variant="outline" className="w-full">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Updated Leaderboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
