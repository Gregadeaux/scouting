'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useScouterEvent } from '@/contexts/ScouterEventContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { selectedEventKey, events, isLoading, error, setSelectedEvent } = useScouterEvent();

  function handleEventChange(eventKey: string): void {
    if (eventKey === '__none__') {
      setSelectedEvent(null);
      return;
    }
    const event = events.find((e) => e.event_key === eventKey);
    setSelectedEvent(event ?? null);
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-100 mb-6">Settings</h1>

      {/* Event Selection */}
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-5 mb-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-3">Event</h2>

        {error && (
          <p className="mb-3 text-sm text-red-400">Failed to load events: {error.message}</p>
        )}

        <Select
          value={selectedEventKey ?? '__none__'}
          onValueChange={handleEventChange}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">No event selected</SelectItem>
            {events.map((event) => (
              <SelectItem key={event.event_key} value={event.event_key}>
                {event.event_name} — {formatDate(event.start_date)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isLoading && (
          <p className="mt-2 text-sm text-slate-400">Loading events...</p>
        )}

        {selectedEventKey && (
          <p className="mt-3 text-sm text-cyan-400">
            Active event saved. It will be used in Pit Scouting and Match Scouting.
          </p>
        )}
      </section>

      {/* Profile Info */}
      <section className="rounded-lg border border-slate-800 bg-slate-900 p-5 mb-6">
        <h2 className="text-lg font-semibold text-gray-100 mb-3">Profile</h2>

        <dl className="space-y-2 text-sm">
          {user?.profile?.full_name && (
            <div className="flex justify-between">
              <dt className="text-slate-400">Name</dt>
              <dd className="text-gray-200">{user.profile.full_name}</dd>
            </div>
          )}
          {user?.profile?.primary_team_number && (
            <div className="flex justify-between">
              <dt className="text-slate-400">Team</dt>
              <dd className="text-gray-200">{user.profile.primary_team_number}</dd>
            </div>
          )}
          {user?.profile?.role && (
            <div className="flex justify-between">
              <dt className="text-slate-400">Role</dt>
              <dd>
                <span className="inline-flex items-center rounded-full bg-cyan-900/40 px-2.5 py-0.5 text-xs font-medium text-cyan-300 ring-1 ring-inset ring-cyan-800">
                  {user.profile.role}
                </span>
              </dd>
            </div>
          )}
          {user?.auth?.email && (
            <div className="flex justify-between">
              <dt className="text-slate-400">Email</dt>
              <dd className="text-gray-200 truncate ml-4">{user.auth.email}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Sign Out */}
      <section className="rounded-lg border border-red-900/50 bg-slate-900 p-5">
        <h2 className="text-lg font-semibold text-gray-100 mb-3">Account</h2>
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => signOut()}
        >
          Sign Out
        </Button>
      </section>
    </div>
  );
}
