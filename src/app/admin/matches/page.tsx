'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export default function MatchesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Matches</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage match schedules
          </p>
        </div>
        <Link href="/admin/matches/new">
          <Button disabled>
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Create Match
          </Button>
        </Link>
      </div>

      {/* Coming Soon Card */}
      <Card>
        <CardContent className="flex min-h-[400px] flex-col items-center justify-center text-center">
          <svg
            className="mb-4 h-16 w-16 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Matches Management Coming Soon
          </h2>
          <p className="mb-6 max-w-md text-gray-600 dark:text-gray-400">
            Match schedule management will allow you to create and manage qualification and playoff matches,
            assign teams to alliances, and track match results.
          </p>
          <div className="space-y-2 text-left">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Planned Features:</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>Create and edit match schedules</li>
              <li>Assign teams to red and blue alliances</li>
              <li>Filter matches by event and type</li>
              <li>Import match schedules from The Blue Alliance</li>
              <li>Track match completion status</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
