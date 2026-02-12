'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  ChevronDown,
  Calendar,
  MapPin,
  Check,
  Search,
  Loader2,
  X,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEventContext, type EventSummary } from '@/contexts/EventContext';

function formatEventDate(startDate: string | null, endDate: string | null): string {
  if (!startDate) return 'No date';
  const start = new Date(startDate);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', options);

  if (endDate) {
    const end = new Date(endDate);
    const endStr = end.toLocaleDateString('en-US', options);
    return `${startStr} - ${endStr}`;
  }
  return startStr;
}

function formatLocation(city: string | null, state: string | null): string {
  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state) return state;
  return '';
}

function EventOptionCard({
  event,
  isSelected,
  onClick
}: {
  event: EventSummary;
  isSelected: boolean;
  onClick: () => void;
}) {
  const location = formatLocation(event.city, event.state_province);
  const dateStr = formatEventDate(event.start_date, event.end_date);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-3 rounded-lg transition-all duration-200",
        "border border-transparent",
        "hover:bg-slate-800/80 hover:border-slate-700",
        "focus:outline-none focus:ring-2 focus:ring-cyan-500/50",
        isSelected && "bg-gradient-to-r from-cyan-500/10 to-transparent border-cyan-500/30"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm truncate">
              {event.event_name}
            </span>
            {isSelected && (
              <Check className="h-4 w-4 text-cyan-400 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {dateStr}
            </span>
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {location}
              </span>
            )}
          </div>
        </div>
        <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
          {event.year}
        </span>
      </div>
    </button>
  );
}

export function EventSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedEvent, setSelectedEvent, events, isLoading } = useEventContext();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter events based on search
  const filteredEvents = events.filter(event => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      event.event_name.toLowerCase().includes(query) ||
      event.event_code.toLowerCase().includes(query) ||
      event.city?.toLowerCase().includes(query) ||
      event.state_province?.toLowerCase().includes(query)
    );
  });

  // Group events by year
  const eventsByYear = filteredEvents.reduce((acc, event) => {
    const year = event.year;
    if (!acc[year]) acc[year] = [];
    acc[year].push(event);
    return acc;
  }, {} as Record<number, EventSummary[]>);

  const years = Object.keys(eventsByYear).map(Number).sort((a, b) => b - a);

  const handleSelectEvent = (event: EventSummary) => {
    setSelectedEvent(event);
    setIsOpen(false);
    setSearchQuery('');
    // Navigate to the event page
    router.push(`/admin/events/${event.event_key}`);
  };

  const handleClearSelection = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setSelectedEvent(null);
    // Only navigate to events list if we're on an event-specific page
    if (pathname.includes('/events/') && pathname !== '/admin/events') {
      router.push('/admin/events');
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
          "border bg-gradient-to-br",
          selectedEvent
            ? "from-slate-800 to-slate-900 border-slate-700 hover:border-slate-600"
            : "from-slate-800/50 to-slate-900/50 border-dashed border-slate-700 hover:border-cyan-500/50 hover:from-slate-800 hover:to-slate-900",
          isOpen && "ring-2 ring-cyan-500/30 border-cyan-500/50"
        )}
      >
        {selectedEvent ? (
          <>
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-white truncate">
                {selectedEvent.event_name}
              </p>
              <p className="text-xs text-slate-400">
                {formatEventDate(selectedEvent.start_date, selectedEvent.end_date)}
              </p>
            </div>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleClearSelection(e);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  handleClearSelection(e);
                }
              }}
              className="p-1 rounded-md hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </span>
          </>
        ) : (
          <>
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-800 border border-dashed border-slate-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-slate-500" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-slate-400">Select Event</p>
              <p className="text-xs text-slate-500">Choose an event to focus</p>
            </div>
            <ChevronDown className={cn(
              "h-5 w-5 text-slate-400 transition-transform duration-300",
              isOpen && "rotate-180"
            )} />
          </>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className={cn(
          "absolute left-0 right-0 mt-2 z-50",
          "bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/50",
          "overflow-hidden",
          "animate-in fade-in-0 zoom-in-95 duration-200"
        )}>
          {/* Search Header */}
          <div className="p-3 border-b border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-10 pr-4 py-2 rounded-lg",
                  "bg-slate-800 border border-slate-700",
                  "text-sm text-white placeholder:text-slate-500",
                  "focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50",
                  "transition-all duration-200"
                )}
              />
            </div>
          </div>

          {/* Events List */}
          <div className="max-h-[320px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 text-cyan-500 animate-spin" />
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-400">
                  {searchQuery ? 'No events match your search' : 'No events available'}
                </p>
              </div>
            ) : (
              <div className="p-2">
                {years.map((year) => (
                  <div key={year} className="mb-2 last:mb-0">
                    <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {year} Season
                    </div>
                    <div className="space-y-0.5">
                      {eventsByYear[year].map((event) => (
                        <EventOptionCard
                          key={event.event_key}
                          event={event}
                          isSelected={selectedEvent?.event_key === event.event_key}
                          onClick={() => handleSelectEvent(event)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
