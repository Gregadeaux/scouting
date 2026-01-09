'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ScouterLeaderboard } from '@/components/admin/ScouterLeaderboard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/admin/Toast';
import { RefreshCw } from 'lucide-react';
import type { ScouterLeaderboard as LeaderboardType } from '@/types/validation';

export default function LeaderboardPage() {
  const { showToast } = useToast();
  const [leaderboard, setLeaderboard] = useState<LeaderboardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [events, setEvents] = useState<Array<{ event_key: string; event_name: string }>>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Generate year options (current year and past 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => ({
    value: (currentYear - i).toString(),
    label: (currentYear - i).toString(),
  }));

  // Fetch events for the selected year
  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        limit: '100', // Get all events for the year
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
  }, [selectedYear, showToast]);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        seasonYear: selectedYear.toString(),
        ...(selectedEvent && { eventKey: selectedEvent }),
      });

      const response = await fetch(`/api/admin/validation/leaderboard?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.data);
      } else {
        const error = await response.json();
        showToast('error', error.error || 'Failed to fetch leaderboard');
        setLeaderboard(null);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      showToast('error', 'An error occurred while fetching leaderboard');
      setLeaderboard(null);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedEvent, showToast]);

  // Fetch events when year changes
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Fetch leaderboard when year or event changes
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Event options for dropdown
  const eventOptions = [
    { value: 'all', label: 'All Events (Season)' },
    ...events.map((event) => ({
      value: event.event_key,
      label: event.event_name,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Scouter Leaderboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ELO rankings based on scouting accuracy
          </p>
        </div>
        <Button
          onClick={fetchLeaderboard}
          disabled={loading}
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Season Year Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Season Year
              </label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => {
                  setSelectedYear(parseInt(value));
                  setSelectedEvent(null); // Reset event when year changes
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Event Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Event
              </label>
              <Select
                value={selectedEvent || 'all'}
                onValueChange={(value) => setSelectedEvent(value === 'all' ? null : value)}
                disabled={eventsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Events (Season)" />
                </SelectTrigger>
                <SelectContent>
                  {eventOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Summary */}
      {leaderboard && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Scouters</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {leaderboard.entries.length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Rating</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {leaderboard.entries.length > 0
                    ? Math.round(
                        leaderboard.entries.reduce((sum, e) => sum + e.currentElo, 0) /
                          leaderboard.entries.length
                      )
                    : 0}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Validations</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {leaderboard.entries.reduce((sum, e) => sum + e.totalValidations, 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Success Rate</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {leaderboard.entries.length > 0
                    ? (
                        (leaderboard.entries.reduce(
                          (sum, e) => sum + (e.totalValidations > 0 ? (e.successfulValidations / e.totalValidations) * 100 : 0),
                          0
                        ) /
                          leaderboard.entries.length)
                      ).toFixed(0)
                    : 0}
                  %
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leaderboard Table */}
      <ScouterLeaderboard
        entries={leaderboard?.entries || []}
        loading={loading}
        emptyMessage={
          selectedEvent
            ? 'No rankings available for this event'
            : 'No rankings available for this season'
        }
      />
    </div>
  );
}
