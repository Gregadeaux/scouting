'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { TeamForm } from '@/components/admin/TeamForm';
import { TeamFormData } from '@/types/admin';
import { useToast } from '@/components/admin/Toast';

export default function NewTeamPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const handleSubmit = async (data: TeamFormData) => {
    try {
      const response = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        showToast('success', 'Team added successfully');
        router.push('/admin/teams');
      } else {
        const error = await response.json();
        showToast('error', error.error || 'Failed to add team');
      }
    } catch (error) {
      console.error('Error adding team:', error);
      showToast('error', 'An error occurred while adding the team');
    }
  };

  const handleCancel = () => {
    router.push('/admin/teams');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Add Team</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Register a new FRC team
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Information</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamForm onSubmit={handleSubmit} onCancel={handleCancel} />
        </CardContent>
      </Card>
    </div>
  );
}
