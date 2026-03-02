import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { successResponse, errorResponse, sanitizedErrorResponse } from '@/lib/api/response';
import {
  extractAllianceBreakdown,
  getTeamTowerLevel,
  towerLevelToPoints,
  extractHubCounts,
  type TowerLevel,
} from '@/types/tba-score-breakdown-2026';

interface RouteParams {
  params: Promise<{
    teamNumber: string;
  }>;
}

function getAllianceTeams(
  match: Record<string, unknown>,
  alliance: 'red' | 'blue'
): [unknown, unknown, unknown] {
  return alliance === 'red'
    ? [match.red_1, match.red_2, match.red_3]
    : [match.blue_1, match.blue_2, match.blue_3];
}

function findRobotPosition(
  teams: [unknown, unknown, unknown],
  teamNumber: number
): 1 | 2 | 3 {
  if (teams[0] === teamNumber) return 1;
  if (teams[1] === teamNumber) return 2;
  return 3;
}

function determineResult(
  allianceScore: number | null,
  opponentScore: number | null
): 'W' | 'L' | 'T' | null {
  if (allianceScore == null || opponentScore == null) return null;
  if (allianceScore > opponentScore) return 'W';
  if (allianceScore < opponentScore) return 'L';
  return 'T';
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<Response> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return errorResponse('Unauthorized', 401);
  }

  const { teamNumber: teamNumberStr } = await params;
  const teamNumber = parseInt(teamNumberStr, 10);
  if (isNaN(teamNumber)) {
    return errorResponse('Invalid team number', 400);
  }

  const eventKey = request.nextUrl.searchParams.get('eventKey');
  if (!eventKey) {
    return errorResponse('eventKey query parameter is required', 400);
  }

  const { data: matches, error: matchError } = await supabase
    .from('match_schedule')
    .select('*')
    .eq('event_key', eventKey)
    .order('match_number', { ascending: true });

  if (matchError) {
    return sanitizedErrorResponse(matchError, 'fetch_team_matches');
  }

  if (matches.length === 0) {
    return successResponse({ teamNumber, eventKey, matches: [], stats: null });
  }

  const isTeamInMatch = (m: Record<string, unknown>): boolean =>
    m.red_1 === teamNumber ||
    m.red_2 === teamNumber ||
    m.red_3 === teamNumber ||
    m.blue_1 === teamNumber ||
    m.blue_2 === teamNumber ||
    m.blue_3 === teamNumber;

  const matchHistory = matches.filter(isTeamInMatch).map((match) => {
    const isRed =
      match.red_1 === teamNumber ||
      match.red_2 === teamNumber ||
      match.red_3 === teamNumber;
    const alliance: 'red' | 'blue' = isRed ? 'red' : 'blue';
    const teams = getAllianceTeams(match, alliance);
    const robotPosition = findRobotPosition(teams, teamNumber);
    const partners = (teams as number[]).filter((t) => t && t !== teamNumber);

    const allianceScore = alliance === 'red' ? match.red_score : match.blue_score;
    const opponentScore = alliance === 'red' ? match.blue_score : match.red_score;

    const scoreBreakdown = match.score_breakdown as Record<string, unknown> | null;
    const breakdown = scoreBreakdown
      ? extractAllianceBreakdown(scoreBreakdown, alliance)
      : null;

    let autoTowerLevel: TowerLevel | null = null;
    let endgameTowerLevel: TowerLevel | null = null;
    let autoTowerPoints = 0;
    let endgameTowerPoints = 0;
    let hubCounts: Record<string, number> | null = null;
    let allianceAutoPoints: number | null = null;
    let allianceTeleopPoints: number | null = null;
    let allianceEndgamePoints: number | null = null;

    if (breakdown) {
      autoTowerLevel = getTeamTowerLevel(breakdown, robotPosition, 'auto');
      endgameTowerLevel = getTeamTowerLevel(breakdown, robotPosition, 'endgame');
      autoTowerPoints = towerLevelToPoints(autoTowerLevel, 'auto');
      endgameTowerPoints = towerLevelToPoints(endgameTowerLevel, 'endgame');
      hubCounts = extractHubCounts(breakdown);
      allianceAutoPoints = breakdown.totalAutoPoints ?? null;
      allianceTeleopPoints = breakdown.totalTeleopPoints ?? null;
      allianceEndgamePoints = breakdown.endGameTowerPoints ?? null;
    }

    return {
      matchKey: match.match_key,
      matchNumber: match.match_number,
      compLevel: match.comp_level,
      setNumber: match.set_number ?? 1,
      alliance,
      robotPosition,
      partners,
      allianceScore,
      opponentScore,
      result: determineResult(allianceScore, opponentScore),
      autoTowerLevel,
      endgameTowerLevel,
      autoTowerPoints,
      endgameTowerPoints,
      hubCounts,
      allianceAutoPoints,
      allianceTeleopPoints,
      allianceEndgamePoints,
    };
  });

  const { data: statsRow } = await supabase
    .from('team_statistics')
    .select('auto_opr, teleop_hub_opr, endgame_opr, total_hub_opr, opr, avg_total_score, avg_auto_score, avg_teleop_score, avg_endgame_score')
    .eq('team_number', teamNumber)
    .eq('event_key', eventKey)
    .maybeSingle();

  return successResponse({
    teamNumber,
    eventKey,
    matches: matchHistory,
    stats: statsRow ?? null,
  });
}
