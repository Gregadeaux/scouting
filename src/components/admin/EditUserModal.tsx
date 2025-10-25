'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import type { UserRole } from '@/types/auth';

interface UserWithTeam {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  primary_team_number?: number | null;
  is_active: boolean;
}

interface EditUserModalProps {
  user: UserWithTeam;
  teams: Array<{ team_number: number; team_name: string }>;
  onSave: (userId: string, updates: Partial<UserWithTeam>) => void;
  onClose: () => void;
  isLoading: boolean;
}

export function EditUserModal({ user, teams, onSave, onClose, isLoading }: EditUserModalProps) {
  const [role, setRole] = useState(user.role);
  const [teamNumber, setTeamNumber] = useState(user.primary_team_number?.toString() || '');
  const [isActive, setIsActive] = useState(user.is_active);

  // Update state when user prop changes (e.g., after data refresh)
  useEffect(() => {
    setRole(user.role);
    setTeamNumber(user.primary_team_number?.toString() || '');
    setIsActive(user.is_active);
  }, [user]);

  const handleSave = () => {
    const updates: Partial<UserWithTeam> = {};

    if (role !== user.role) updates.role = role;
    if (teamNumber !== user.primary_team_number?.toString()) {
      updates.primary_team_number = teamNumber ? parseInt(teamNumber) : null;
    }
    if (isActive !== user.is_active) updates.is_active = isActive;

    onSave(user.id, updates);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="relative w-full max-w-md transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all dark:bg-gray-800">
          <div className="bg-white px-4 pb-4 pt-5 dark:bg-gray-800 sm:p-6 sm:pb-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
              Edit User
            </h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </label>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Full Name
                </label>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {user.full_name || '-'}
                </p>
              </div>

              <Select
                label="Role"
                options={[
                  { value: 'admin', label: 'Admin' },
                  { value: 'mentor', label: 'Mentor' },
                  { value: 'scouter', label: 'Scouter' },
                ]}
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
              />

              <Select
                label="Team"
                options={[
                  { value: '', label: 'No Team' },
                  ...teams.map((team) => ({
                    value: team.team_number.toString(),
                    label: `Team ${team.team_number} - ${team.team_name}`,
                  })),
                ]}
                value={teamNumber}
                onChange={(e) => setTeamNumber(e.target.value)}
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-frc-blue focus:ring-frc-blue"
                />
                <label
                  htmlFor="is-active"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Active Account
                </label>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 dark:bg-gray-700 sm:flex sm:flex-row-reverse sm:px-6">
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="w-full sm:ml-3 sm:w-auto"
            >
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
              className="mt-3 w-full sm:mt-0 sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
