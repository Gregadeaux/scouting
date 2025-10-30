import { notFound } from 'next/navigation';
import TeamDetailClient from './TeamDetailClient';
import { getAdminTeamService } from '@/lib/services';

interface TeamDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TeamDetailPage({ params }: TeamDetailPageProps) {
  const { id } = await params;
  const teamNumber = parseInt(id);

  // Validate team number
  if (isNaN(teamNumber) || teamNumber <= 0) {
    notFound();
  }

  // Use the service layer instead of direct Supabase queries
  const adminTeamService = getAdminTeamService();

  try {
    const { team, events, scouters } = await adminTeamService.getTeamDetailForAdmin(teamNumber);

    return (
      <TeamDetailClient
        team={team}
        events={events}
        scouters={scouters}
      />
    );
  } catch (error) {
    console.error('Error fetching team detail:', error);
    notFound();
  }
}
