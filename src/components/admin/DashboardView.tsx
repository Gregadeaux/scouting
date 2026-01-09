'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { DashboardStats } from '@/types/admin';
import {
  Users,
  Calendar,
  Trophy,
  ShieldCheck,
  PlusCircle,
  UserPlus,
  ClipboardList,
  Activity,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardViewProps {
  stats: DashboardStats;
}

export function DashboardView({ stats }: DashboardViewProps) {
  const statCards = [
    {
      title: 'Total Teams',
      value: stats?.totalTeams || 0,
      icon: <Users className="h-8 w-8" />,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      link: '/admin/teams',
    },
    {
      title: 'Total Events',
      value: stats?.totalEvents || 0,
      icon: <Calendar className="h-8 w-8" />,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      link: '/admin/events',
    },
    {
      title: 'Total Matches',
      value: stats?.totalMatches || 0,
      icon: <Trophy className="h-8 w-8" />,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
      link: '/admin/matches',
    },
    {
      title: 'Active Scouters',
      value: stats?.activeScouters || 0,
      icon: <ShieldCheck className="h-8 w-8" />,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
      link: '/admin/scouters',
    },
  ];

  const quickActions = [
    {
      title: 'Create Event',
      description: 'Add a new FRC event to the system',
      icon: <PlusCircle className="h-6 w-6" />,
      link: '/admin/events/new',
    },
    {
      title: 'Add Team',
      description: 'Register a new team in the database',
      icon: <Users className="h-6 w-6" />,
      link: '/admin/teams/new',
    },
    {
      title: 'Add Scouter',
      description: 'Register a new scout user',
      icon: <UserPlus className="h-6 w-6" />,
      link: '/admin/scouters/new',
    },
    {
      title: 'View Scouting Data',
      description: 'Browse and manage scouting entries',
      icon: <ClipboardList className="h-6 w-6" />,
      link: '/admin/scouting',
    },
  ];

  const activityConfig = {
    team_created: {
      icon: <Users className="h-5 w-5" />,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    },
    event_created: {
      icon: <Calendar className="h-5 w-5" />,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
    },
    match_scheduled: {
      icon: <Trophy className="h-5 w-5" />,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    },
    match_scouted: {
      icon: <ClipboardList className="h-5 w-5" />,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    },
    user_created: {
      icon: <UserPlus className="h-5 w-5" />,
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-100 dark:bg-teal-900/20',
    },
    user_updated: {
      icon: <UserPlus className="h-5 w-5" />,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/20',
    },
    user_role_changed: {
      icon: <ShieldCheck className="h-5 w-5" />,
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-100 dark:bg-pink-900/20',
    },
    user_deleted: {
      icon: <Users className="h-5 w-5" />,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
    },
  };

  return (
    <div className="space-y-8 animate-in fade-in-50">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Dashboard Overview
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Welcome to the FRC Scouting System admin dashboard
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.link}>
            <Card hoverable className="h-full transition-all hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-6">
                <div className={cn("rounded-lg p-3", stat.bgColor)}>
                  <div className={stat.color}>{stat.icon}</div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold">
                    {stat.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-xl font-semibold tracking-tight">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.link}>
              <Card hoverable className="h-full transition-all hover:shadow-md">
                <CardContent className="flex flex-col items-center text-center p-6">
                  <div className="mb-4 rounded-full bg-primary/10 p-3 text-primary">
                    {action.icon}
                  </div>
                  <h3 className="mb-1 font-semibold">
                    {action.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {action.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Recent Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => {
                const config =
                  activityConfig[activity.type as keyof typeof activityConfig] ||
                  activityConfig.match_scouted;

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className={cn("rounded-lg p-2", config.bgColor)}>
                      <div className={config.color}>{config.icon}</div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(activity.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Activity className="h-8 w-8 mb-2 opacity-50" />
              <p>No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
