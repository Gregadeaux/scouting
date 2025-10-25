/**
 * Repository for import job data access
 * Handles CRUD operations for TBA import jobs
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import type {
  ImportJob,
  ImportJobStatus,
  CreateImportJobInput,
  UpdateImportJobProgress,
} from '@/types/import-job';
import {
  RepositoryError,
  EntityNotFoundError,
  DatabaseOperationError,
} from './base.repository';

/**
 * Import Job Repository Interface
 */
export interface IImportJobRepository {
  create(input: CreateImportJobInput): Promise<ImportJob>;
  findById(jobId: string): Promise<ImportJob | null>;
  findByEventKey(eventKey: string, limit?: number): Promise<ImportJob[]>;
  findPendingJobs(limit?: number): Promise<ImportJob[]>;
  updateProgress(jobId: string, progress: UpdateImportJobProgress): Promise<void>;
  updateStatus(jobId: string, status: ImportJobStatus): Promise<void>;
  markCompleted(jobId: string): Promise<void>;
  markFailed(jobId: string, errorMessage: string): Promise<void>;
  addWarning(jobId: string, warning: string): Promise<void>;
}

/**
 * Import Job Repository Implementation
 */
export class ImportJobRepository implements IImportJobRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || createServiceClient();
  }

  /**
   * Create a new import job
   */
  async create(input: CreateImportJobInput): Promise<ImportJob> {
    try {
      const { data, error } = await this.client
        .from('import_jobs')
        .insert({
          event_key: input.event_key,
          job_type: input.job_type,
          created_by: input.created_by || null,
          status: 'pending',
          progress_percent: 0,
          total_items: 0,
          processed_items: 0,
          error_message: null,
        })
        .select()
        .single();

      if (error) {
        throw new DatabaseOperationError('create import job', error);
      }

      if (!data) {
        throw new RepositoryError('Failed to create import job - no data returned');
      }

      return data as ImportJob;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('create import job', error);
    }
  }

  /**
   * Find import job by ID
   */
  async findById(jobId: string): Promise<ImportJob | null> {
    try {
      const { data, error } = await this.client
        .from('import_jobs')
        .select('*')
        .eq('job_id', jobId)
        .single();

      if (error) {
        // Not found is expected, not an error
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new DatabaseOperationError('find import job by ID', error);
      }

      return data as ImportJob;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find import job by ID', error);
    }
  }

  /**
   * Find import jobs by event key
   */
  async findByEventKey(eventKey: string, limit: number = 50): Promise<ImportJob[]> {
    try {
      let query = this.client
        .from('import_jobs')
        .select('*')
        .eq('event_key', eventKey)
        .order('created_at', { ascending: false });

      if (limit > 0) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        throw new DatabaseOperationError('find import jobs by event key', error);
      }

      return (data || []) as ImportJob[];
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find import jobs by event key', error);
    }
  }

  /**
   * Find pending jobs (status = 'pending')
   */
  async findPendingJobs(limit: number = 50): Promise<ImportJob[]> {
    try {
      let query = this.client
        .from('import_jobs')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (limit > 0) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        throw new DatabaseOperationError('find pending import jobs', error);
      }

      return (data || []) as ImportJob[];
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find pending import jobs', error);
    }
  }

  /**
   * Update job progress
   */
  async updateProgress(jobId: string, progress: UpdateImportJobProgress): Promise<void> {
    try {
      const updateData: any = {
        processed_items: progress.processed_items,
        total_items: progress.total_items,
        progress_percent: progress.progress_percent,
        updated_at: new Date().toISOString(),
      };

      if (progress.status) {
        updateData.status = progress.status;
      }

      if (progress.error_message !== undefined) {
        updateData.error_message = progress.error_message;
      }

      const { error } = await this.client
        .from('import_jobs')
        .update(updateData)
        .eq('job_id', jobId);

      if (error) {
        throw new DatabaseOperationError('update import job progress', error);
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('update import job progress', error);
    }
  }

  /**
   * Update job status
   */
  async updateStatus(jobId: string, status: ImportJobStatus): Promise<void> {
    try {
      const { error } = await this.client
        .from('import_jobs')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', jobId);

      if (error) {
        throw new DatabaseOperationError('update import job status', error);
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('update import job status', error);
    }
  }

  /**
   * Mark job as completed
   */
  async markCompleted(jobId: string): Promise<void> {
    try {
      const now = new Date().toISOString();

      const { error } = await this.client
        .from('import_jobs')
        .update({
          status: 'completed',
          progress_percent: 100,
          completed_at: now,
          updated_at: now,
        })
        .eq('job_id', jobId);

      if (error) {
        throw new DatabaseOperationError('mark import job completed', error);
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('mark import job completed', error);
    }
  }

  /**
   * Mark job as failed
   */
  async markFailed(jobId: string, errorMessage: string): Promise<void> {
    try {
      const now = new Date().toISOString();

      const { error } = await this.client
        .from('import_jobs')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: now,
          updated_at: now,
        })
        .eq('job_id', jobId);

      if (error) {
        throw new DatabaseOperationError('mark import job failed', error);
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('mark import job failed', error);
    }
  }

  /**
   * Add warning to job (not implemented in schema, but placeholder for future)
   * For now, we'll append to error_message with a [WARNING] prefix
   */
  async addWarning(jobId: string, warning: string): Promise<void> {
    try {
      // Get current job
      const job = await this.findById(jobId);
      if (!job) {
        throw new EntityNotFoundError('ImportJob', jobId);
      }

      // Append warning to error_message
      const existingMessage = job.error_message || '';
      const newMessage = existingMessage
        ? `${existingMessage}\n[WARNING] ${warning}`
        : `[WARNING] ${warning}`;

      const { error } = await this.client
        .from('import_jobs')
        .update({
          error_message: newMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', jobId);

      if (error) {
        throw new DatabaseOperationError('add warning to import job', error);
      }
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('add warning to import job', error);
    }
  }
}

/**
 * Factory function for dependency injection
 */
export function createImportJobRepository(client?: SupabaseClient): IImportJobRepository {
  return new ImportJobRepository(client);
}
