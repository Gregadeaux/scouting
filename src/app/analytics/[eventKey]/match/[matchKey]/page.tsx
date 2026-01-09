/**
 * Match Analytics Report Page
 *
 * Displays analytics for the 6 teams in a specific match:
 * - Match overview (alliances, team numbers)
 * - Team radar profiles for all 6 teams
 * - Game piece distribution boxplots for the 6 teams
 * - Head-to-head comparison
 *
 * Optimized for printing to PDF
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/Card';
import { Printer, ArrowLeft, Download } from 'lucide-react';
import { TeamRadarProfile } from '@/components/analytics/TeamRadarProfile';
import { GamePieceBoxplotFull } from '@/components/analytics/GamePieceBoxplotFull';
import type { TeamStatistics } from '@/types';

interface Match {
  match_key: string;
  match_number: number;
  comp_level: string;
  event_key: string;
  red_1: number;
  red_2: number;
  red_3: number;
  blue_1: number;
  blue_2: number;
  blue_3: number;
  red_score?: number;
  blue_score?: number;
}

interface Event {
  event_key: string;
  event_name: string;
  start_date: string;
  city: string;
  state_prov: string;
  year: number;
}

interface MatchReportPageProps {
  params: Promise<{ eventKey: string; matchKey: string }>;
}

export default function MatchReportPage({ params }: MatchReportPageProps) {
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [allTeamStats, setAllTeamStats] = useState<TeamStatistics[]>([]);
  const [matchTeamStats, setMatchTeamStats] = useState<TeamStatistics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt] = useState(new Date());
  const [eventKey, setEventKey] = useState<string | null>(null);
  const [matchKey, setMatchKey] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ eventKey, matchKey }) => {
      setEventKey(eventKey);
      setMatchKey(matchKey);
      Promise.all([
        fetchMatch(matchKey),
        fetchEvent(eventKey),
        fetchTeamStats(eventKey),
      ]).finally(() => setIsLoading(false));
    });
  }, [params]);

  // Filter team stats once we have both match data and all stats
  useEffect(() => {
    if (match && allTeamStats.length > 0) {
      const teamNumbers = [
        match.red_1,
        match.red_2,
        match.red_3,
        match.blue_1,
        match.blue_2,
        match.blue_3,
      ];
      const filtered = allTeamStats.filter((stat) =>
        teamNumbers.includes(stat.team_number)
      );
      setMatchTeamStats(filtered);
    }
  }, [match, allTeamStats]);

  const fetchMatch = async (matchKey: string) => {
    try {
      const response = await fetch(`/api/analytics/match/${matchKey}`);
      const data = await response.json();

      if (data.success && data.data) {
        setMatch(data.data);
      } else {
        setError('Failed to load match details');
      }
    } catch (error) {
      console.error('[MatchReport] Error fetching match:', error);
      setError('Failed to load match details');
    }
  };

  const fetchEvent = async (eventKey: string) => {
    try {
      const response = await fetch(`/api/admin/events/${eventKey}`);
      const data = await response.json();

      if (data.success && data.data) {
        setEvent(data.data);
      } else {
        setError('Failed to load event details');
      }
    } catch (error) {
      console.error('[MatchReport] Error fetching event:', error);
      setError('Failed to load event details');
    }
  };

  const fetchTeamStats = async (eventKey: string) => {
    try {
      const response = await fetch(`/api/analytics/event/${eventKey}`);
      const data = await response.json();

      if (data.success && data.data) {
        setAllTeamStats(data.data);
      } else {
        setError('Failed to load team statistics');
      }
    } catch (error) {
      console.error('[MatchReport] Error fetching stats:', error);
      setError('Failed to load team statistics');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    window.print();
  };

  const getCompLevelLabel = (compLevel: string): string => {
    const labels: Record<string, string> = {
      qm: 'Qualification',
      ef: 'Eighth Finals',
      qf: 'Quarter Finals',
      sf: 'Semi Finals',
      f: 'Finals',
    };
    return labels[compLevel] || compLevel.toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Generating match report...</p>
        </div>
      </div>
    );
  }

  if (error || !match || !event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || 'Match not found'}</p>
          <Button onClick={() => router.push('/analytics')}>
            Back to Analytics
          </Button>
        </div>
      </div>
    );
  }

  const redTeams = [match.red_1, match.red_2, match.red_3];
  const blueTeams = [match.blue_1, match.blue_2, match.blue_3];

  // Create color map for alliance teams
  const teamColors: Record<number, string> = {};
  redTeams.forEach((teamNumber) => {
    teamColors[teamNumber] = '#ef4444'; // red-500
  });
  blueTeams.forEach((teamNumber) => {
    teamColors[teamNumber] = '#3b82f6'; // blue-500
  });

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          nav,
          header,
          .no-print {
            display: none !important;
          }

          @page {
            size: letter landscape;
            margin: 0.5in;
          }

          body {
            font-size: 10pt;
            line-height: 1.3;
          }

          .page-break {
            page-break-after: always;
            break-after: always;
          }

          .print-section {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 1.5rem;
          }

          .break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          svg,
          svg * {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Screen Controls */}
      <div className="no-print p-6 bg-background border-b sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Button
            onClick={() => router.push('/analytics')}
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Analytics
          </Button>
          <div className="flex gap-2">
            <Button onClick={handleExportPDF} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Save as PDF
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print Report
            </Button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-7xl mx-auto p-0">
        
        {/* Team Radar Profiles */}
        {matchTeamStats.length > 0 && eventKey && (
          <TeamRadarProfile
            eventKey={eventKey}
            teams={matchTeamStats}
            sortBy="opr"
            topTeamsCount={6}
            teamColors={teamColors}
          />
        )}

        {/* Page break after radar */}
        <div className="page-break"></div>

        {/* Game Piece Distribution */}
        {eventKey && (
          <GamePieceBoxplotFull
            eventKey={eventKey}
            teamNumbers={[...redTeams, ...blueTeams]}
            teamColors={teamColors}
          />
        )}

        {/* Comparison Table */}
        <Card className="p-6 print-section">
          <h2 className="text-xl font-bold mb-4">Team Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Alliance</th>
                  <th className="text-left p-2">Team</th>
                  <th className="text-right p-2">OPR</th>
                  <th className="text-right p-2">CCWM</th>
                  <th className="text-right p-2">Auto</th>
                  <th className="text-right p-2">Teleop</th>
                  <th className="text-right p-2">Endgame</th>
                  <th className="text-right p-2">Reliability</th>
                </tr>
              </thead>
              <tbody>
                {redTeams.map((teamNumber) => {
                  const stats = matchTeamStats.find(
                    (s) => s.team_number === teamNumber
                  );
                  return (
                    <tr
                      key={teamNumber}
                      className="border-b hover:bg-muted/50 bg-red-50 dark:bg-red-950/10"
                    >
                      <td className="p-2 text-red-600 dark:text-red-400 font-semibold">
                        Red
                      </td>
                      <td className="p-2 font-semibold">{teamNumber}</td>
                      <td className="p-2 text-right">
                        {stats?.opr?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="p-2 text-right">
                        {stats?.ccwm?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="p-2 text-right">
                        {stats?.avg_auto_score?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="p-2 text-right">
                        {stats?.avg_teleop_score?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="p-2 text-right">
                        {stats?.avg_endgame_score?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="p-2 text-right">
                        {stats?.reliability_score?.toFixed(0) || 'N/A'}%
                      </td>
                    </tr>
                  );
                })}
                {blueTeams.map((teamNumber) => {
                  const stats = matchTeamStats.find(
                    (s) => s.team_number === teamNumber
                  );
                  return (
                    <tr
                      key={teamNumber}
                      className="border-b hover:bg-muted/50 bg-blue-50 dark:bg-blue-950/10"
                    >
                      <td className="p-2 text-blue-600 dark:text-blue-400 font-semibold">
                        Blue
                      </td>
                      <td className="p-2 font-semibold">{teamNumber}</td>
                      <td className="p-2 text-right">
                        {stats?.opr?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="p-2 text-right">
                        {stats?.ccwm?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="p-2 text-right">
                        {stats?.avg_auto_score?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="p-2 text-right">
                        {stats?.avg_teleop_score?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="p-2 text-right">
                        {stats?.avg_endgame_score?.toFixed(1) || 'N/A'}
                      </td>
                      <td className="p-2 text-right">
                        {stats?.reliability_score?.toFixed(0) || 'N/A'}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Alliance Totals */}
        <div className="grid grid-cols-2 gap-6 mt-6 print-section">
          <Card className="p-4 border-red-500/50">
            <h3 className="font-bold text-red-600 dark:text-red-400 mb-2">
              Red Alliance Totals
            </h3>
            <div className="text-sm space-y-1">
              <div>
                Predicted Score:{' '}
                {matchTeamStats
                  .filter((s) => redTeams.includes(s.team_number))
                  .reduce((sum, s) => sum + (s.opr || 0), 0)
                  .toFixed(1)}
              </div>
              <div>
                Avg Reliability:{' '}
                {(
                  matchTeamStats
                    .filter((s) => redTeams.includes(s.team_number))
                    .reduce((sum, s) => sum + (s.reliability_score || 0), 0) / 3
                ).toFixed(1)}
                %
              </div>
            </div>
          </Card>

          <Card className="p-4 border-blue-500/50">
            <h3 className="font-bold text-blue-600 dark:text-blue-400 mb-2">
              Blue Alliance Totals
            </h3>
            <div className="text-sm space-y-1">
              <div>
                Predicted Score:{' '}
                {matchTeamStats
                  .filter((s) => blueTeams.includes(s.team_number))
                  .reduce((sum, s) => sum + (s.opr || 0), 0)
                  .toFixed(1)}
              </div>
              <div>
                Avg Reliability:{' '}
                {(
                  matchTeamStats
                    .filter((s) => blueTeams.includes(s.team_number))
                    .reduce((sum, s) => sum + (s.reliability_score || 0), 0) / 3
                ).toFixed(1)}
                %
              </div>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t text-xs text-muted-foreground print-section">
          <p>
            Generated by FRC Scouting System • {generatedAt.toLocaleString()}
          </p>
          <p className="mt-1">
            Match: {matchKey} • Event: {eventKey}
          </p>
        </div>
      </div>
    </>
  );
}
