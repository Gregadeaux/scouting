'use client';

import React, { useState } from 'react';
import { EventFormData, FormErrors } from '@/types/admin';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Download, Loader2, AlertCircle } from 'lucide-react';

interface EventFormProps {
  initialData?: Partial<EventFormData>;
  onSubmit: (data: EventFormData) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
}

export function EventForm({ initialData, onSubmit, onCancel, isEdit = false }: EventFormProps) {
  const [formData, setFormData] = useState<EventFormData>({
    event_key: initialData?.event_key || '',
    event_name: initialData?.event_name || '',
    event_code: initialData?.event_code || '',
    year: initialData?.year || new Date().getFullYear(),
    event_type: initialData?.event_type || 'regional',
    district: initialData?.district || '',
    week: initialData?.week || undefined,
    city: initialData?.city || '',
    state_province: initialData?.state_province || '',
    country: initialData?.country || 'USA',
    start_date: initialData?.start_date || '',
    end_date: initialData?.end_date || '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const handleChange = (field: keyof EventFormData, value: EventFormData[typeof field]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleFetchFromTBA = async () => {
    const eventKey = formData.event_key;
    if (!eventKey) {
      setFetchError('Please enter an event key first');
      return;
    }

    setIsFetching(true);
    setFetchError(null);

    try {
      const response = await fetch('/api/admin/events/import-from-tba', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventKey }),
      });

      const data = await response.json();

      if (data.success) {
        // Pre-fill form with TBA data
        setFormData({
          ...formData,
          event_name: data.data.event_name,
          event_code: data.data.event_code,
          year: data.data.year,
          event_type: data.data.event_type || 'regional',
          district: data.data.district || '',
          week: data.data.week || undefined,
          city: data.data.city || '',
          state_province: data.data.state_prov || '',
          country: data.data.country || '',
          start_date: data.data.start_date,
          end_date: data.data.end_date,
        });
      } else {
        setFetchError(data.error || 'Failed to fetch from TBA');
      }
    } catch (err) {
      setFetchError('Network error. Please try again.');
    } finally {
      setIsFetching(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.event_key.trim()) {
      newErrors.event_key = 'Event key is required';
    }
    if (!formData.event_name.trim()) {
      newErrors.event_name = 'Event name is required';
    }
    if (!formData.event_code.trim()) {
      newErrors.event_code = 'Event code is required';
    }
    if (!formData.year || formData.year < 1992) {
      newErrors.year = 'Valid year is required';
    }
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }
    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }
    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      newErrors.end_date = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Input
          label="Event Key *"
          value={formData.event_key}
          onChange={(e) => handleChange('event_key', e.target.value)}
          error={errors.event_key}
          placeholder="2025cacc"
          disabled={isEdit}
          helpText="Format: YYYYcode (e.g., 2025txaus)"
        />

        <Input
          label="Event Code *"
          value={formData.event_code}
          onChange={(e) => handleChange('event_code', e.target.value)}
          error={errors.event_code}
          placeholder="cacc"
        />
      </div>

      {/* Fetch from TBA button - only show when creating new event */}
      {!isEdit && (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleFetchFromTBA}
            disabled={isFetching || !formData.event_key}
          >
            {isFetching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Fetching from TBA...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Fetch from TBA
              </>
            )}
          </Button>
          {fetchError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-600 dark:text-red-400">{fetchError}</p>
            </div>
          )}
        </div>
      )}

      <Input
        label="Event Name *"
        value={formData.event_name}
        onChange={(e) => handleChange('event_name', e.target.value)}
        error={errors.event_name}
        placeholder="Sacramento Regional"
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Event Type *
          </label>
          <select
            value={formData.event_type}
            onChange={(e) => handleChange('event_type', e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-frc-blue focus:outline-none focus:ring-2 focus:ring-frc-blue dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="regional">Regional</option>
            <option value="district">District</option>
            <option value="district_championship">District Championship</option>
            <option value="championship_subdivision">Championship Subdivision</option>
            <option value="championship">Championship</option>
            <option value="offseason">Offseason</option>
          </select>
        </div>

        <Input
          label="Year *"
          type="number"
          value={formData.year}
          onChange={(e) => handleChange('year', parseInt(e.target.value))}
          error={errors.year}
          min={1992}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Input
          label="District"
          value={formData.district || ''}
          onChange={(e) => handleChange('district', e.target.value)}
          placeholder="FIM"
        />

        <Input
          label="Week"
          type="number"
          value={formData.week || ''}
          onChange={(e) => handleChange('week', e.target.value ? parseInt(e.target.value) : undefined)}
          min={0}
          max={8}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Input
          label="City"
          value={formData.city || ''}
          onChange={(e) => handleChange('city', e.target.value)}
          placeholder="Sacramento"
        />

        <Input
          label="State/Province"
          value={formData.state_province || ''}
          onChange={(e) => handleChange('state_province', e.target.value)}
          placeholder="CA"
        />

        <Input
          label="Country"
          value={formData.country || ''}
          onChange={(e) => handleChange('country', e.target.value)}
          placeholder="USA"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Input
          label="Start Date *"
          type="date"
          value={formData.start_date}
          onChange={(e) => handleChange('start_date', e.target.value)}
          error={errors.start_date}
        />

        <Input
          label="End Date *"
          type="date"
          value={formData.end_date}
          onChange={(e) => handleChange('end_date', e.target.value)}
          error={errors.end_date}
        />
      </div>

      <div className="flex justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : isEdit ? 'Update Event' : 'Create Event'}
        </Button>
      </div>
    </form>
  );
}
