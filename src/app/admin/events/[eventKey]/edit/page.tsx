'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { EventForm } from '@/components/admin/EventForm';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { EventFormData } from '@/types/admin';
import { Event } from '@/types';
import { useToast } from '@/components/admin/Toast';

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const { showToast } = useToast();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvent();
  }, [params.eventKey]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/admin/events/${params.eventKey}?simple=true`);
      if (response.ok) {
        const data = await response.json();
        setEvent(data);
      } else {
        showToast('error', 'Failed to fetch event');
        router.push('/admin/events');
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      showToast('error', 'An error occurred while fetching the event');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: EventFormData) => {
    try {
      const response = await fetch(`/api/admin/events/${params.eventKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        showToast('success', 'Event updated successfully');
        router.push('/admin/events');
      } else {
        const error = await response.json();
        showToast('error', error.error || 'Failed to update event');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      showToast('error', 'An error occurred while updating the event');
    }
  };

  const handleCancel = () => {
    router.push('/admin/events');
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Edit Event</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Update event information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm
            initialData={event}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isEdit
          />
        </CardContent>
      </Card>
    </div>
  );
}
