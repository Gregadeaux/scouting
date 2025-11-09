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
 * Transform TBA score breakdown from camelCase to snake_case
 * TBA API returns fields like totalPoints, autoPoints, etc.
 * Our component expects total_points, auto_points, etc.
 */
function transformScoreBreakdown(
  breakdown: Record<string, unknown> | null
): Record<string, number | null> | null {
  if (!breakdown) return null;

  return {
    // Main scoring categories
    total_points: (breakdown.totalPoints as number) ?? null,
    auto_points: (breakdown.autoPoints as number) ?? null,
    teleop_points: (breakdown.teleopPoints as number) ?? null,
    endgame_points: (breakdown.endgamePoints as number) ?? null,

    // 2025 Reefscape - Coral scoring (L1-L4)
    coral_L1: (breakdown.coralLevel1 as number) ?? null,
    coral_L2: (breakdown.coralLevel2 as number) ?? null,
    coral_L3: (breakdown.coralLevel3 as number) ?? null,
    coral_L4: (breakdown.coralLevel4 as number) ?? null,

    // 2025 Reefscape - Algae scoring
    algae_barge: (breakdown.algaeBarge as number) ?? null,
    algae_processor: (breakdown.algaeProcessor as number) ?? null,

    // 2025 Reefscape - Cage climb
    cage_shallow: (breakdown.cageShallow as number) ?? null,
    cage_deep: (breakdown.cageDeep as number) ?? null,
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
