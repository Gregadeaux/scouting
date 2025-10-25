'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ArrowLeft, Calendar, Users, Shield, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import type { Team } from '@/types';

interface TeamEvent {
  event_key: string;
  event_name: string;
  event_code: string;
  year: number;
  event_type: string;
  district: string | null;
  week: number | null;
  city: string | null;
  state_province: string | null;
  country: string | null;
  start_date: string;
  end_date: string;
  team_registered_at: string;
}

interface TeamScouter {
  membership_id: string;
  team_role: string;
  can_submit_data: boolean;
  can_view_analytics: boolean;
  can_manage_team: boolean;
  is_active: boolean;
  joined_at: string;
  left_at: string | null;
  user: {
    id: string;
    email: string;
    full_name: string | null;
    display_name: string | null;
    role: string;
    preferred_scout_name: string | null;
    is_active: boolean;
    email_verified: boolean;
    onboarding_completed: boolean;
    training_completed_at: string | null;
    last_login_at: string | null;
    created_at: string;
  };
}

interface TeamDetailClientProps {
  team: Team;
  events: TeamEvent[];
  scouters: TeamScouter[];
}

export default function TeamDetailClient({ team, events, scouters }: TeamDetailClientProps) {
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format event type
  const formatEventType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get event type badge color
  const getEventTypeBadge = (type: string) => {
    const colorMap: Record<string, string> = {
      regional: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      district: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      district_championship: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      championship_subdivision: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      championship: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      offseason: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return colorMap[type] || colorMap.offseason;
  };

  // Get role badge color
  const getRoleBadge = (role: string) => {
    const colorMap: Record<string, string> = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      mentor: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      scouter: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    };
    return colorMap[role] || colorMap.scouter;
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <Link href="/admin/teams">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Teams
          </Button>
        </Link>
      </div>

      {/* Team Header */}
      <Card>
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Team {team.team_number}
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 mt-1">
                {team.team_name}
              </p>
              {team.team_nickname && (
                <p className="text-lg text-gray-500 dark:text-gray-500 mt-1">
                  &quot;{team.team_nickname}&quot;
                </p>
              )}
            </div>
            <div className="text-right">
              <Link href={`/admin/teams/${team.team_number}/edit`}>
                <Button variant="primary" size="sm">
                  Edit Team
                </Button>
              </Link>
            </div>
          </div>

          {/* Team Details */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {team.city && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                <p className="text-base text-gray-900 dark:text-gray-100">
                  {team.city}
                  {team.state_province && `, ${team.state_province}`}
                  {team.country && team.country !== 'USA' && ` (${team.country})`}
                </p>
              </div>
            )}
            {team.rookie_year && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Rookie Year</p>
                <p className="text-base text-gray-900 dark:text-gray-100">{team.rookie_year}</p>
              </div>
            )}
            {team.website && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Website</p>
                <a
                  href={team.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {team.website}
                </a>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Events Section */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Events ({events.length})
            </h2>
          </div>

          {events.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No events found for this team.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Event
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Location
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => (
                    <tr
                      key={event.event_key}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {event.event_name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {event.event_code} • {event.year}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getEventTypeBadge(
                            event.event_type
                          )}`}
                        >
                          {formatEventType(event.event_type)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {event.city}
                        {event.state_province && `, ${event.state_province}`}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {formatDate(event.start_date)}
                        {event.start_date !== event.end_date &&
                          ` - ${formatDate(event.end_date)}`}
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/admin/events/${event.event_key}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Scouters Section */}
      <Card>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <Users className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Team Members ({scouters.length})
            </h2>
          </div>

          {scouters.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No scouters found for this team.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Role
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Permissions
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scouters.map((scouter) => (
                    <tr
                      key={scouter.membership_id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {scouter.user.display_name || scouter.user.full_name || 'N/A'}
                          </p>
                          {scouter.user.preferred_scout_name && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Scout name: {scouter.user.preferred_scout_name}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {scouter.user.email}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadge(
                            scouter.user.role
                          )}`}
                        >
                          {scouter.user.role.charAt(0).toUpperCase() +
                            scouter.user.role.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {scouter.can_submit_data && (
                            <span
                              className="text-xs text-gray-600 dark:text-gray-400"
                              title="Can submit data"
                            >
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </span>
                          )}
                          {scouter.can_view_analytics && (
                            <span
                              className="text-xs text-gray-600 dark:text-gray-400"
                              title="Can view analytics"
                            >
                              <Shield className="h-4 w-4 text-blue-500" />
                            </span>
                          )}
                          {scouter.can_manage_team && (
                            <span
                              className="text-xs text-gray-600 dark:text-gray-400"
                              title="Can manage team"
                            >
                              <Users className="h-4 w-4 text-purple-500" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {scouter.is_active && scouter.user.is_active ? (
                          <StatusBadge status="active" />
                        ) : (
                          <StatusBadge status="inactive" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {formatDate(scouter.joined_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
