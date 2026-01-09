'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Event } from '@/types';
import { Column, PaginationConfig } from '@/types/admin';
import { DataTable } from '@/components/admin/DataTable';
import { SearchBar } from '@/components/admin/SearchBar';
import { ActionButtons } from '@/components/admin/ActionButtons';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/admin/Toast';
import { TBAImportEventModal } from '@/components/admin/TBAImportEventModal';
import { RoleBasedWrapper } from '@/components/common/RoleBasedWrapper';

export default function EventsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [pagination, setPagination] = useState<PaginationConfig>({
    page: 1,
    limit: 20,
    total: 0,
  });
  const [sortBy, setSortBy] = useState<string>('week');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: (pagination.limit || 20).toString(),
        sortBy,
        sortOrder,
        ...(searchQuery && { search: searchQuery }),
        ...(selectedYear && { year: selectedYear.toString() }),
      });

      const response = await fetch(`/api/admin/events?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.data);
        setPagination((prev) => ({ ...prev, total: data.pagination.total }));
      } else {
        showToast('error', 'Failed to fetch events');
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      showToast('error', 'An error occurred while fetching events');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, sortBy, sortOrder, searchQuery, selectedYear, showToast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

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

  const handleYearChange = (year: number | null) => {
    setSelectedYear(year);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Generate year options (current year and past 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const handleDelete = async (eventKey: string) => {
    try {
      const response = await fetch(`/api/admin/events/${eventKey}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('success', 'Event deleted successfully');
        fetchEvents();
      } else {
        const error = await response.json();
        showToast('error', error.error || 'Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      showToast('error', 'An error occurred while deleting the event');
    }
  };

  const columns: Column<Event>[] = [
    {
      key: 'event_key',
      header: 'Event Key',
      sortable: true,
    },
    {
      key: 'event_name',
      header: 'Name',
      sortable: true,
      render: (value, row) => (
        <Link
          href={`/admin/events/${row.event_key}`}
          className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
        >
          {String(value)}
        </Link>
      ),
    },
    {
      key: 'event_type',
      header: 'Type',
      sortable: true,
      render: (value) => (
        <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          {String(value)}
        </span>
      ),
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
      key: 'start_date',
      header: 'Start Date',
      sortable: true,
      render: (value) => (value ? new Date(String(value)).toLocaleDateString() : '-'),
    },
    {
      key: 'end_date',
      header: 'End Date',
      sortable: true,
      render: (value) => (value ? new Date(String(value)).toLocaleDateString() : '-'),
    },
    {
      key: 'week',
      header: 'Week',
      sortable: true,
      render: (value, row) => {
        if (row.week === null || row.week === undefined) return '-';
        return `Week ${row.week + 1}`;
      },
    },
    {
      key: 'year',
      header: 'Year',
      sortable: true,
    },
    {
      key: 'event_key',
      header: 'Actions',
      render: (value) => (
        <RoleBasedWrapper allowedRoles={['admin']}>
          <ActionButtons
            onEdit={() => router.push(`/admin/events/${String(value)}/edit`)}
            onDelete={() => handleDelete(String(value))}
          />
        </RoleBasedWrapper>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Events</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage FRC competition events
          </p>
        </div>
        <RoleBasedWrapper allowedRoles={['admin']}>
          <div className="flex gap-2">
            <TBAImportEventModal onSuccess={() => fetchEvents()} />
            <Link href="/admin/events/new">
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
                Create Event
              </Button>
            </Link>
          </div>
        </RoleBasedWrapper>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <SearchBar
            onSearch={handleSearch}
            placeholder="Search events by name, location, or event key..."
          />
        </div>

        {/* Year Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="year-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Season:
          </label>
          <select
            id="year-filter"
            value={selectedYear || ''}
            onChange={(e) => handleYearChange(e.target.value ? parseInt(e.target.value) : null)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">All Seasons</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={events}
        loading={loading}
        pagination={pagination}
        onSort={handleSort}
        onPageChange={handlePageChange}
        emptyMessage="No events found. Create your first event to get started."
      />
    </div>
  );
}
