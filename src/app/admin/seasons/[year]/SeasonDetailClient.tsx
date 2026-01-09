'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { JsonSchemaViewer } from '@/components/admin/JsonSchemaViewer';
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  Play,
  Settings,
} from 'lucide-react';
import type { SeasonConfig, SeasonStatus } from '@/types';
import { getSeasonStatus } from '@/types';

interface SeasonDetailClientProps {
  year: number;
}

/**
 * Format a date string for display
 */
function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format match duration for display
 */
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${minutes} minutes`;
  return `${minutes}m ${secs}s`;
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

export function SeasonDetailClient({ year }: SeasonDetailClientProps) {
  const [season, setSeason] = useState<SeasonConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSeason() {
      try {
        const response = await fetch(`/api/admin/seasons/${year}`);
        if (response.ok) {
          const data = await response.json();
          setSeason(data.data);
        } else if (response.status === 404) {
          setError('Season configuration not found');
        } else {
          setError('Failed to fetch season configuration');
        }
      } catch (err) {
        console.error('Error fetching season:', err);
        setError('An error occurred while fetching season');
      } finally {
        setLoading(false);
      }
    }

    fetchSeason();
  }, [year]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-2">
            <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>

        {/* Content skeleton */}
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-32 rounded bg-gray-200 dark:bg-gray-700" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !season) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/seasons">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Seasons
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-600 dark:text-red-400">{error || 'Season not found'}</p>
            <Link href="/admin/seasons" className="mt-4 inline-block">
              <Button variant="outline">Return to Seasons List</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = getSeasonStatus(season);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/seasons">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {season.game_name || 'Unknown Game'}
              </h1>
              <Badge className={getStatusBadgeClass(status)}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>
            <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{year}</p>
          </div>
        </div>
      </div>

      {/* Description */}
      {season.game_description && (
        <Card>
          <CardContent className="py-4">
            <p className="text-gray-700 dark:text-gray-300">{season.game_description}</p>
          </CardContent>
        </Card>
      )}

      {/* Key Info Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Dates Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-blue-500" />
              Important Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Kickoff</p>
              <p className="text-gray-900 dark:text-gray-100">{formatDate(season.kickoff_date)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Championship Start
              </p>
              <p className="text-gray-900 dark:text-gray-100">
                {formatDate(season.championship_start_date)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Championship End
              </p>
              <p className="text-gray-900 dark:text-gray-100">
                {formatDate(season.championship_end_date)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Match Timing Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-green-500" />
              Match Timing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Match Duration
              </p>
              <p className="text-gray-900 dark:text-gray-100">
                {formatDuration(season.match_duration_seconds)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Autonomous Period
              </p>
              <p className="text-gray-900 dark:text-gray-100">
                {formatDuration(season.auto_duration_seconds)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Teleop Period</p>
              <p className="text-gray-900 dark:text-gray-100">
                {formatDuration(season.teleop_duration_seconds)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Resources Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ExternalLink className="h-5 w-5 text-purple-500" />
              Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {season.rules_manual_url ? (
              <a
                href={season.rules_manual_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:underline dark:text-blue-400"
              >
                <FileText className="h-4 w-4" />
                Game Manual
              </a>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No game manual link</p>
            )}
            {season.game_animation_url ? (
              <a
                href={season.game_animation_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-600 hover:underline dark:text-blue-400"
              >
                <Play className="h-4 w-4" />
                Game Animation
              </a>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No game animation link</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {season.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings className="h-5 w-5 text-gray-500" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{season.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* JSON Schemas Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Scouting Data Schemas
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          These JSON schemas define the structure of scouting data for this season. Schema changes
          should be made in code for type safety.
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          <JsonSchemaViewer
            schema={season.auto_schema as Record<string, unknown> | undefined}
            title="Auto Performance Schema"
            description="Defines autonomous period scouting fields"
          />

          <JsonSchemaViewer
            schema={season.teleop_schema as Record<string, unknown> | undefined}
            title="Teleop Performance Schema"
            description="Defines teleoperated period scouting fields"
          />

          <JsonSchemaViewer
            schema={season.endgame_schema as Record<string, unknown> | undefined}
            title="Endgame Performance Schema"
            description="Defines endgame period scouting fields"
          />

          <JsonSchemaViewer
            schema={season.capabilities_schema as Record<string, unknown> | undefined}
            title="Robot Capabilities Schema"
            description="Defines pit scouting robot capabilities fields"
          />
        </div>
      </div>

      {/* Timestamps */}
      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        <div className="flex flex-wrap gap-6 text-sm text-gray-500 dark:text-gray-400">
          {season.created_at && (
            <span>Created: {new Date(season.created_at).toLocaleString()}</span>
          )}
          {season.updated_at && (
            <span>Last updated: {new Date(season.updated_at).toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}
