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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Download, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useImportJob } from '@/hooks/useImportJob';
import { useToast } from '@/hooks/use-toast';

interface TBAImportButtonProps {
  eventKey: string;
  onImportComplete?: () => void;
}

export function TBAImportButton({ eventKey, onImportComplete }: TBAImportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [options, setOptions] = useState({
    importTeams: true,
    importMatches: true,
    importResults: false,
  });

  const { job, isProcessing, isComplete, isFailed, cancel } = useImportJob(activeJobId);
  const { toast } = useToast();

  const handleStartImport = async () => {
    try {
      const response = await fetch(`/api/admin/events/${eventKey}/import-tba`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      const data = await response.json();

      if (data.success) {
        setActiveJobId(data.data.job_id);
        toast({
          title: 'Import Started',
          description: 'TBA import job has been queued',
        });
      } else {
        toast({
          title: 'Import Failed',
          description: data.error || 'Failed to start import',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Network error starting import',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (isComplete && onImportComplete) {
      onImportComplete();
    }
    // Reset after a delay to allow modal to close
    setTimeout(() => {
      setActiveJobId(null);
    }, 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Import from TBA
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import from The Blue Alliance</DialogTitle>
          <DialogDescription>
            Select what data to import for this event
          </DialogDescription>
        </DialogHeader>

        {!activeJobId ? (
          // Configuration Form
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="import-teams"
                checked={options.importTeams}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, importTeams: checked as boolean })
                }
              />
              <Label htmlFor="import-teams">Import Teams</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="import-matches"
                checked={options.importMatches}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, importMatches: checked as boolean })
                }
              />
              <Label htmlFor="import-matches">Import Match Schedule</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="import-results"
                checked={options.importResults}
                onCheckedChange={(checked) =>
                  setOptions({ ...options, importResults: checked as boolean })
                }
              />
              <Label htmlFor="import-results">Import Match Results</Label>
            </div>
          </div>
        ) : (
          // Progress Display
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {isComplete && 'Import Complete'}
                {isFailed && 'Import Failed'}
                {isProcessing && 'Importing...'}
                {!isComplete && !isFailed && !isProcessing && 'Queued'}
              </span>
              <div>
                {isComplete && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                {isFailed && <XCircle className="h-5 w-5 text-red-600" />}
                {isProcessing && <Loader2 className="h-5 w-5 animate-spin" />}
              </div>
            </div>

            {job && (
              <>
                <Progress value={job.progress_percent} />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {job.total_items === 0 ? (
                    'Initializing import...'
                  ) : (
                    `${job.processed_items} / ${job.total_items} items processed`
                  )}
                </p>
                {job.error_message && (
                  <p className="text-sm text-red-600 dark:text-red-400">{job.error_message}</p>
                )}
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {!activeJobId ? (
            <>
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleStartImport}>Start Import</Button>
            </>
          ) : (
            <>
              {isProcessing && (
                <Button variant="outline" onClick={cancel}>
                  Cancel Import
                </Button>
              )}
              {(isComplete || isFailed) && (
                <Button onClick={handleClose}>Close</Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
