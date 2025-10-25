'use client';

import { useEffect, useState, useCallback } from 'react';
import { UsersTableClient } from '@/components/admin/UsersTableClient';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { useToast } from '@/components/admin/Toast';
import type { UserProfile, UserRole } from '@/types/auth';

interface UserWithTeam extends UserProfile {
  team?: {
    team_number: number;
    team_name: string;
    team_nickname?: string;
  };
  memberships?: Array<{
    team_number: number;
    team_role: UserRole;
    is_active: boolean;
    joined_at: string;
  }>;
}

interface Team {
  team_number: number;
  team_name: string;
}

export default function UsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserWithTeam[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch users
      const usersParams = new URLSearchParams({
        page: '1',
        limit: '20',
      });

      const usersResponse = await fetch(`/api/admin/users?${usersParams}`);
      if (!usersResponse.ok) {
        throw new Error('Failed to fetch users');
      }

      const usersData = await usersResponse.json();

      // Fetch teams for filter dropdown
      const teamsParams = new URLSearchParams({
        page: '1',
        limit: '1000',
      });

      const teamsResponse = await fetch(`/api/admin/teams?${teamsParams}`);
      if (!teamsResponse.ok) {
        throw new Error('Failed to fetch teams');
      }

      const teamsData = await teamsResponse.json();

      // Set state
      setUsers(usersData.data.users || []);
      setPagination(usersData.data.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
      setTeams(teamsData.data || []);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      showToast('error', 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">User Management</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Manage user accounts, roles, and team assignments
        </p>
      </div>

      {/* Users Table */}
      <UsersTableClient initialUsers={users} initialPagination={pagination} teams={teams} />
    </div>
  );
}
