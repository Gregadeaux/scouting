'use client';

import React from 'react';
import { Column, PaginationConfig } from '@/types/admin';
import {
  ScouterWithUser,
  ExperienceLevel,
  Certification,
  CERTIFICATION_LABELS,
} from '@/types/scouter';
import { DataTable } from '@/components/admin/DataTable';
import { ActionButtons } from '@/components/admin/ActionButtons';

interface ScoutersTableProps {
  scouters: ScouterWithUser[];
  loading: boolean;
  pagination: PaginationConfig;
  onSort: (key: string, direction: 'asc' | 'desc') => void;
  onPageChange: (page: number) => void;
  onEdit: (scouter: ScouterWithUser) => void;
  onDelete: (scouterId: string) => void;
}

export function ScoutersTable({
  scouters,
  loading,
  pagination,
  onSort,
  onPageChange,
  onEdit,
  onDelete,
}: ScoutersTableProps) {
  // Experience level color coding
  const getExperienceLevelBadge = (level: ExperienceLevel) => {
    const colors = {
      rookie: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      intermediate: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      veteran: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    };

    const labels = {
      rookie: 'Rookie',
      intermediate: 'Intermediate',
      veteran: 'Veteran',
    };

    return (
      <span
        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${colors[level]}`}
      >
        {labels[level]}
      </span>
    );
  };

  // Certification badges
  const getCertificationBadges = (certifications: Certification[]) => {
    if (!certifications || certifications.length === 0) {
      return <span className="text-gray-400 text-sm">None</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {certifications.slice(0, 3).map((cert) => (
          <span
            key={cert}
            className="inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-900 dark:text-purple-200"
          >
            {CERTIFICATION_LABELS[cert]}
          </span>
        ))}
        {certifications.length > 3 && (
          <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            +{certifications.length - 3} more
          </span>
        )}
      </div>
    );
  };

  const columns: Column<ScouterWithUser>[] = [
    {
      key: 'display_name',
      header: 'Name',
      sortable: true,
      render: (value, row) => {
        const displayName = row.display_name || row.full_name || row.email;
        return (
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {displayName}
            </div>
            {row.team_number && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Team {row.team_number}
                {row.team_nickname && ` - ${row.team_nickname}`}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'experience_level',
      header: 'Experience',
      sortable: true,
      render: (value) => getExperienceLevelBadge(value as ExperienceLevel),
    },
    {
      key: 'certifications',
      header: 'Certifications',
      render: (value) => getCertificationBadges(value as Certification[]),
    },
    {
      key: 'total_matches_scouted',
      header: 'Matches Scouted',
      sortable: true,
      render: (value) => (
        <div className="text-center">
          <span className="text-lg font-semibold text-frc-blue dark:text-blue-400">
            {value as number}
          </span>
        </div>
      ),
    },
    {
      key: 'total_events_attended',
      header: 'Events',
      sortable: true,
      render: (value) => (
        <div className="text-center">
          <span className="text-lg font-semibold text-frc-blue dark:text-blue-400">
            {value as number}
          </span>
        </div>
      ),
    },
    {
      key: 'preferred_role',
      header: 'Preferred Role',
      render: (value) => {
        if (!value) {
          return <span className="text-gray-400 text-sm">No preference</span>;
        }

        const roleLabels: Record<string, string> = {
          match_scouting: 'Match',
          pit_scouting: 'Pit',
          both: 'Both',
        };

        const roleColors: Record<string, string> = {
          match_scouting: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          pit_scouting: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
          both: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        };

        return (
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
              roleColors[value as string]
            }`}
          >
            {roleLabels[value as string]}
          </span>
        );
      },
    },
    {
      key: 'id',
      header: 'Actions',
      render: (value, row) => (
        <ActionButtons
          onEdit={() => onEdit(row)}
          onDelete={() => onDelete(String(value))}
          deleteMessage={`Are you sure you want to remove ${
            row.display_name || row.full_name || row.email
          } as a scouter? This will not delete their user account.`}
        />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={scouters}
      loading={loading}
      pagination={pagination}
      onSort={onSort}
      onPageChange={onPageChange}
      emptyMessage="No scouters found. Add your first scouter to get started."
    />
  );
}
