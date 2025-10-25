'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { EventForm } from '@/components/admin/EventForm';
import { EventFormData } from '@/types/admin';
import { useToast } from '@/components/admin/Toast';

export default function NewEventPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const handleSubmit = async (data: EventFormData) => {
    try {
      const response = await fetch('/api/admin/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        showToast('success', 'Event created successfully');
        router.push('/admin/events');
      } else {
        const error = await response.json();
        showToast('error', error.error || 'Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      showToast('error', 'An error occurred while creating the event');
    }
  };

  const handleCancel = () => {
    router.push('/admin/events');
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create Event</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Add a new FRC event to the system
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm onSubmit={handleSubmit} onCancel={handleCancel} />
        </CardContent>
      </Card>
    </div>
  );
}
