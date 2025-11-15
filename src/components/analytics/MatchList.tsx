/**
 * Match List Component
 *
 * Displays a list of matches for an event with links to match reports
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FileText } from 'lucide-react';

interface Match {
  match_key: string;
  match_number: number;
  comp_level: string;
  red_1: number;
  red_2: number;
  red_3: number;
  blue_1: number;
  blue_2: number;
  blue_3: number;
  red_score?: number;
  blue_score?: number;
}

interface MatchListProps {
  eventKey: string;
}

const COMP_LEVEL_LABELS: Record<string, string> = {
  qm: 'Qualification',
  ef: 'Eighth Finals',
  qf: 'Quarter Finals',
  sf: 'Semi Finals',
  f: 'Finals',
};

export function MatchList({ eventKey }: MatchListProps) {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMatches();
  }, [eventKey]);

  const fetchMatches = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/analytics/matches/${eventKey}`);
      const data = await response.json();

      if (data.success && data.data) {
        setMatches(data.data);
      } else {
        setError(data.error || 'Failed to load matches');
      }
    } catch (err) {
      console.error('[MatchList] Error fetching matches:', err);
      setError('Failed to load matches');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3">Loading matches...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4 border-destructive">
        <p className="text-destructive">{error}</p>
      </Card>
    );
  }

  if (matches.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          No matches available for this event yet.
        </p>
      </Card>
    );
  }

  // Group matches by comp level
  const qualificationMatches = matches.filter((m) => m.comp_level === 'qm');
  const playoffMatches = matches.filter((m) => m.comp_level !== 'qm');

  return (
    <div className="space-y-6">
      {/* Qualification Matches */}
      {qualificationMatches.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Qualification Matches</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {qualificationMatches.map((match) => (
              <Button
                key={match.match_key}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2"
                onClick={() =>
                  router.push(`/analytics/${eventKey}/match/${match.match_key}`)
                }
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold">Match {match.match_number}</span>
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex gap-4 text-sm w-full">
                  <div className="flex-1">
                    <div className="text-red-600 dark:text-red-400 font-medium mb-1">
                      Red {match.red_score !== undefined && `(${match.red_score})`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {match.red_1}, {match.red_2}, {match.red_3}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-blue-600 dark:text-blue-400 font-medium mb-1">
                      Blue {match.blue_score !== undefined && `(${match.blue_score})`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {match.blue_1}, {match.blue_2}, {match.blue_3}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Playoff Matches */}
      {playoffMatches.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Playoff Matches</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {playoffMatches.map((match) => (
              <Button
                key={match.match_key}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2"
                onClick={() =>
                  router.push(`/analytics/${eventKey}/match/${match.match_key}`)
                }
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold">
                    {COMP_LEVEL_LABELS[match.comp_level]} {match.match_number}
                  </span>
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex gap-4 text-sm w-full">
                  <div className="flex-1">
                    <div className="text-red-600 dark:text-red-400 font-medium mb-1">
                      Red {match.red_score !== undefined && `(${match.red_score})`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {match.red_1}, {match.red_2}, {match.red_3}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-blue-600 dark:text-blue-400 font-medium mb-1">
                      Blue {match.blue_score !== undefined && `(${match.blue_score})`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {match.blue_1}, {match.blue_2}, {match.blue_3}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
