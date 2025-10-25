'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { TeamForm } from '@/components/admin/TeamForm';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { TeamFormData } from '@/types/admin';
import { Team } from '@/types';
import { useToast } from '@/components/admin/Toast';

export default function EditTeamPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeam();
  }, [params.id]);

  const fetchTeam = async () => {
    try {
      const response = await fetch(`/api/admin/teams/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setTeam(data);
      } else {
        showToast('error', 'Failed to fetch team');
        router.push('/admin/teams');
      }
    } catch (error) {
      console.error('Error fetching team:', error);
      showToast('error', 'An error occurred while fetching the team');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: TeamFormData) => {
    try {
      const response = await fetch(`/api/admin/teams/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        showToast('success', 'Team updated successfully');
        router.push('/admin/teams');
      } else {
        const error = await response.json();
        showToast('error', error.error || 'Failed to update team');
      }
    } catch (error) {
      console.error('Error updating team:', error);
      showToast('error', 'An error occurred while updating the team');
    }
  };

  const handleCancel = () => {
    router.push('/admin/teams');
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!team) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Edit Team</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Update team information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Information</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamForm
            initialData={team}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isEdit
          />
        </CardContent>
      </Card>
    </div>
  );
}
