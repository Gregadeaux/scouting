'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';

export default function SeasonsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Seasons</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          View season configurations and game schemas
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
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Season Configuration Coming Soon
          </h2>
          <p className="mb-6 max-w-md text-gray-600 dark:text-gray-400">
            View season configurations including game information, JSON schemas for JSONB fields,
            and match timing parameters.
          </p>
          <div className="space-y-2 text-left">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Planned Features:</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>List all season configurations</li>
              <li>View season details and game information</li>
              <li>View JSON schemas in formatted code viewer</li>
              <li>Edit basic metadata (year, game name, description)</li>
              <li>View match duration settings</li>
              <li>Link to game manual and resources</li>
            </ul>
          </div>
          <div className="mt-6 rounded-lg bg-purple-50 p-4 dark:bg-purple-900">
            <p className="text-sm text-purple-800 dark:text-purple-200">
              <strong>Important:</strong> JSON schema editing should be done in code
              (src/types/season-YYYY.ts) to maintain type safety. The admin UI will be
              read-only for schemas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
