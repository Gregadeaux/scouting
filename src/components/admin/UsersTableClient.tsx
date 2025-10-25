'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/admin/DataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { SearchBar } from '@/components/admin/SearchBar';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { useToast } from '@/components/admin/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EditUserModal } from '@/components/admin/EditUserModal';
import { fetchWithCsrf } from '@/hooks/useCsrfToken';
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

interface UsersResponse {
  users: UserWithTeam[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UsersTableClientProps {
  initialUsers: UserWithTeam[];
  initialPagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  teams: Array<{ team_number: number; team_name: string }>;
}

export function UsersTableClient({
  initialUsers,
  initialPagination,
  teams,
}: UsersTableClientProps) {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  // State
  const [users, setUsers] = useState<UserWithTeam[]>(initialUsers);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [page, setPage] = useState(initialPagination.page);
  const [limit, setLimit] = useState(initialPagination.limit);
  const [total, setTotal] = useState(initialPagination.total);
  const [totalPages, setTotalPages] = useState(initialPagination.totalPages);

  // Edit/Delete state
  const [editingUser, setEditingUser] = useState<UserWithTeam | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserWithTeam | null>(null);
  const [updating, setUpdating] = useState(false);

  // Fetch users
  // Note: No need to check isAdmin here - the server layout already enforced this
  const fetchUsers = useCallback(async () => {

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (searchTerm) params.append('search', searchTerm);
      if (selectedRole) params.append('role', selectedRole);
      if (selectedTeam) params.append('team_number', selectedTeam);

      const response = await fetch(`/api/admin/users?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const responseData = await response.json();
      const data: UsersResponse = responseData.data;

      // Filter out any null/undefined users
      setUsers((data.users || []).filter(Boolean));

      // Safely set pagination data with defaults
      if (data.pagination) {
        setPage(data.pagination.page || 1);
        setLimit(data.pagination.limit || 20);
        setTotal(data.pagination.total || 0);
        setTotalPages(data.pagination.totalPages || 0);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('error', 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, selectedRole, selectedTeam, showToast]);

  // Handle user update
  const handleUpdateUser = async (userId: string, updates: Partial<UserWithTeam>) => {
    setUpdating(true);
    try {
      const response = await fetchWithCsrf(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      showToast('success', 'User updated successfully');
      fetchUsers(); // Refresh the list
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
      showToast('error', error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setUpdating(false);
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetchWithCsrf(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      showToast('success', 'User deleted successfully');
      fetchUsers(); // Refresh the list
      setDeleteUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('error', error instanceof Error ? error.message : 'Failed to delete user');
    }
  };

  // Effects
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Columns configuration
  const columns = [
    {
      key: 'email',
      header: 'Email / Name',
      render: (_value: unknown, user: UserWithTeam) => {
        if (!user) return '-';
        return (
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {user.email || '-'}
            </div>
            {user.full_name && (
              <div className="text-sm text-gray-500 dark:text-gray-400">{user.full_name}</div>
            )}
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Role',
      render: (_value: unknown, user: UserWithTeam) => {
        if (!user || !user.role) return '-';
        const roleColors: Record<UserRole, string> = {
          admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
          mentor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          scouter: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        };
        const colorClass = roleColors[user.role] || roleColors.scouter;
        return (
          <span
            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${colorClass}`}
          >
            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
          </span>
        );
      },
    },
    {
      key: 'team',
      header: 'Team',
      render: (_value: unknown, user: UserWithTeam) => {
        if (!user) return '-';
        if (!user.team && !user.primary_team_number) return '-';

        if (user.team) {
          return (
            <div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {user.team.team_number} - {user.team.team_name}
              </div>
              {user.team.team_nickname && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {user.team.team_nickname}
                </div>
              )}
            </div>
          );
        }

        return (
          <div className="text-gray-900 dark:text-gray-100">{user.primary_team_number}</div>
        );
      },
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (_value: unknown, user: UserWithTeam) => {
        if (!user) return '-';
        return <StatusBadge status={user.is_active ? 'active' : 'inactive'} />;
      },
    },
    {
      key: 'created_at',
      header: 'Joined',
      render: (_value: unknown, user: UserWithTeam) => {
        if (!user || !user.created_at) return '-';
        return new Date(user.created_at).toLocaleDateString();
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_value: unknown, user: UserWithTeam) => {
        if (!user) return null;
        const isCurrentUser = currentUser?.profile.email === user.email;
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setEditingUser(user)}>
              Edit
            </Button>
            {!isCurrentUser && (
              <Button size="sm" variant="danger" onClick={() => setDeleteUser(user)}>
                Delete
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  // No client-side auth check needed - the server layout already verified admin access
  // If user reached this component, they are authenticated and have admin role
  return (
    <>
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchBar placeholder="Search by email or name..." onSearch={setSearchTerm} />

          <div className="flex gap-2">
            <select
              className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="mentor">Mentor</option>
              <option value="scouter">Scouter</option>
            </select>

            <select
              className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
            >
              <option value="">All Teams</option>
              {teams.map((team) => (
                <option key={team.team_number} value={team.team_number.toString()}>
                  {team.team_number} - {team.team_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={users}
            pagination={{
              page,
              totalPages,
              onPageChange: setPage,
            }}
          />
        )}
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          teams={teams}
          onSave={(userId, updates) => handleUpdateUser(userId, updates)}
          onClose={() => setEditingUser(null)}
          isLoading={updating}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteUser !== null}
        title="Delete User"
        message={`Are you sure you want to delete ${deleteUser?.email}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => deleteUser && handleDeleteUser(deleteUser.id)}
        onClose={() => setDeleteUser(null)}
      />
    </>
  );
}
