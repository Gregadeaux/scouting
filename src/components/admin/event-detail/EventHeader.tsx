'use client';

import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { ReactNode } from 'react';

interface EventHeaderProps {
  event: {
    event_key: string;
    event_name: string;
    event_code: string;
    year: number;
    start_date: string;
    end_date: string;
    city?: string;
    state_province?: string;
    country?: string;
    event_type: string;
    district?: string;
    week?: number;
    website?: string;
  };
  actions?: ReactNode;
}

export function EventHeader({ event, actions }: EventHeaderProps) {
  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const isOngoing = new Date() >= startDate && new Date() <= endDate;
  const isPast = new Date() > endDate;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h1 className="text-3xl font-bold">{event.event_name}</h1>
            {isOngoing && <Badge variant="success">Live</Badge>}
            {isPast && <Badge variant="secondary">Completed</Badge>}
            {!isOngoing && !isPast && <Badge variant="default">Upcoming</Badge>}
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {event.event_code} • {event.year}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3 shrink-0">
          <div className="flex gap-2 flex-wrap justify-end">
            <Badge variant="outline">{event.event_type}</Badge>
            {event.district && <Badge variant="outline">{event.district}</Badge>}
            {event.week !== null && event.week !== undefined && (
              <Badge variant="outline">Week {event.week + 1}</Badge>
            )}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>
            {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span>
            {event.city}, {event.state_province}, {event.country}
          </span>
        </div>
        {event.website && (
          <Link
            href={event.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:underline"
          >
            <LinkIcon className="h-4 w-4" />
            <span>Event Website</span>
          </Link>
        )}
      </div>
    </div>
  );
}
