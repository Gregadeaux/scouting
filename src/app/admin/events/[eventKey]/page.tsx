import { notFound } from 'next/navigation';
import { getEventService } from '@/lib/services';
import { EventDetailClient } from './EventDetailClient';

interface EventDetailPageProps {
  params: Promise<{
    eventKey: string;
  }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { eventKey } = await params;

  let eventDetail;
  try {
    const eventService = getEventService();
    eventDetail = await eventService.getEventDetail(eventKey);
  } catch (error) {
    console.error('[Page] Error fetching event detail:', error);
    notFound();
  }

  return <EventDetailClient eventKey={eventKey} initialData={eventDetail} />;
}
