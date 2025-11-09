'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/label';
import {
  ExperienceLevel,
  PreferredRole,
  Certification,
  AVAILABLE_CERTIFICATIONS,
  CERTIFICATION_LABELS,
  EXPERIENCE_LEVEL_LABELS,
  PREFERRED_ROLE_LABELS,
  ScouterWithUser,
  CreateScouterInput,
  UpdateScouterInput,
} from '@/types/scouter';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
}

interface Team {
  team_number: number;
  team_name: string | null;
  team_nickname: string | null;
}

interface ScouterFormProps {
  scouter?: ScouterWithUser;
  onSubmit: (data: CreateScouterInput | UpdateScouterInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ScouterForm({
  scouter,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ScouterFormProps) {
  const isEditMode = !!scouter;

  // Form state
  const [userId, setUserId] = useState(scouter?.user_id || '');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    scouter?.experience_level || 'rookie'
  );
  const [preferredRole, setPreferredRole] = useState<PreferredRole>(
    scouter?.preferred_role || null
  );
  const [teamNumber, setTeamNumber] = useState<string>(
    scouter?.team_number?.toString() || ''
  );
  const [certifications, setCertifications] = useState<Certification[]>(
    scouter?.certifications || []
  );
  const [availabilityNotes, setAvailabilityNotes] = useState(
    scouter?.availability_notes || ''
  );

  // Data loading state
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Load users and teams
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [usersRes, teamsRes] = await Promise.all([
          fetch('/api/admin/users'),
          fetch('/api/admin/teams?limit=1000'),
        ]);

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData.data || []);
        }

        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          setTeams(teamsData.data || []);
        }
      } catch (err) {
        console.error('Error loading form data:', err);
        setError('Failed to load users and teams');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!isEditMode && !userId) {
      errors.userId = 'User is required';
    }

    if (!experienceLevel) {
      errors.experienceLevel = 'Experience level is required';
    }

    if (teamNumber && (isNaN(Number(teamNumber)) || Number(teamNumber) < 1)) {
      errors.teamNumber = 'Invalid team number';
    }

    if (availabilityNotes && availabilityNotes.length > 1000) {
      errors.availabilityNotes = 'Availability notes must be less than 1000 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const formData: CreateScouterInput | UpdateScouterInput = isEditMode
      ? {
          experience_level: experienceLevel,
          preferred_role: preferredRole,
          team_number: teamNumber ? Number(teamNumber) : null,
          certifications,
          availability_notes: availabilityNotes || null,
        }
      : {
          user_id: userId,
          experience_level: experienceLevel,
          preferred_role: preferredRole,
          team_number: teamNumber ? Number(teamNumber) : null,
          certifications,
          availability_notes: availabilityNotes || null,
        };

    await onSubmit(formData);
  };

  const toggleCertification = (cert: Certification) => {
    setCertifications((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-frc-blue border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* User Selection (only for create mode) */}
      {!isEditMode && (
        <div>
          <Label htmlFor="userId">
            User <span className="text-red-500">*</span>
          </Label>
          <select
            id="userId"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            disabled={isSubmitting}
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-frc-blue focus:outline-none focus:ring-2 focus:ring-frc-blue dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">Select a user...</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.display_name || user.full_name || user.email} ({user.email})
              </option>
            ))}
          </select>
          {validationErrors.userId && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {validationErrors.userId}
            </p>
          )}
        </div>
      )}

      {/* Experience Level */}
      <div>
        <Label htmlFor="experienceLevel">
          Experience Level <span className="text-red-500">*</span>
        </Label>
        <select
          id="experienceLevel"
          value={experienceLevel}
          onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
          disabled={isSubmitting}
          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-frc-blue focus:outline-none focus:ring-2 focus:ring-frc-blue dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          {Object.entries(EXPERIENCE_LEVEL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {validationErrors.experienceLevel && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {validationErrors.experienceLevel}
          </p>
        )}
      </div>

      {/* Preferred Role */}
      <div>
        <Label htmlFor="preferredRole">Preferred Role</Label>
        <select
          id="preferredRole"
          value={preferredRole || ''}
          onChange={(e) =>
            setPreferredRole(
              e.target.value ? (e.target.value as PreferredRole) : null
            )
          }
          disabled={isSubmitting}
          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-frc-blue focus:outline-none focus:ring-2 focus:ring-frc-blue dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">No preference</option>
          {Object.entries(PREFERRED_ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Team Assignment */}
      <div>
        <Label htmlFor="teamNumber">Team Assignment</Label>
        <select
          id="teamNumber"
          value={teamNumber}
          onChange={(e) => setTeamNumber(e.target.value)}
          disabled={isSubmitting}
          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-frc-blue focus:outline-none focus:ring-2 focus:ring-frc-blue dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">No team assignment</option>
          {teams.map((team) => (
            <option key={team.team_number} value={team.team_number}>
              {team.team_number} - {team.team_name || team.team_nickname || 'Unknown'}
            </option>
          ))}
        </select>
        {validationErrors.teamNumber && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {validationErrors.teamNumber}
          </p>
        )}
      </div>

      {/* Certifications */}
      <div>
        <Label>Certifications</Label>
        <div className="mt-2 space-y-2">
          {AVAILABLE_CERTIFICATIONS.map((cert) => (
            <label
              key={cert}
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded"
            >
              <input
                type="checkbox"
                checked={certifications.includes(cert)}
                onChange={() => toggleCertification(cert)}
                disabled={isSubmitting}
                className="h-4 w-4 rounded border-gray-300 text-frc-blue focus:ring-frc-blue"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {CERTIFICATION_LABELS[cert]}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Availability Notes */}
      <div>
        <Label htmlFor="availabilityNotes">Availability Notes</Label>
        <textarea
          id="availabilityNotes"
          value={availabilityNotes}
          onChange={(e) => setAvailabilityNotes(e.target.value)}
          disabled={isSubmitting}
          rows={4}
          placeholder="Any scheduling constraints, time zones, physical limitations, etc."
          className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-frc-blue focus:outline-none focus:ring-2 focus:ring-frc-blue dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          maxLength={1000}
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {availabilityNotes.length}/1000 characters
        </p>
        {validationErrors.availabilityNotes && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {validationErrors.availabilityNotes}
          </p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              {isEditMode ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            <>{isEditMode ? 'Update Scouter' : 'Create Scouter'}</>
          )}
        </Button>
      </div>
    </form>
  );
}
