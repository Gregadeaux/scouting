'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { Event } from '@/types';

export default function DashboardPage() {
  const { user, isAuthenticated, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (!loading && user) {
      // Redirect users to their role-specific pages
      if (isAdmin) {
        router.push('/admin');
      } else if (user.profile.role === 'scouter') {
        // Scouters should go directly to pit-scouting
        router.push('/pit-scouting');
      }
      // Mentors stay on dashboard and see events
    } else if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [loading, isAuthenticated, isAdmin, user, router]);

  // Fetch events for mentors
  useEffect(() => {
    if (user && user.profile.role === 'mentor') {
      const fetchEvents = async () => {
        setEventsLoading(true);
        try {
          const params = new URLSearchParams({
            year: selectedYear.toString(),
            limit: '100',
          });
          const response = await fetch(`/api/admin/events?${params}`);
          if (response.ok) {
            const data = await response.json();
            setEvents(data.data || []);
          }
        } catch (error) {
          console.error('Error fetching events:', error);
        } finally {
          setEventsLoading(false);
        }
      };
      fetchEvents();
    }
  }, [user, selectedYear]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-frc-blue mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render for admins or scouters (they get redirected)
  if (!user || isAdmin || user.profile.role === 'scouter') {
    return null;
  }

  // For mentors, show events dashboard
  if (user?.profile.role === 'mentor') {
    const availableYears = [2025, 2024, 2023];

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Mentor Dashboard
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Welcome, {user.profile.full_name || user.profile.email}!
            </p>
          </div>

          {/* Year Filter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Season Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Events Grid */}
          {eventsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-frc-blue mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading events...</p>
            </div>
          ) : events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <Link key={event.event_key} href={`/admin/events/${event.event_key}`}>
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{event.event_name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <p className="text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Location:</span>{' '}
                          {[event.city, event.state_province].filter(Boolean).join(', ')}
                        </p>
                        {event.start_date && (
                          <p className="text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Date:</span>{' '}
                            {new Date(event.start_date).toLocaleDateString()}
                            {event.end_date && event.end_date !== event.start_date && (
                              <> - {new Date(event.end_date).toLocaleDateString()}</>
                            )}
                          </p>
                        )}
                        {event.week !== null && event.week !== undefined && (
                          <p className="text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Week:</span> {event.week + 1}
                          </p>
                        )}
                        <div className="pt-2">
                          <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {event.event_type}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
              <p className="text-gray-600 dark:text-gray-400">
                No events found for {selectedYear}.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // For non-mentor users (generic dashboard)
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Welcome to FRC Scouting System
          </h1>

          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-400">
              Hello, {user?.profile.full_name || user?.profile.email}!
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              Role: <span className="font-medium">{user?.profile.role}</span>
              {user?.profile.primary_team_number && (
                <> | Team: <span className="font-medium">{user.profile.primary_team_number}</span></>
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Scout Matches
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Record match data for teams during competitions.
              </p>
              <Button variant="primary" size="sm" onClick={() => router.push('/scouting')}>
                Start Scouting
              </Button>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                View Analytics
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Analyze team performance and statistics.
              </p>
              <Button variant="primary" size="sm" onClick={() => router.push('/analytics')}>
                View Analytics
              </Button>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                My Profile
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Update your profile and preferences.
              </p>
              <Button variant="secondary" size="sm" onClick={() => router.push('/profile')}>
                Edit Profile
              </Button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button variant="secondary" onClick={() => router.push('/auth/logout')}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}