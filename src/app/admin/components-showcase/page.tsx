'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DataTable } from '@/components/admin/DataTable';
import { SearchBar } from '@/components/admin/SearchBar';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { LoadingSpinner } from '@/components/admin/LoadingSpinner';
import { ActionButtons } from '@/components/admin/ActionButtons';
import { FormModal } from '@/components/admin/FormModal';
import { useToast } from '@/components/admin/Toast';
import { Column } from '@/types/admin';

interface SampleData {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  value: number;
}

export default function ComponentShowcase() {
  const { showToast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);

  const sampleData: SampleData[] = [
    { id: 1, name: 'Item One', status: 'active', value: 100 },
    { id: 2, name: 'Item Two', status: 'inactive', value: 200 },
    { id: 3, name: 'Item Three', status: 'active', value: 150 },
  ];

  const columns: Column<SampleData>[] = [
    {
      key: 'id',
      header: 'ID',
      sortable: true,
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => <StatusBadge status={value as 'active' | 'inactive' | 'pending' | 'success' | 'error' | 'completed'} />,
    },
    {
      key: 'value',
      header: 'Value',
      sortable: true,
    },
    {
      key: 'id',
      header: 'Actions',
      render: () => (
        <ActionButtons
          onEdit={() => showToast('info', 'Edit clicked')}
          onDelete={() => showToast('info', 'Delete clicked')}
        />
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Component Showcase
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Reference guide for all reusable admin components
        </p>
      </div>

      {/* Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button variant="primary" size="sm">
              Primary Small
            </Button>
            <Button variant="primary" size="md">
              Primary Medium
            </Button>
            <Button variant="primary" size="lg">
              Primary Large
            </Button>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button disabled>Disabled</Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Status Badges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <StatusBadge status="active" />
            <StatusBadge status="inactive" />
            <StatusBadge status="completed" />
            <StatusBadge status="pending" />
            <StatusBadge status="success" />
            <StatusBadge status="error" />
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            <StatusBadge status="active" variant="outline" />
            <StatusBadge status="inactive" variant="outline" />
            <StatusBadge status="completed" variant="outline" />
          </div>
        </CardContent>
      </Card>

      {/* Loading Spinners */}
      <Card>
        <CardHeader>
          <CardTitle>Loading Spinners</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <LoadingSpinner size="sm" />
              <p className="mt-2 text-sm">Small</p>
            </div>
            <div className="text-center">
              <LoadingSpinner size="md" />
              <p className="mt-2 text-sm">Medium</p>
            </div>
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="mt-2 text-sm">Large</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toast Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Toast Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => showToast('success', 'Operation successful!')}>
              Success Toast
            </Button>
            <Button onClick={() => showToast('error', 'Something went wrong')}>
              Error Toast
            </Button>
            <Button onClick={() => showToast('info', 'Information message')}>
              Info Toast
            </Button>
            <Button onClick={() => showToast('warning', 'Warning message')}>
              Warning Toast
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Search Bar</CardTitle>
        </CardHeader>
        <CardContent>
          <SearchBar
            onSearch={(query) => console.log('Search:', query)}
            placeholder="Try typing to see debouncing..."
          />
          <p className="mt-2 text-sm text-gray-500">
            Search is debounced by 300ms to reduce API calls
          </p>
        </CardContent>
      </Card>

      {/* Input Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Input Fields</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input label="Text Input" placeholder="Enter text..." />
          <Input label="With Error" error="This field is required" />
          <Input type="email" label="Email" placeholder="email@example.com" />
          <Input type="number" label="Number" placeholder="123" />
          <Input type="date" label="Date" />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Action Buttons</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <ActionButtons
              onEdit={() => showToast('info', 'Edit clicked')}
              onDelete={() => showToast('info', 'Delete clicked')}
            />
            <ActionButtons
              onEdit={() => showToast('info', 'Edit clicked')}
              onDelete={() => showToast('info', 'Delete clicked')}
              confirmDelete={false}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            First example has delete confirmation, second doesn&apos;t
          </p>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Data Table</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={sampleData}
            pagination={{
              page: 1,
              limit: 20,
              total: 3,
            }}
            onSort={(key, direction) =>
              console.log('Sort:', key, direction)
            }
            onPageChange={(page) => console.log('Page:', page)}
          />
        </CardContent>
      </Card>

      {/* Modal */}
      <Card>
        <CardHeader>
          <CardTitle>Modal</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
          <FormModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Example Modal"
            size="md"
          >
            <div className="space-y-4">
              <p>This is an example modal content.</p>
              <Input label="Sample Field" placeholder="Enter something..." />
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setModalOpen(false)}>Save</Button>
              </div>
            </div>
          </FormModal>
        </CardContent>
      </Card>

      {/* Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Cards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Card>
            <CardContent>Basic Card</CardContent>
          </Card>
          <Card hoverable>
            <CardContent>Hoverable Card (try hovering)</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Card with Header</CardTitle>
            </CardHeader>
            <CardContent>Card content goes here</CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Code Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="mb-2 font-semibold">Toast Usage:</h3>
            <pre className="overflow-x-auto rounded bg-gray-100 p-4 text-sm dark:bg-gray-800">
              {`const { showToast } = useToast();

showToast('success', 'Operation successful!');
showToast('error', 'Something went wrong');
showToast('info', 'Information message');
showToast('warning', 'Warning message');`}
            </pre>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">DataTable Usage:</h3>
            <pre className="overflow-x-auto rounded bg-gray-100 p-4 text-sm dark:bg-gray-800">
              {`<DataTable
  columns={columns}
  data={items}
  loading={loading}
  pagination={pagination}
  onSort={handleSort}
  onPageChange={handlePageChange}
  emptyMessage="No items found"
/>`}
            </pre>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">SearchBar Usage:</h3>
            <pre className="overflow-x-auto rounded bg-gray-100 p-4 text-sm dark:bg-gray-800">
              {`<SearchBar
  onSearch={handleSearch}
  placeholder="Search..."
  debounceMs={300}
/>`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
