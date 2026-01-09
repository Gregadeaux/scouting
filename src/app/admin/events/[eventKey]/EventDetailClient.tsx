'use client';

import { useRouter } from 'next/navigation';
import { EventHeader } from '@/components/admin/event-detail/EventHeader';
import { ScoutingCoverageWidget } from '@/components/admin/event-detail/ScoutingCoverageWidget';
import { EventTeamRoster } from '@/components/admin/event-detail/EventTeamRoster';
import { EventMatchSchedule } from '@/components/admin/event-detail/EventMatchSchedule';
import { TBAImportButton } from '@/components/admin/event-detail/TBAImportButton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { EventDetail } from '@/types/event-detail';
import { RoleBasedWrapper } from '@/components/common/RoleBasedWrapper';

interface EventDetailClientProps {
  eventKey: string;
  initialData: EventDetail;
}

export function EventDetailClient({ eventKey, initialData }: EventDetailClientProps) {
  const router = useRouter();

  const handleImportComplete = () => {
    // Refresh the page data after import completes
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link href="/admin/events">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Button>
        </Link>
      </div>

      {/* Event Header with Import Button */}
      <EventHeader
        event={initialData.event}
        actions={
          <RoleBasedWrapper allowedRoles={['admin']}>
            <TBAImportButton eventKey={eventKey} onImportComplete={handleImportComplete} />
          </RoleBasedWrapper>
        }
      />

      {/* Coverage Stats */}
      <ScoutingCoverageWidget stats={initialData.coverage} />

      {/* Teams Roster */}
      <EventTeamRoster teams={initialData.teams} eventKey={eventKey} />

      {/* Match Schedule */}
      <EventMatchSchedule matches={initialData.matches} />
    </div>
  );
}
