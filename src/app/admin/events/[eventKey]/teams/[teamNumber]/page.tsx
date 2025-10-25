import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTeamService } from '@/lib/services';
import { canViewTeamDetails } from '@/lib/services/auth.service';
import TeamDetailClient from './TeamDetailClient';
import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ eventKey: string; teamNumber: string }>;
}): Promise<Metadata> {
  const { teamNumber } = await params;
  return {
    title: `Team ${teamNumber} Details`,
    description: `Detailed scouting information for Team ${teamNumber}`,
  };
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ eventKey: string; teamNumber: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  // Fetch user profile to check role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  // Check permissions
  if (!canViewTeamDetails(profile)) {
    // Return a 403 Forbidden page
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h1 className="text-2xl font-bold text-red-900 mb-2">Access Denied</h1>
            <p className="text-red-700">
              You don&apos;t have permission to view team details.
            </p>
            <a
              href="/dashboard"
              className="inline-block mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Parse params
  const { eventKey, teamNumber: teamNumberStr } = await params;
  const teamNumber = parseInt(teamNumberStr, 10);

  // Validate team number
  if (isNaN(teamNumber)) {
    redirect(`/admin/events/${eventKey}/teams`);
  }

  // Fetch team detail for mentor view
  const teamService = getTeamService();
  const teamDetail = await teamService.getTeamDetailForMentor(teamNumber, eventKey);

  // If no team found, show 404
  if (!teamDetail) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <h1 className="text-2xl font-bold text-yellow-900 mb-2">Team Not Found</h1>
            <p className="text-yellow-700 mb-4">
              Team {teamNumber} was not found at event {eventKey}.
            </p>
            <a
              href={`/admin/events/${eventKey}/teams`}
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Back to Teams
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <TeamDetailClient teamDetail={teamDetail} eventKey={eventKey} />;
}