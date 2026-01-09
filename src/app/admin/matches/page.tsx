'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Event } from '@/types';
import { Column, PaginationConfig, MatchWithDetails } from '@/types/admin';
import { DataTable } from '@/components/admin/DataTable';
import { SearchBar } from '@/components/admin/SearchBar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/admin/Toast';
import { RefreshCw, X } from 'lucide-react';

const LOCALSTORAGE_KEY = 'matchFilters';

interface FilterState {
  searchQuery: string;
  selectedEvent: string;
  selectedCompLevel: string;
  selectedScoutingStatus: string;
  teamNumber: string;
  dateFrom: string;
  dateTo: string;
}

export default function MatchesPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [matches, setMatches] = useState<MatchWithDetails[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [selectedCompLevel, setSelectedCompLevel] = useState<string>('');
  const [selectedScoutingStatus, setSelectedScoutingStatus] = useState<string>('');
  const [teamNumber, setTeamNumber] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const [pagination, setPagination] = useState<PaginationConfig>({
    page: 1,
    limit: 50,
    total: 0,
  });
  const [sortBy, setSortBy] = useState<string>('match_number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Initialize filters from URL params or localStorage
  useEffect(() => {
    if (initialized) return;

    // Priority: URL params > localStorage > defaults
    const urlSearch = searchParams.get('search') || '';
    const urlEvent = searchParams.get('event') || '';
    const urlCompLevel = searchParams.get('compLevel') || '';
    const urlScoutingStatus = searchParams.get('scoutingStatus') || '';
    const urlTeamNumber = searchParams.get('teamNumber') || '';
    const urlDateFrom = searchParams.get('dateFrom') || '';
    const urlDateTo = searchParams.get('dateTo') || '';

    // Check if any URL params exist
    const hasUrlParams = urlSearch || urlEvent || urlCompLevel || urlScoutingStatus ||
                         urlTeamNumber || urlDateFrom || urlDateTo;

    if (hasUrlParams) {
      // Load from URL
      setSearchQuery(urlSearch);
      setSelectedEvent(urlEvent);
      setSelectedCompLevel(urlCompLevel);
      setSelectedScoutingStatus(urlScoutingStatus);
      setTeamNumber(urlTeamNumber);
      setDateFrom(urlDateFrom);
      setDateTo(urlDateTo);
    } else {
      // Try to load from localStorage
      try {
        const saved = localStorage.getItem(LOCALSTORAGE_KEY);
        if (saved) {
          const filters: FilterState = JSON.parse(saved);
          setSearchQuery(filters.searchQuery || '');
          setSelectedEvent(filters.selectedEvent || '');
          setSelectedCompLevel(filters.selectedCompLevel || '');
          setSelectedScoutingStatus(filters.selectedScoutingStatus || '');
          setTeamNumber(filters.teamNumber || '');
          setDateFrom(filters.dateFrom || '');
          setDateTo(filters.dateTo || '');
        }
      } catch (error) {
        console.error('Error loading filters from localStorage:', error);
      }
    }

    setInitialized(true);
  }, [initialized, searchParams]);

  // Sync filters to URL and localStorage
  const updateFiltersInUrlAndStorage = useCallback((filters: FilterState) => {
    // Save to localStorage
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(filters));
    } catch (error) {
      console.error('Error saving filters to localStorage:', error);
    }

    // Update URL
    const params = new URLSearchParams();
    if (filters.searchQuery) params.set('search', filters.searchQuery);
    if (filters.selectedEvent) params.set('event', filters.selectedEvent);
    if (filters.selectedCompLevel) params.set('compLevel', filters.selectedCompLevel);
    if (filters.selectedScoutingStatus) params.set('scoutingStatus', filters.selectedScoutingStatus);
    if (filters.teamNumber) params.set('teamNumber', filters.teamNumber);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);

    const queryString = params.toString();
    router.push(`/admin/matches${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [router]);

  // Fetch events for dropdown
  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/admin/events?limit=100');
      if (response.ok) {
        const data = await response.json();
        setEvents(data.data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchMatches = useCallback(async () => {
    if (!initialized) return; // Wait for initialization

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: (pagination.limit || 50).toString(),
        sortBy,
        sortOrder,
        ...(searchQuery && { search: searchQuery }),
        ...(selectedEvent && { eventKey: selectedEvent }),
        ...(selectedCompLevel && { compLevel: selectedCompLevel }),
        ...(selectedScoutingStatus && { scoutingStatus: selectedScoutingStatus }),
        ...(teamNumber && { teamNumber: teamNumber }),
        ...(dateFrom && { dateFrom: dateFrom }),
        ...(dateTo && { dateTo: dateTo }),
      });

      const response = await fetch(`/api/admin/matches?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMatches(data.data);
        setPagination((prev) => ({ ...prev, total: data.pagination.total }));
      } else {
        showToast('error', 'Failed to fetch matches');
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      showToast('error', 'An error occurred while fetching matches');
    } finally {
      setLoading(false);
    }
  }, [initialized, pagination.page, pagination.limit, sortBy, sortOrder, searchQuery, selectedEvent, selectedCompLevel, selectedScoutingStatus, teamNumber, dateFrom, dateTo, showToast]);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

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
    updateFiltersInUrlAndStorage({
      searchQuery: query,
      selectedEvent,
      selectedCompLevel,
      selectedScoutingStatus,
      teamNumber,
      dateFrom,
      dateTo,
    });
  };

  const handleEventChange = (eventKey: string) => {
    setSelectedEvent(eventKey);
    setPagination((prev) => ({ ...prev, page: 1 }));
    updateFiltersInUrlAndStorage({
      searchQuery,
      selectedEvent: eventKey,
      selectedCompLevel,
      selectedScoutingStatus,
      teamNumber,
      dateFrom,
      dateTo,
    });
  };

  const handleCompLevelChange = (compLevel: string) => {
    setSelectedCompLevel(compLevel);
    setPagination((prev) => ({ ...prev, page: 1 }));
    updateFiltersInUrlAndStorage({
      searchQuery,
      selectedEvent,
      selectedCompLevel: compLevel,
      selectedScoutingStatus,
      teamNumber,
      dateFrom,
      dateTo,
    });
  };

  const handleScoutingStatusChange = (status: string) => {
    setSelectedScoutingStatus(status);
    setPagination((prev) => ({ ...prev, page: 1 }));
    updateFiltersInUrlAndStorage({
      searchQuery,
      selectedEvent,
      selectedCompLevel,
      selectedScoutingStatus: status,
      teamNumber,
      dateFrom,
      dateTo,
    });
  };

  const handleTeamNumberChange = (team: string) => {
    setTeamNumber(team);
    setPagination((prev) => ({ ...prev, page: 1 }));
    updateFiltersInUrlAndStorage({
      searchQuery,
      selectedEvent,
      selectedCompLevel,
      selectedScoutingStatus,
      teamNumber: team,
      dateFrom,
      dateTo,
    });
  };

  const handleDateFromChange = (date: string) => {
    setDateFrom(date);
    setPagination((prev) => ({ ...prev, page: 1 }));
    updateFiltersInUrlAndStorage({
      searchQuery,
      selectedEvent,
      selectedCompLevel,
      selectedScoutingStatus,
      teamNumber,
      dateFrom: date,
      dateTo,
    });
  };

  const handleDateToChange = (date: string) => {
    setDateTo(date);
    setPagination((prev) => ({ ...prev, page: 1 }));
    updateFiltersInUrlAndStorage({
      searchQuery,
      selectedEvent,
      selectedCompLevel,
      selectedScoutingStatus,
      teamNumber,
      dateFrom,
      dateTo: date,
    });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedEvent('');
    setSelectedCompLevel('');
    setSelectedScoutingStatus('');
    setTeamNumber('');
    setDateFrom('');
    setDateTo('');
    setPagination((prev) => ({ ...prev, page: 1 }));

    // Clear localStorage
    try {
      localStorage.removeItem(LOCALSTORAGE_KEY);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }

    // Clear URL params
    router.push('/admin/matches', { scroll: false });
  };

  const getCompLevelBadge = (compLevel: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      qm: { label: 'Q', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
      ef: { label: 'EF', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      qf: { label: 'QF', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
      sf: { label: 'SF', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
      f: { label: 'F', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
    };
    const badge = badges[compLevel] || { label: compLevel.toUpperCase(), color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  const getScoutingStatusBadge = (coverage: MatchWithDetails['scouting_coverage']) => {
    if (coverage.status === 'complete') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-300">
          <span className="h-2 w-2 rounded-full bg-green-600"></span>
          100%
        </span>
      );
    } else if (coverage.status === 'partial') {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
          <span className="h-2 w-2 rounded-full bg-yellow-600"></span>
          {coverage.percentage}%
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          <span className="h-2 w-2 rounded-full bg-gray-500"></span>
          0%
        </span>
      );
    }
  };

  const formatTeamList = (teams: (number | undefined)[], color: 'red' | 'blue') => {
    const validTeams = teams.filter(t => t !== undefined);
    const colorClass = color === 'red' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400';

    return (
      <span className={`font-medium ${colorClass}`}>
        {validTeams.length > 0 ? validTeams.join(', ') : '-'}
      </span>
    );
  };

  const columns: Column<MatchWithDetails>[] = [
    {
      key: 'match_key',
      header: 'Match Key',
      sortable: true,
      render: (value, row) => (
        <Link
          href={`/admin/matches/${row.match_key}`}
          className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
        >
          {String(value)}
        </Link>
      ),
    },
    {
      key: 'comp_level',
      header: 'Level',
      sortable: true,
      render: (value) => getCompLevelBadge(String(value)),
    },
    {
      key: 'match_number',
      header: '#',
      sortable: true,
      className: 'text-center',
    },
    {
      key: 'red_1',
      header: 'Red Alliance',
      render: (_, row) => formatTeamList([row.red_1, row.red_2, row.red_3], 'red'),
    },
    {
      key: 'blue_1',
      header: 'Blue Alliance',
      render: (_, row) => formatTeamList([row.blue_1, row.blue_2, row.blue_3], 'blue'),
    },
    {
      key: 'red_score',
      header: 'Score',
      render: (_, row) => {
        if (row.red_score !== null && row.red_score !== undefined &&
            row.blue_score !== null && row.blue_score !== undefined) {
          const redWon = row.winning_alliance === 'red';
          const blueWon = row.winning_alliance === 'blue';

          return (
            <div className="text-sm font-medium">
              <span className={redWon ? 'text-green-600 dark:text-green-400 font-bold' : 'text-gray-600 dark:text-gray-400'}>
                {row.red_score}
              </span>
              <span className="mx-1 text-gray-400">|</span>
              <span className={blueWon ? 'text-green-600 dark:text-green-400 font-bold' : 'text-gray-600 dark:text-gray-400'}>
                {row.blue_score}
              </span>
            </div>
          );
        }
        return <span className="text-gray-400">-</span>;
      },
    },
    {
      key: 'event_name',
      header: 'Event',
      sortable: true,
      render: (value) => (
        <span className="truncate block max-w-[150px]" title={String(value)}>
          {String(value) || '-'}
        </span>
      ),
    },
    {
      key: 'scouting_coverage',
      header: 'Scouting',
      render: (value) => getScoutingStatusBadge(value as MatchWithDetails['scouting_coverage']),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Matches</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Browse and manage match schedules
          </p>
        </div>
        <Button
          onClick={() => fetchMatches()}
          variant="secondary"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <SearchBar
              onSearch={handleSearch}
              placeholder="Search by match key..."
            />
          </div>
          <Button
            onClick={handleClearFilters}
            variant="secondary"
            size="sm"
            className="whitespace-nowrap"
          >
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {/* Event Filter */}
          <div className="flex flex-col gap-1">
            <label htmlFor="event-filter" className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Event
            </label>
            <select
              id="event-filter"
              value={selectedEvent}
              onChange={(e) => handleEventChange(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">All Events</option>
              {events.map((event) => (
                <option key={event.event_key} value={event.event_key}>
                  {event.event_name}
                </option>
              ))}
            </select>
          </div>

          {/* Competition Level Filter */}
          <div className="flex flex-col gap-1">
            <label htmlFor="comp-level-filter" className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Competition Level
            </label>
            <select
              id="comp-level-filter"
              value={selectedCompLevel}
              onChange={(e) => handleCompLevelChange(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">All Levels</option>
              <option value="qm">Qualification</option>
              <option value="ef">Eighth-Final</option>
              <option value="qf">Quarter-Final</option>
              <option value="sf">Semi-Final</option>
              <option value="f">Final</option>
            </select>
          </div>

          {/* Scouting Status Filter */}
          <div className="flex flex-col gap-1">
            <label htmlFor="scouting-status-filter" className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Scouting Status
            </label>
            <select
              id="scouting-status-filter"
              value={selectedScoutingStatus}
              onChange={(e) => handleScoutingStatusChange(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">All Status</option>
              <option value="complete">Complete (100%)</option>
              <option value="partial">Partial (1-99%)</option>
              <option value="none">None (0%)</option>
            </select>
          </div>

          {/* Team Number Filter */}
          <div className="flex flex-col gap-1">
            <label htmlFor="team-number-filter" className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Team Number
            </label>
            <input
              id="team-number-filter"
              type="number"
              value={teamNumber}
              onChange={(e) => handleTeamNumberChange(e.target.value)}
              placeholder="e.g., 930"
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          {/* Date From Filter */}
          <div className="flex flex-col gap-1">
            <label htmlFor="date-from-filter" className="text-xs font-medium text-gray-700 dark:text-gray-300">
              From Date
            </label>
            <input
              id="date-from-filter"
              type="date"
              value={dateFrom}
              onChange={(e) => handleDateFromChange(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          {/* Date To Filter */}
          <div className="flex flex-col gap-1">
            <label htmlFor="date-to-filter" className="text-xs font-medium text-gray-700 dark:text-gray-300">
              To Date
            </label>
            <input
              id="date-to-filter"
              type="date"
              value={dateTo}
              onChange={(e) => handleDateToChange(e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={matches}
        loading={loading}
        pagination={pagination}
        onSort={handleSort}
        onPageChange={handlePageChange}
        emptyMessage="No matches found. Import events from The Blue Alliance to get match schedules."
      />
    </div>
  );
}