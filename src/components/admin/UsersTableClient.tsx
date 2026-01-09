'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/admin/DataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { useToast } from '@/components/admin/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EditUserModal } from '@/components/admin/EditUserModal';
import { fetchWithCsrf } from '@/hooks/useCsrfToken';
import { Search, Plus, MoreHorizontal, Shield, ShieldAlert, ShieldCheck, Mail, Trash2, Edit } from 'lucide-react';
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
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [page, setPage] = useState(initialPagination.page);
  const [limit, setLimit] = useState(initialPagination.limit);
  const [total, setTotal] = useState(initialPagination.total);
  const [totalPages, setTotalPages] = useState(initialPagination.totalPages);

  // Edit/Delete state
  const [editingUser, setEditingUser] = useState<UserWithTeam | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserWithTeam | null>(null);
  const [updating, setUpdating] = useState(false);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (searchTerm) params.append('search', searchTerm);
      if (selectedRole && selectedRole !== 'all') params.append('role', selectedRole);
      if (selectedTeam && selectedTeam !== 'all') params.append('team_number', selectedTeam);

      const response = await fetch(`/api/admin/users?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const responseData = await response.json();
      const data: UsersResponse = responseData.data;

      setUsers((data.users || []).filter(Boolean));

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
      fetchUsers();
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
      fetchUsers();
      setDeleteUser(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('error', error instanceof Error ? error.message : 'Failed to delete user');
    }
  };

  // Effects
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300); // Debounce search
    return () => clearTimeout(timer);
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
              <div className="text-sm text-muted-foreground">{user.full_name}</div>
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
          admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
          mentor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
          scouter: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
        };
        const colorClass = roleColors[user.role] || roleColors.scouter;
        return (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
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
                {user.team.team_number}
              </div>
              <div className="text-sm text-muted-foreground truncate max-w-[150px]">
                {user.team.team_nickname || user.team.team_name}
              </div>
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
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingUser(user)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Button>
            {!isCurrentUser && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setDeleteUser(user)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full sm:w-[150px]">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="mentor">Mentor</SelectItem>
                  <SelectItem value="scouter">Scouter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-[200px]">
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.team_number} value={team.team_number.toString()}>
                      {team.team_number} - {team.team_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="rounded-md border">
            <DataTable
              columns={columns}
              data={users}
              pagination={{
                page,
                totalPages,
                onPageChange: setPage,
              }}
            />
          </div>
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
