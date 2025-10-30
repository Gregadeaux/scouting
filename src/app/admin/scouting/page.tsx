/**
 * Scouting Data Viewer Page
 * Comprehensive admin tool for managing scouting data with information-dense layout
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Download, RefreshCw, Hash } from 'lucide-react';
import { ScoutingDataList } from '@/components/admin/scouting/ScoutingDataList';
import { ScoutingDataDetail } from '@/components/admin/scouting/ScoutingDataDetail';
import { Button } from '@/components/ui/Button';
import { buildSearchParams, debounce } from '@/lib/utils';
import type { ScoutingEntryWithDetails, ScoutingListOptions } from '@/types/admin';

export default function ScoutingDataPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State management
  const [scoutingData, setScoutingData] = useState<ScoutingEntryWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    has_more: false,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState({
    eventKey: searchParams.get('eventKey') || '',
    teamNumber: searchParams.get('teamNumber') || '',
    scoutName: searchParams.get('scoutName') || '',
    matchKey: searchParams.get('matchKey') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    dataQuality: searchParams.get('dataQuality') || '',
  });
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>((searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc');

  // Dropdowns data
  const [events, setEvents] = useState<{ key: string; name: string }[]>([]);
  const [scouts, setScouts] = useState<string[]>([]);

  // Detail modal
  const [selectedEntry, setSelectedEntry] = useState<ScoutingEntryWithDetails | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch dropdown data
  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      // Fetch events
      const eventsRes = await fetch('/api/admin/events');
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.data.map((e: { event_key: string; event_name: string }) => ({ key: e.event_key, name: e.event_name })));
      }

      // TODO: Fetch unique scout names from the data
      // For now, we'll extract from loaded data
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    }
  };

  // Fetch scouting data
  const fetchScoutingData = useCallback(async () => {
    setLoading(true);

    try {
      const params: ScoutingListOptions = {
        page: pagination.page,
        limit: pagination.limit,
        sortBy,
        sortOrder,
        search: searchQuery,
        eventKey: filters.eventKey || undefined,
        teamNumber: filters.teamNumber ? parseInt(filters.teamNumber) : undefined,
        scoutName: filters.scoutName || undefined,
        matchKey: filters.matchKey || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        dataQuality: filters.dataQuality || undefined,
      };

      // Build query string
      const queryString = buildSearchParams(params as Record<string, string | number | undefined>).toString();
      const response = await fetch(`/api/admin/scouting?${queryString}`);

      if (!response.ok) {
        throw new Error('Failed to fetch scouting data');
      }

      const data = await response.json();
      setScoutingData(data.data);
      setPagination({
        ...pagination,
        total: data.pagination.total,
        has_more: data.pagination.has_more,
      });

      // Extract unique scout names for dropdown
      const uniqueScouts = [...new Set(data.data.map((d: ScoutingEntryWithDetails) => d.scout_name))];
      setScouts(uniqueScouts.filter((s): s is string => typeof s === 'string').sort());
    } catch (error) {
      console.error('Error fetching scouting data:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, sortBy, sortOrder, searchQuery, filters]);

  // Fetch data when filters change
  useEffect(() => {
    fetchScoutingData();
  }, [fetchScoutingData]);

  // Update URL params when filters change
  useEffect(() => {
    const params = buildSearchParams({
      ...filters,
      search: searchQuery,
      sortBy,
      sortOrder,
      page: pagination.page,
    });
    router.push(`?${params.toString()}`, { scroll: false });
  }, [filters, searchQuery, sortBy, sortOrder, pagination.page, router]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchQuery(value);
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 300),
    []
  );

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle filter change
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle export
  const handleExport = async () => {
    setExporting(true);

    try {
      const params = buildSearchParams({
        ...filters,
        search: searchQuery,
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/admin/scouting/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'scouting-data.csv';

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      setExporting(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch('/api/admin/scouting', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete entry');
      }

      // Refresh data
      fetchScoutingData();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  // Handle row click
  const handleRowClick = (entry: ScoutingEntryWithDetails) => {
    setSelectedEntry(entry);
    setShowDetailModal(true);
  };

  // Calculate stats
  const totalEntries = pagination.total;
  const uniqueTeams = new Set(scoutingData.map(d => d.team_number)).size;
  const uniqueScouts = new Set(scoutingData.map(d => d.scout_name)).size;
  const completeEntries = scoutingData.filter(d => d.data_quality === 'complete').length;

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Scouting Data</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          View and manage all match scouting entries with detailed performance metrics
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="font-medium text-gray-900 dark:text-gray-100">{totalEntries}</span>
            <span className="text-gray-500">total entries</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium text-gray-900 dark:text-gray-100">{uniqueTeams}</span>
            <span className="text-gray-500">teams scouted</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium text-gray-900 dark:text-gray-100">{uniqueScouts}</span>
            <span className="text-gray-500">active scouts</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium text-green-600 dark:text-green-400">{completeEntries}</span>
            <span className="text-gray-500">complete</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search team # or scout name..."
              className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              onChange={(e) => debouncedSearch(e.target.value)}
              defaultValue={searchQuery}
            />
          </div>

          {/* Event Filter */}
          <select
            value={filters.eventKey}
            onChange={(e) => handleFilterChange('eventKey', e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="">All Events</option>
            {events.map(event => (
              <option key={event.key} value={event.key}>
                {event.name}
              </option>
            ))}
          </select>

          {/* Team Number */}
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              placeholder="Team #"
              value={filters.teamNumber}
              onChange={(e) => handleFilterChange('teamNumber', e.target.value)}
              className="w-24 rounded-lg border border-gray-300 bg-white py-1.5 pl-8 pr-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          {/* Scout Name */}
          <select
            value={filters.scoutName}
            onChange={(e) => handleFilterChange('scoutName', e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="">All Scouts</option>
            {scouts.map(scout => (
              <option key={scout} value={scout}>
                {scout}
              </option>
            ))}
          </select>

          {/* Match Key */}
          <input
            type="text"
            placeholder="Match key"
            value={filters.matchKey}
            onChange={(e) => handleFilterChange('matchKey', e.target.value)}
            className="w-32 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />

          {/* Date Range */}
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />

          {/* Data Quality */}
          <select
            value={filters.dataQuality}
            onChange={(e) => handleFilterChange('dataQuality', e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="">All Quality</option>
            <option value="complete">Complete</option>
            <option value="partial">Partial</option>
            <option value="issues">Issues</option>
          </select>

          {/* Action Buttons */}
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
            >
              <Download className="h-4 w-4 mr-1" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchScoutingData}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <ScoutingDataList
        data={scoutingData}
        loading={loading}
        onRowClick={handleRowClick}
        onSort={handleSort}
        sortBy={sortBy}
        sortOrder={sortOrder}
      />

      {/* Pagination */}
      {!loading && pagination.total > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} entries
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-2">
              {/* Simple page numbers */}
              {Array.from({ length: Math.min(5, Math.ceil(pagination.total / pagination.limit)) }, (_, i) => {
                const pageNum = i + 1;
                const isActive = pageNum === pagination.page;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                    className={`h-8 w-8 rounded text-sm ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={!pagination.has_more}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <ScoutingDataDetail
        entry={selectedEntry}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedEntry(null);
        }}
        onDelete={handleDelete}
      />
    </div>
  );
}