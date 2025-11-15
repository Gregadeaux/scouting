/**
 * Repository for validation result data access
 * Handles CRUD operations for field-level validation results
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import type {
  ValidationResult,
  ValidationResultRow,
  ValidationQueryOptions,
  ValidationStrategyType,
  ValidationOutcome,
} from '@/types/validation';
import {
  RepositoryError,
  EntityNotFoundError,
  DatabaseOperationError,
} from './base.repository';

/**
 * Validation Result Repository Interface
 */
export interface IValidationResultRepository {
  /**
   * Create a single validation result
   */
  create(result: Omit<ValidationResult, 'createdAt'>): Promise<ValidationResult>;

  /**
   * Create multiple validation results (batch)
   */
  createBatch(results: Omit<ValidationResult, 'createdAt'>[]): Promise<void>;

  /**
   * Find validation results by execution ID
   */
  findByExecution(executionId: string): Promise<ValidationResult[]>;

  /**
   * Find validation results by scouter
   */
  findByScouter(
    scouterId: string,
    options?: ValidationQueryOptions
  ): Promise<ValidationResult[]>;

  /**
   * Find validation results by match
   */
  findByMatch(matchKey: string): Promise<ValidationResult[]>;

  /**
   * Find validation results by event
   */
  findByEvent(eventKey: string): Promise<ValidationResult[]>;

  /**
   * Get validation statistics for a scouter
   */
  getScouterStatistics(
    scouterId: string,
    seasonYear?: number
  ): Promise<ValidationStatistics>;

  /**
   * Get validation statistics for an event
   */
  getEventStatistics(eventKey: string): Promise<ValidationStatistics>;

  /**
   * Delete validation results by execution ID
   */
  deleteByExecution(executionId: string): Promise<void>;
}

/**
 * Validation statistics summary
 */
export interface ValidationStatistics {
  totalValidations: number;
  exactMatches: number;
  closeMatches: number;
  mismatches: number;
  averageAccuracy: number;
  byValidationType: Map<ValidationStrategyType, {
    count: number;
    averageAccuracy: number;
  }>;
  byFieldPath: Map<string, {
    count: number;
    averageAccuracy: number;
  }>;
}

/**
 * Validation Result Repository Implementation
 */
