/**
 * Analytics Dashboard Page
 *
 * Comprehensive analytics dashboard displaying:
 * - Event overview with top teams by OPR/DPR/CCWM
 * - Performance trend charts
 * - Team comparison tools
 * - Consistency vs capability analysis
 *
 * Related: SCOUT-7
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Download } from 'lucide-react';
import { EventOverview } from '@/components/analytics/EventOverview';
import { OPRLeaderboard } from '@/components/analytics/OPRLeaderboard';
import { PerformanceTrends } from '@/components/analytics/PerformanceTrends';
import { TeamComparison } from '@/components/analytics/TeamComparison';
import { GamePieceBoxplot } from '@/components/analytics/GamePieceBoxplot';
import type { TeamStatistics } from '@/types';

interface Event {
  event_key: string;
  event_name: string;
  year: number;
}

export default function AnalyticsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);
  const [teamStats, setTeamStats] = useState<TeamStatistics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<number[]>([]);

  // Fetch events on mount
  useEffect(() => {
    fetchEvents();
  }, []);

  // Fetch team statistics when event changes
  useEffect(() => {
    if (selectedEventKey) {
      fetchTeamStats(selectedEventKey);
    }
  }, [selectedEventKey]);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/admin/events');
      const data = await response.json();

      if (data.success && data.data) {
        const sorted = data.data.sort((a: Event, b: Event) => {
          if (a.year !== b.year) return b.year - a.year;
          return a.event_name.localeCompare(b.event_name);
        });
        setEvents(sorted);
      } else {
        setError('Failed to load events');
      }
    } catch (error) {
      console.error('[Analytics] Error fetching events:', error);
      setError('Failed to load events');
    }
  };

  const fetchTeamStats = async (eventKey: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/analytics/event/${eventKey}`);
      const data = await response.json();

      if (data.success && data.data) {
        setTeamStats(data.data);
      } else {
        setError(data.error || 'Failed to load team statistics');
      }
    } catch (error) {
      console.error('[Analytics] Error fetching team stats:', error);
      setError('Failed to load team statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (!teamStats.length) return;

    // Export as CSV
    const headers = [
      'Team',
      'OPR',
      'DPR',
      'CCWM',
      'Avg Auto',
      'Avg Teleop',
      'Avg Endgame',
      'Reliability',
      'Matches Played'
    ];

    const rows = teamStats.map(stat => [
      stat.team_number,
      stat.opr?.toFixed(2) || 'N/A',
      stat.dpr?.toFixed(2) || 'N/A',
      stat.ccwm?.toFixed(2) || 'N/A',
      stat.avg_auto_score?.toFixed(1) || 'N/A',
      stat.avg_teleop_score?.toFixed(1) || 'N/A',
      stat.avg_endgame_score?.toFixed(1) || 'N/A',
      stat.reliability_score?.toFixed(1) || 'N/A',
      stat.matches_scouted || 0
    ]);

    const csv = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${selectedEventKey}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTeamSelect = (teamNumber: number) => {
    setSelectedTeams(prev => {
      if (prev.includes(teamNumber)) {
        return prev.filter(t => t !== teamNumber);
      }
      if (prev.length >= 4) {
        // Max 4 teams for comparison
        return [...prev.slice(1), teamNumber];
      }
      return [...prev, teamNumber];
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Team performance metrics, trends, and strategic insights
          </p>
        </div>
        <Button
          onClick={handleExport}
          disabled={!teamStats.length}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export Data
        </Button>
      </div>

      {/* Event Selector */}
      <Card className="p-4">
        <label className="block text-sm font-medium mb-2">
          Select Event
        </label>
        <select
          value={selectedEventKey || ''}
          onChange={(e) => setSelectedEventKey(e.target.value)}
          className="w-full md:w-96 px-3 py-2 border rounded-md bg-background"
        >
          <option value="">Choose an event...</option>
          {events.map((event) => (
            <option key={event.event_key} value={event.event_key}>
              {event.event_name} ({event.year})
            </option>
          ))}
        </select>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="p-4 border-destructive">
          <p className="text-destructive">{error}</p>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3">Loading analytics...</span>
          </div>
        </Card>
      )}

      {/* Dashboard Content */}
      {selectedEventKey && !isLoading && teamStats.length > 0 && (
        <>
          {/* Event Overview Section */}
          <EventOverview
            eventKey={selectedEventKey}
            teamStats={teamStats}
          />

          {/* Leaderboards and Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OPRLeaderboard
              teamStats={teamStats}
              onTeamSelect={handleTeamSelect}
              selectedTeams={selectedTeams}
            />

            <PerformanceTrends
              eventKey={selectedEventKey}
              selectedTeams={selectedTeams}
            />
          </div>

          {/* Team Comparison */}
          {selectedTeams.length > 0 && (
            <TeamComparison
              eventKey={selectedEventKey}
              teamNumbers={selectedTeams}
              teamStats={teamStats.filter(s => selectedTeams.includes(s.team_number))}
              allEventStats={teamStats}
            />
          )}

          {/* Game Piece Distribution */}
          <GamePieceBoxplot eventKey={selectedEventKey} />
        </>
      )}

      {/* Empty State */}
      {selectedEventKey && !isLoading && teamStats.length === 0 && !error && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            No analytics data available for this event yet.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Match scouting data is needed to generate statistics.
          </p>
        </Card>
      )}

      {/* No Event Selected */}
      {!selectedEventKey && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            Select an event above to view analytics
          </p>
        </Card>
      )}
    </div>
  );
}
