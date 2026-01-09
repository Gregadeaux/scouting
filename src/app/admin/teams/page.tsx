'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Team } from '@/types';
import { Column, PaginationConfig } from '@/types/admin';
import { DataTable } from '@/components/admin/DataTable';
import { SearchBar } from '@/components/admin/SearchBar';
import { ActionButtons } from '@/components/admin/ActionButtons';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/admin/Toast';

export default function TeamsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState<PaginationConfig>({
    page: 1,
    limit: 20,
    total: 0,
  });
  const [sortBy, setSortBy] = useState<string>('team_number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: (pagination.limit || 20).toString(),
        sortBy,
        sortOrder,
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`/api/admin/teams?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTeams(data.data);
        setPagination((prev) => ({ ...prev, total: data.pagination.total }));
      } else {
        showToast('error', 'Failed to fetch teams');
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      showToast('error', 'An error occurred while fetching teams');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, sortBy, sortOrder, searchQuery, showToast]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(direction);
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleDelete = async (teamNumber: number) => {
    try {
      const response = await fetch(`/api/admin/teams/${teamNumber}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('success', 'Team deleted successfully');
        fetchTeams();
      } else {
        const error = await response.json();
        showToast('error', error.error || 'Failed to delete team');
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      showToast('error', 'An error occurred while deleting the team');
    }
  };

  const handleRowClick = (team: Team) => {
    router.push(`/admin/teams/${team.team_number}`);
  };

  const columns: Column<Team>[] = [
    {
      key: 'team_number',
      header: 'Number',
      sortable: true,
      render: (value) => (
        <span className="font-mono font-semibold text-frc-blue">{String(value)}</span>
      ),
    },
    {
      key: 'team_name',
      header: 'Name',
      sortable: true,
      render: (value) => (
        <span className="font-medium text-gray-900 dark:text-gray-100">{String(value)}</span>
      ),
    },
    {
      key: 'team_nickname',
      header: 'Nickname',
      render: (value) => (value ? String(value) : '-'),
    },
    {
      key: 'city',
      header: 'Location',
      render: (value, row) => {
        const location = [row.city, row.state_province, row.country]
          .filter(Boolean)
          .join(', ');
        return location || '-';
      },
    },
    {
      key: 'rookie_year',
      header: 'Rookie Year',
      sortable: true,
      render: (value) => (value ? String(value) : '-'),
    },
    {
      key: 'team_number',
      header: 'Actions',
      render: (value) => (
        <div onClick={(e) => e.stopPropagation()}>
          <ActionButtons
            onEdit={() => router.push(`/admin/teams/${Number(value)}/edit`)}
            onDelete={() => handleDelete(Number(value))}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Teams</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage FRC teams
          </p>
        </div>
        <Link href="/admin/teams/new">
          <Button>
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
            Add Team
          </Button>
        </Link>
      </div>

      {/* Search */}
      <SearchBar
        onSearch={handleSearch}
        placeholder="Search teams by number, name, or location..."
      />

      {/* Table */}
      <DataTable
        columns={columns}
        data={teams}
        loading={loading}
        pagination={pagination}
        onSort={handleSort}
        onPageChange={handlePageChange}
        onRowClick={handleRowClick}
        emptyMessage="No teams found. Add your first team to get started."
      />
    </div>
  );
}
