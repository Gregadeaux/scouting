'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';

export default function ScoutingDataPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Scouting Data</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          View and manage match scouting entries
        </p>
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Scouting Data Management Coming Soon
          </h2>
          <p className="mb-6 max-w-md text-gray-600 dark:text-gray-400">
            View, edit, and manage match scouting entries. Review JSONB performance data
            organized by autonomous, teleop, and endgame phases.
          </p>
          <div className="space-y-2 text-left">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Planned Features:</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>List all match scouting entries</li>
              <li>Filter by event, match, team, or scout</li>
              <li>View detailed JSONB data in organized sections</li>
              <li>Edit entries to correct mistakes</li>
              <li>Delete duplicate or erroneous entries</li>
              <li>Validate data against season schemas</li>
              <li>Export data to CSV/JSON</li>
            </ul>
          </div>
          <div className="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Implementation Note:</strong> This page will use the existing match_scouting
              table and the 2025 season types for JSONB field rendering.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
