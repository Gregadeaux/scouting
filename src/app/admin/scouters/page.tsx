'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ScouterWithUser,
  ExperienceLevel,
  Certification,
  CreateScouterInput,
  UpdateScouterInput,
} from '@/types/scouter';
import { PaginationConfig } from '@/types/admin';
import { ScoutersTable } from '@/components/admin/scouters/ScoutersTable';
import { ScouterForm } from '@/components/admin/scouters/ScouterForm';
import { SearchBar } from '@/components/admin/SearchBar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/admin/Toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserPlus } from 'lucide-react';

export default function ScoutersPage() {
  const { showToast } = useToast();

  // Data state
  const [scouters, setScouters] = useState<ScouterWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScouter, setEditingScouter] = useState<ScouterWithUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [experienceFilter, setExperienceFilter] = useState<ExperienceLevel | ''>('');
  const [certificationFilter, setCertificationFilter] = useState<Certification | ''>('');
  const [teamFilter, setTeamFilter] = useState<string>('');

  // Pagination and sorting
  const [pagination, setPagination] = useState<PaginationConfig>({
    page: 1,
    limit: 20,
    total: 0,
  });
  const [sortBy, setSortBy] = useState<string>('display_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch scouters
  const fetchScouters = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: (pagination.limit || 20).toString(),
        sortBy,
        sortOrder,
        ...(searchQuery && { search: searchQuery }),
        ...(experienceFilter && { experience_level: experienceFilter }),
        ...(certificationFilter && { has_certification: certificationFilter }),
        ...(teamFilter && { team_number: teamFilter }),
      });

      const response = await fetch(`/api/admin/scouters?${params}`);
      if (response.ok) {
        const result = await response.json();
        setScouters(result.data.scouters || []);
        setPagination((prev) => ({
          ...prev,
          total: result.data.pagination?.total || 0
        }));
      } else {
        showToast('error', 'Failed to fetch scouters');
      }
    } catch (error) {
      console.error('Error fetching scouters:', error);
      showToast('error', 'An error occurred while fetching scouters');
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    sortBy,
    sortOrder,
    searchQuery,
    experienceFilter,
    certificationFilter,
    teamFilter,
    showToast,
  ]);

  useEffect(() => {
    fetchScouters();
  }, [fetchScouters]);

  // Handlers
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

  const handleFilterChange = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleOpenModal = (scouter?: ScouterWithUser) => {
    setEditingScouter(scouter || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!isSubmitting) {
      setIsModalOpen(false);
      setEditingScouter(null);
    }
  };

  const handleSubmit = async (data: CreateScouterInput | UpdateScouterInput) => {
    setIsSubmitting(true);
    try {
      const url = editingScouter
        ? `/api/admin/scouters/${editingScouter.id}`
        : '/api/admin/scouters';

      const method = editingScouter ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        showToast(
          'success',
          editingScouter
            ? 'Scouter updated successfully'
            : 'Scouter created successfully'
        );
        handleCloseModal();
        fetchScouters();
      } else {
        const error = await response.json();
        showToast('error', error.error || 'Failed to save scouter');
      }
    } catch (error) {
      console.error('Error saving scouter:', error);
      showToast('error', 'An error occurred while saving the scouter');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (scouterId: string) => {
    try {
      const response = await fetch(`/api/admin/scouters/${scouterId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('success', 'Scouter removed successfully');
        fetchScouters();
      } else {
        const error = await response.json();
        showToast('error', error.error || 'Failed to remove scouter');
      }
    } catch (error) {
      console.error('Error deleting scouter:', error);
      showToast('error', 'An error occurred while removing the scouter');
    }
  };

  // Get unique teams for filter
  const uniqueTeams = Array.from(
    new Set(scouters.filter((s) => s.team_number).map((s) => s.team_number!))
  ).sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Scouters
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage scouter profiles, certifications, and assignments
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <UserPlus className="mr-2 h-5 w-5" />
          Add Scouter
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex-1">
          <SearchBar
            onSearch={handleSearch}
            placeholder="Search by name, email, or team..."
          />
        </div>

        <div className="flex flex-wrap gap-4">
          {/* Experience Level Filter */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="experience-filter"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Experience:
            </label>
            <select
              id="experience-filter"
              value={experienceFilter}
              onChange={(e) => {
                setExperienceFilter(e.target.value as ExperienceLevel | '');
                handleFilterChange();
              }}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">All Levels</option>
              <option value="rookie">Rookie</option>
              <option value="intermediate">Intermediate</option>
              <option value="veteran">Veteran</option>
            </select>
          </div>

          {/* Certification Filter */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="certification-filter"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Certification:
            </label>
            <select
              id="certification-filter"
              value={certificationFilter}
              onChange={(e) => {
                setCertificationFilter(e.target.value as Certification | '');
                handleFilterChange();
              }}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">All Certifications</option>
              <option value="pit_certified">Pit Certified</option>
              <option value="match_certified">Match Certified</option>
              <option value="lead_scout">Lead Scout</option>
              <option value="data_reviewer">Data Reviewer</option>
              <option value="trainer">Trainer</option>
              <option value="super_scout">Super Scout</option>
            </select>
          </div>

          {/* Team Filter */}
          {uniqueTeams.length > 0 && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="team-filter"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Team:
              </label>
              <select
                id="team-filter"
                value={teamFilter}
                onChange={(e) => {
                  setTeamFilter(e.target.value);
                  handleFilterChange();
                }}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">All Teams</option>
                {uniqueTeams.map((teamNumber) => (
                  <option key={teamNumber} value={teamNumber}>
                    Team {teamNumber}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Clear Filters */}
          {(experienceFilter || certificationFilter || teamFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setExperienceFilter('');
                setCertificationFilter('');
                setTeamFilter('');
                handleFilterChange();
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <ScoutersTable
        scouters={scouters}
        loading={loading}
        pagination={pagination}
        onSort={handleSort}
        onPageChange={handlePageChange}
        onEdit={handleOpenModal}
        onDelete={handleDelete}
      />

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingScouter ? 'Edit Scouter' : 'Add New Scouter'}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            <ScouterForm
              scouter={editingScouter || undefined}
              onSubmit={handleSubmit}
              onCancel={handleCloseModal}
              isSubmitting={isSubmitting}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
