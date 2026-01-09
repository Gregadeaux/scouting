'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, ExternalLink, Eye } from 'lucide-react';
import type { SeasonConfigListItem, SeasonStatus } from '@/types';
import { getSeasonStatus } from '@/types';

/**
 * Format a date string for display
 */
function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format championship date range
 */
function formatChampionshipRange(start?: string, end?: string): string {
  if (!start && !end) return '-';
  if (start && end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    // If same year and month, abbreviate
    if (startDate.getFullYear() === endDate.getFullYear()) {
      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
  }
  return `${formatDate(start)} - ${formatDate(end)}`;
}

/**
 * Get badge styling based on status
 */
function getStatusBadgeClass(status: SeasonStatus): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'upcoming':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'past':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
}

/**
 * Format match duration for display
 */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${minutes}m`;
  return `${minutes}m ${secs}s`;
}

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<SeasonConfigListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSeasons() {
      try {
        const response = await fetch('/api/admin/seasons');
        if (response.ok) {
          const data = await response.json();
          setSeasons(data.data);
        } else {
          setError('Failed to fetch season configurations');
        }
      } catch (err) {
        console.error('Error fetching seasons:', err);
        setError('An error occurred while fetching seasons');
      } finally {
        setLoading(false);
      }
    }

    fetchSeasons();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Seasons</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            View and manage season configurations
          </p>
        </div>

        {/* Loading skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-32 rounded bg-gray-200 dark:bg-gray-700" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Seasons</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            View and manage season configurations
          </p>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (seasons.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Seasons</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            View and manage season configurations
          </p>
        </div>
        <Card>
          <CardContent className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <Calendar className="mb-4 h-12 w-12 text-gray-400" />
            <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
              No Seasons Configured
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Run database migrations to add season configurations.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Seasons</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          View and manage season configurations
        </p>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/30">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> Season configurations define the game-specific schemas and timing
          for each FRC season. JSON schema editing should be done in code for type safety.
        </p>
      </div>

      {/* Season Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {seasons.map((season) => {
          const status = getSeasonStatus(season);
          return (
            <Link key={season.year} href={`/admin/seasons/${season.year}`}>
              <Card className="h-full cursor-pointer transition-all hover:shadow-lg hover:ring-2 hover:ring-blue-500 dark:hover:ring-blue-400">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">
                        {season.game_name || 'Unknown Game'}
                      </CardTitle>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {season.year}
                      </p>
                    </div>
                    <Badge className={getStatusBadgeClass(status)}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Description */}
                  {season.game_description && (
                    <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                      {season.game_description}
                    </p>
                  )}

                  {/* Key Info */}
                  <div className="space-y-2 text-sm">
                    {/* Kickoff Date */}
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span>Kickoff: {formatDate(season.kickoff_date)}</span>
                    </div>

                    {/* Championship */}
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <ExternalLink className="h-4 w-4" />
                      <span>
                        Championship:{' '}
                        {formatChampionshipRange(
                          season.championship_start_date,
                          season.championship_end_date
                        )}
                      </span>
                    </div>

                    {/* Match Duration */}
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Clock className="h-4 w-4" />
                      <span>
                        Match: {formatDuration(season.match_duration_seconds)} (Auto:{' '}
                        {formatDuration(season.auto_duration_seconds)}, Teleop:{' '}
                        {formatDuration(season.teleop_duration_seconds)})
                      </span>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <div className="flex items-center justify-end pt-2">
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                      <Eye className="h-4 w-4" />
                      View Details
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