export class ValidationResultRepository implements IValidationResultRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || createServiceClient();
  }

  async create(result: Omit<ValidationResult, 'createdAt'>): Promise<ValidationResult> {
    try {
      const { data, error } = await this.client
        .from('validation_results')
        .insert({
          id: result.validationId,
          validation_type: result.validationType,
          validation_method: result.validationMethod,
          execution_id: result.executionId,
          match_key: result.matchKey,
          team_number: result.teamNumber,
          event_key: result.eventKey,
          season_year: result.seasonYear,
          field_path: result.fieldPath,
          expected_value: result.expectedValue,
          actual_value: result.actualValue,
          scouter_id: result.scouterId,
          match_scouting_id: result.matchScoutingId,
          validation_outcome: result.outcome,
          accuracy_score: result.accuracyScore,
          confidence_level: result.confidenceLevel,
          notes: result.notes,
        })
        .select()
        .single();

      if (error) {
        throw new DatabaseOperationError(
          `Failed to create validation result: ${error.message}`,
          error
        );
      }

      return this.mapRowToResult(data);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to create validation result', error);
    }
  }

  async createBatch(results: Omit<ValidationResult, 'createdAt'>[]): Promise<void> {
    if (results.length === 0) return;

    try {
      const rows = results.map((result) => ({
        id: result.validationId,
        validation_type: result.validationType,
        validation_method: result.validationMethod,
        execution_id: result.executionId,
        match_key: result.matchKey,
        team_number: result.teamNumber,
        event_key: result.eventKey,
        season_year: result.seasonYear,
        field_path: result.fieldPath,
        expected_value: result.expectedValue,
        actual_value: result.actualValue,
        scouter_id: result.scouterId,
        match_scouting_id: result.matchScoutingId,
        validation_outcome: result.outcome,
        accuracy_score: result.accuracyScore,
        confidence_level: result.confidenceLevel,
        notes: result.notes,
      }));

      // Insert in batches of 1000 to avoid hitting limits
      const batchSize = 1000;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error } = await this.client.from('validation_results').insert(batch);

        if (error) {
          throw new DatabaseOperationError(
            `Failed to create validation results batch: ${error.message}`,
            error
          );
        }
      }
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to create validation results batch', error);
    }
  }

  async findByExecution(executionId: string): Promise<ValidationResult[]> {
    try {
      const { data, error } = await this.client
        .from('validation_results')
        .select('*')
        .eq('execution_id', executionId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new DatabaseOperationError(
          `Failed to fetch validation results: ${error.message}`,
          error
        );
      }

      return (data || []).map(this.mapRowToResult);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to find validation results by execution', error);
    }
  }

  async findByScouter(
    scouterId: string,
    options?: ValidationQueryOptions
  ): Promise<ValidationResult[]> {
    try {
      let query = this.client
        .from('validation_results')
        .select('*')
        .eq('scouter_id', scouterId);

      // Apply filters
      if (options?.matchKey) {
        query = query.eq('match_key', options.matchKey);
      }

      if (options?.eventKey) {
        query = query.eq('event_key', options.eventKey);
      }

      if (options?.validationType) {
        query = query.eq('validation_type', options.validationType);
      }

      if (options?.outcome) {
        query = query.eq('validation_outcome', options.outcome);
      }

      if (options?.fieldPath) {
        query = query.eq('field_path', options.fieldPath);
      }

      // Apply ordering
      const orderBy = options?.orderBy || 'created_at';
      const orderDirection = options?.orderDirection || 'desc';
      query = query.order(orderBy, { ascending: orderDirection === 'asc' });

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw new DatabaseOperationError(
          `Failed to fetch validation results: ${error.message}`,
          error
        );
      }

      return (data || []).map(this.mapRowToResult);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to find validation results by scouter', error);
    }
  }

  async findByMatch(matchKey: string): Promise<ValidationResult[]> {
    try {
      const { data, error } = await this.client
        .from('validation_results')
        .select('*')
        .eq('match_key', matchKey)
        .order('created_at', { ascending: false });

      if (error) {
        throw new DatabaseOperationError(
          `Failed to fetch validation results: ${error.message}`,
          error
        );
      }

      return (data || []).map(this.mapRowToResult);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to find validation results by match', error);
    }
  }

  async findByEvent(eventKey: string): Promise<ValidationResult[]> {
    try {
      const { data, error } = await this.client
        .from('validation_results')
        .select('*')
        .eq('event_key', eventKey)
        .order('created_at', { ascending: false });

      if (error) {
        throw new DatabaseOperationError(
          `Failed to fetch validation results: ${error.message}`,
          error
        );
      }

      return (data || []).map(this.mapRowToResult);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to find validation results by event', error);
    }
  }

  async getScouterStatistics(
    scouterId: string,
    seasonYear?: number
  ): Promise<ValidationStatistics> {
    try {
      let query = this.client
        .from('validation_results')
        .select('*')
        .eq('scouter_id', scouterId);

      if (seasonYear) {
        query = query.eq('season_year', seasonYear);
      }

      const { data, error } = await query;

      if (error) {
        throw new DatabaseOperationError(
          `Failed to fetch validation statistics: ${error.message}`,
          error
        );
      }

      return this.calculateStatistics(data || []);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to get scouter statistics', error);
    }
  }

  async getEventStatistics(eventKey: string): Promise<ValidationStatistics> {
    try {
      const { data, error } = await this.client
        .from('validation_results')
        .select('*')
        .eq('event_key', eventKey);

      if (error) {
        throw new DatabaseOperationError(
          `Failed to fetch validation statistics: ${error.message}`,
          error
        );
      }

      return this.calculateStatistics(data || []);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to get event statistics', error);
    }
  }

  async deleteByExecution(executionId: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('validation_results')
        .delete()
        .eq('execution_id', executionId);

      if (error) {
        throw new DatabaseOperationError(
          `Failed to delete validation results: ${error.message}`,
          error
        );
      }
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to delete validation results', error);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private mapRowToResult(row: ValidationResultRow): ValidationResult {
    return {
      validationId: row.id,
      scouterId: row.scouter_id,
      matchScoutingId: row.match_scouting_id,
      matchKey: row.match_key,
      teamNumber: row.team_number,
      eventKey: row.event_key,
      seasonYear: row.season_year,
      fieldPath: row.field_path,
      expectedValue: row.expected_value,
      actualValue: row.actual_value,
      outcome: row.validation_outcome,
      accuracyScore: Number(row.accuracy_score),
      confidenceLevel: row.confidence_level ? Number(row.confidence_level) : undefined,
      validationType: row.validation_type,
      validationMethod: row.validation_method,
      executionId: row.execution_id,
      notes: row.notes,
      createdAt: new Date(row.created_at),
    };
  }

  private calculateStatistics(rows: ValidationResultRow[]): ValidationStatistics {
    const totalValidations = rows.length;

    if (totalValidations === 0) {
      return {
        totalValidations: 0,
        exactMatches: 0,
        closeMatches: 0,
        mismatches: 0,
        averageAccuracy: 0,
        byValidationType: new Map(),
        byFieldPath: new Map(),
      };
    }

    let exactMatches = 0;
    let closeMatches = 0;
    let mismatches = 0;
    let totalAccuracy = 0;

    const byValidationType = new Map<
      ValidationStrategyType,
      { count: number; totalAccuracy: number }
    >();
    const byFieldPath = new Map<string, { count: number; totalAccuracy: number }>();

    for (const row of rows) {
      // Count outcomes
      switch (row.validation_outcome) {
        case 'exact_match':
          exactMatches++;
          break;
        case 'close_match':
          closeMatches++;
          break;
        case 'mismatch':
          mismatches++;
          break;
      }

      const accuracy = Number(row.accuracy_score);
      totalAccuracy += accuracy;

      // Group by validation type
      const typeStats = byValidationType.get(row.validation_type) || {
        count: 0,
        totalAccuracy: 0,
      };
      typeStats.count++;
      typeStats.totalAccuracy += accuracy;
      byValidationType.set(row.validation_type, typeStats);

      // Group by field path
      const fieldStats = byFieldPath.get(row.field_path) || {
        count: 0,
        totalAccuracy: 0,
      };
      fieldStats.count++;
      fieldStats.totalAccuracy += accuracy;
      byFieldPath.set(row.field_path, fieldStats);
    }

    // Calculate averages
    const byValidationTypeMap = new Map<
      ValidationStrategyType,
      { count: number; averageAccuracy: number }
    >();
    for (const [type, stats] of byValidationType.entries()) {
      byValidationTypeMap.set(type, {
        count: stats.count,
        averageAccuracy: stats.totalAccuracy / stats.count,
      });
    }

    const byFieldPathMap = new Map<string, { count: number; averageAccuracy: number }>();
    for (const [field, stats] of byFieldPath.entries()) {
      byFieldPathMap.set(field, {
        count: stats.count,
        averageAccuracy: stats.totalAccuracy / stats.count,
      });
    }

    return {
      totalValidations,
      exactMatches,
      closeMatches,
      mismatches,
      averageAccuracy: totalAccuracy / totalValidations,
      byValidationType: byValidationTypeMap,
      byFieldPath: byFieldPathMap,
    };
  }
}

/**
 * Factory function to create repository with service client
 */
export function createValidationResultRepository(): IValidationResultRepository {
  return new ValidationResultRepository();
}
