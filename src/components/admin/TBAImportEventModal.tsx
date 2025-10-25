'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TBAImportEventModalProps {
  onSuccess?: () => void;
}

export function TBAImportEventModal({ onSuccess }: TBAImportEventModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [eventKey, setEventKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleImport = async () => {
    if (!eventKey.trim()) {
      setError('Please enter an event key');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/events/import-from-tba', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventKey: eventKey.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          handleOpenChange(false);
          if (onSuccess) {
            onSuccess();
          } else {
            router.refresh();
          }
        }, 1500);
      } else {
        setError(data.error || 'Failed to import event');
      }
    } catch (err: any) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setIsOpen(true);
    } else if (!isLoading) {
      // Only allow closing if not loading
      setIsOpen(false);
      setEventKey('');
      setError(null);
      setSuccess(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Import from TBA
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Event from The Blue Alliance</DialogTitle>
          <DialogDescription>
            Enter a TBA event key (e.g., "2025txaus") to import event details, teams, matches, and results
          </DialogDescription>
        </DialogHeader>

        {!success ? (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="eventKey">Event Key</Label>
                <Input
                  id="eventKey"
                  placeholder="2025txaus"
                  value={eventKey}
                  onChange={(e) => setEventKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isLoading) {
                      handleImport();
                    }
                  }}
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">
                  Format: YYYYcode (year + event code)
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={isLoading || !eventKey.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Import Event
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <p className="text-lg font-semibold">Event Imported Successfully!</p>
            <p className="text-sm text-muted-foreground mt-2">
              Teams, matches, and results are being imported in the background.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to events list...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
