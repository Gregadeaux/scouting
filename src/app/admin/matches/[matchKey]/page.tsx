import { notFound } from 'next/navigation';
import MatchDetailClient from './MatchDetailClient';
import { getMatchService, getTeamService, type TeamDetail } from '@/lib/services';
import type { Team, MatchSchedule } from '@/types';

interface MatchDetailPageProps {
  params: Promise<{
    matchKey: string;
  }>;
}

interface EnrichedRecentMatch extends MatchSchedule {
  alliance: 'red' | 'blue';
  score: number;
  opponent_score: number;
  result: 'W' | 'L' | 'T' | '-';
}

/**
 * Transform TBA 2025 Reefscape score breakdown to component format
 * TBA structure has nested objects for reef levels and different naming
 */
function transformScoreBreakdown(
  breakdown: Record<string, unknown> | null
): Record<string, number | null> | null {
  if (!breakdown) return null;

  // Extract teleop reef data (nested structure)
  const teleopReef = breakdown.teleopReef as Record<string, unknown> | undefined;
  const autoReef = breakdown.autoReef as Record<string, unknown> | undefined;

  // Count cage climbs by type
  const robots = [
    breakdown.endGameRobot1 as string,
    breakdown.endGameRobot2 as string,
    breakdown.endGameRobot3 as string,
  ];
  const shallowCount = robots.filter(r => r === 'ShallowCage').length;
  const deepCount = robots.filter(r => r === 'DeepCage').length;

  return {
    // Main scoring categories
    total_points: (breakdown.totalPoints as number) ?? null,
    auto_points: (breakdown.autoPoints as number) ?? null,
    teleop_points: (breakdown.teleopPoints as number) ?? null,
    endgame_points: (breakdown.endGameBargePoints as number) ?? null,

    // 2025 Reefscape - Coral scoring on reef
    // L1 = trough (lowest), L2 = bottom row, L3 = middle row, L4 = top row
    coral_L1: (teleopReef?.trough as number) ?? 0,
    coral_L2: (teleopReef?.tba_botRowCount as number) ?? 0,
    coral_L3: (teleopReef?.tba_midRowCount as number) ?? 0,
    coral_L4: (teleopReef?.tba_topRowCount as number) ?? 0,

    // 2025 Reefscape - Algae scoring (counts, not points)
    algae_barge: (breakdown.netAlgaeCount as number) ?? 0, // Net = barge algae count
    algae_processor: (breakdown.wallAlgaeCount as number) ?? 0, // Wall = processor algae count

    // 2025 Reefscape - Cage climb counts
    cage_shallow: shallowCount,
    cage_deep: deepCount,
  };
}

export default async function MatchDetailPage({ params }: MatchDetailPageProps) {
  const { matchKey } = await params;

  // Validate match key
  if (!matchKey || matchKey.trim() === '') {
    notFound();
  }

  // Use service layer to fetch data
  const matchService = getMatchService();
  const teamService = getTeamService();

  try {
    // Fetch match detail with teams and scouting data
    const matchDetail = await matchService.getMatchDetail(matchKey);

    if (!matchDetail) {
      notFound();
    }

    // Extract team numbers from the match
    const teamNumbers = [
      matchDetail.red_1,
      matchDetail.red_2,
      matchDetail.red_3,
      matchDetail.blue_1,
      matchDetail.blue_2,
      matchDetail.blue_3,
    ].filter((num): num is number => num !== null && num !== undefined);

    // Fetch team details in parallel
    const teamDetailsPromises = teamNumbers.map(async (teamNumber) => {
      const teamDetail: TeamDetail | null = await teamService.getTeamDetail(teamNumber);
      return teamDetail;
    });

    const teamDetailsArray = await Promise.all(teamDetailsPromises);

    // Create teams lookup object (TeamDetail extends Team)
    const teams: Record<number, Team> = {};
    teamDetailsArray.forEach((teamDetail: TeamDetail | null) => {
      if (teamDetail) {
        teams[teamDetail.team_number] = teamDetail;
      }
    });

    // Fetch recent matches for each team in parallel
    const recentMatchesPromises = teamNumbers.map(async (teamNumber) => {
      const matches = await matchService.getTeamRecentMatches(teamNumber, 5);

      // Enrich each match with alliance, scores, and result
      const enriched: EnrichedRecentMatch[] = matches.map((match) => {
        // Determine which alliance the team was on
        const isRed = [match.red_1, match.red_2, match.red_3].includes(teamNumber);
        const alliance = isRed ? 'red' as const : 'blue' as const;

        // Get scores
        const score = isRed ? (match.red_score ?? 0) : (match.blue_score ?? 0);
        const opponent_score = isRed ? (match.blue_score ?? 0) : (match.red_score ?? 0);

        // Determine result
        let result: 'W' | 'L' | 'T' | '-' = '-';
        if (match.red_score !== null && match.blue_score !== null) {
          if (score > opponent_score) result = 'W';
          else if (score < opponent_score) result = 'L';
          else result = 'T';
        }

        return {
          ...match,
          alliance,
          score,
          opponent_score,
          result,
        };
      });

      return { teamNumber, matches: enriched };
    });

    const recentMatchesArray = await Promise.all(recentMatchesPromises);

    // Create recent matches lookup object
    const recentMatches: Record<number, EnrichedRecentMatch[]> = {};
    recentMatchesArray.forEach(({ teamNumber, matches }) => {
      recentMatches[teamNumber] = matches;
    });

    // Extract videos from match data (TBA format)
    const videos = matchDetail.videos || [];

    // Extract and transform score breakdown from TBA (camelCase to snake_case)
    const scoreBreakdown: {
      red: Record<string, number | null> | null;
      blue: Record<string, number | null> | null;
    } = {
      red: transformScoreBreakdown(
        (matchDetail.score_breakdown?.red as Record<string, unknown>) || null
      ),
      blue: transformScoreBreakdown(
        (matchDetail.score_breakdown?.blue as Record<string, unknown>) || null
      ),
    };

    return (
      <MatchDetailClient
        match={matchDetail}
        teams={teams}
        recentMatches={recentMatches}
        videos={videos}
        scoreBreakdown={scoreBreakdown}
      />
    );
  } catch (error) {
    console.error('Error fetching match detail:', error);
    notFound();
  }
}
