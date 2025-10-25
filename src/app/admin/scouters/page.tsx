'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export default function ScoutersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Scouters</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage scout users
          </p>
        </div>
        <Link href="/admin/scouters/new">
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
            Add Scouter
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
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Scouters Management Coming Soon
          </h2>
          <p className="mb-6 max-w-md text-gray-600 dark:text-gray-400">
            Scouter management will allow you to register and manage scout users,
            assign roles, and track their activity.
          </p>
          <div className="space-y-2 text-left">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Planned Features:</h3>
            <ul className="list-inside list-disc space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>Register new scout users</li>
              <li>Assign roles (lead, scout, admin)</li>
              <li>Manage contact information</li>
              <li>Toggle active/inactive status</li>
              <li>Filter by team affiliation</li>
              <li>Track scouting activity by user</li>
            </ul>
          </div>
          <div className="mt-6 rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> The <code>scouters</code> table needs to be created in Supabase.
              See /docs/features/admin/implementation.md for the schema.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
