/**
 * Repository for validation consensus data access
 * Handles CRUD operations for consensus values calculated from multiple scouters
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import type {
  ConsensusValue,
  ValidationConsensusRow,
  ValidationContext,
  ConsensusMethod,
} from '@/types/validation';
import {
  RepositoryError,
  EntityNotFoundError,
  DatabaseOperationError,
} from './base.repository';

/**
 * Validation Consensus Repository Interface
 */
export interface IValidationConsensusRepository {
  /**
   * Upsert a consensus value (create or update if exists)
   */
  upsertConsensus(
    consensus: ConsensusValue,
    context: ValidationContext
  ): Promise<void>;

  /**
   * Upsert multiple consensus values (batch)
   */
  upsertConsensusBatch(
    consensusValues: Array<{ consensus: ConsensusValue; context: ValidationContext }>
  ): Promise<void>;

  /**
   * Get consensus for a specific field
   */
  getConsensus(
    matchKey: string,
    teamNumber: number,
    fieldPath: string
  ): Promise<ConsensusValue | null>;

  /**
   * Get all consensus values for a match/team combination
   */
  getMatchConsensus(matchKey: string, teamNumber: number): Promise<ConsensusValue[]>;

  /**
   * Get all consensus values for an event
   * Returns a map of "matchKey_teamNumber" -> ConsensusValue[]
   */
  getEventConsensus(eventKey: string): Promise<Map<string, ConsensusValue[]>>;

  /**
   * Get consensus values for a specific execution
   */
  getExecutionConsensus(executionId: string): Promise<ConsensusValue[]>;

  /**
   * Delete consensus values by execution ID
   */
  deleteByExecution(executionId: string): Promise<void>;

  /**
   * Get fields with low agreement (below threshold)
   */
  getLowAgreementFields(
    eventKey: string,
    agreementThreshold: number
  ): Promise<Array<{
    matchKey: string;
    teamNumber: number;
    fieldPath: string;
    agreementPercentage: number;
    scoutCount: number;
  }>>;
}

/**
 * Validation Consensus Repository Implementation
 */
export class ValidationConsensusRepository implements IValidationConsensusRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || createServiceClient();
  }

  async upsertConsensus(
    consensus: ConsensusValue,
    context: ValidationContext
  ): Promise<void> {
    try {
      const { error } = await this.client
        .from('validation_consensus')
        .upsert({
          match_key: context.matchKey!,
          team_number: context.teamNumber!,
          event_key: context.eventKey,
          season_year: context.seasonYear,
          field_path: consensus.fieldPath,
          consensus_value: consensus.value,
          consensus_method: consensus.method,
          scout_count: consensus.scoutCount,
          scouter_ids: [], // This should be passed in context
          agreement_percentage: consensus.agreementPercentage,
          standard_deviation: consensus.standardDeviation,
          outlier_count: consensus.outlierCount || 0,
          execution_id: context.executionId || crypto.randomUUID(),
        }, {
          onConflict: 'match_key,team_number,field_path'
        });

      if (error) {
        throw new DatabaseOperationError(
          `Failed to upsert consensus: ${error.message}`,
          error
        );
      }
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to upsert consensus', error);
    }
  }

  async upsertConsensusBatch(
    consensusValues: Array<{ consensus: ConsensusValue; context: ValidationContext; scouterIds: string[] }>
  ): Promise<void> {
    if (consensusValues.length === 0) return;

    try {
      const rows = consensusValues.map(({ consensus, context, scouterIds }) => ({
        match_key: context.matchKey!,
        team_number: context.teamNumber!,
        event_key: context.eventKey,
        season_year: context.seasonYear,
        field_path: consensus.fieldPath,
        consensus_value: consensus.value,
        consensus_method: consensus.method,
        scout_count: consensus.scoutCount,
        scouter_ids: scouterIds,
        agreement_percentage: consensus.agreementPercentage,
        standard_deviation: consensus.standardDeviation,
        outlier_count: consensus.outlierCount || 0,
        execution_id: context.executionId || crypto.randomUUID(),
      }));

      // Upsert in batches of 1000
      const batchSize = 1000;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error } = await this.client
          .from('validation_consensus')
          .upsert(batch, {
            onConflict: 'match_key,team_number,field_path'
          });

        if (error) {
          throw new DatabaseOperationError(
            `Failed to upsert consensus batch: ${error.message}`,
            error
          );
        }
      }
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to upsert consensus batch', error);
    }
  }

  async getConsensus(
    matchKey: string,
    teamNumber: number,
    fieldPath: string
  ): Promise<ConsensusValue | null> {
    try {
      const { data, error } = await this.client
        .from('validation_consensus')
        .select('*')
        .eq('match_key', matchKey)
        .eq('team_number', teamNumber)
        .eq('field_path', fieldPath)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No consensus found
          return null;
        }
        throw new DatabaseOperationError(
          `Failed to fetch consensus: ${error.message}`,
          error
        );
      }

      return this.mapRowToConsensus(data);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to get consensus', error);
    }
  }

  async getMatchConsensus(matchKey: string, teamNumber: number): Promise<ConsensusValue[]> {
    try {
      const { data, error } = await this.client
        .from('validation_consensus')
        .select('*')
        .eq('match_key', matchKey)
        .eq('team_number', teamNumber)
        .order('field_path', { ascending: true });

      if (error) {
        throw new DatabaseOperationError(
          `Failed to fetch match consensus: ${error.message}`,
          error
        );
      }

      return (data || []).map(this.mapRowToConsensus);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to get match consensus', error);
    }
  }

  async getEventConsensus(eventKey: string): Promise<Map<string, ConsensusValue[]>> {
    try {
      const { data, error } = await this.client
        .from('validation_consensus')
        .select('*')
        .eq('event_key', eventKey)
        .order('match_key', { ascending: true })
        .order('team_number', { ascending: true })
        .order('field_path', { ascending: true });

      if (error) {
        throw new DatabaseOperationError(
          `Failed to fetch event consensus: ${error.message}`,
          error
        );
      }

      // Group by match_key + team_number
      const consensusMap = new Map<string, ConsensusValue[]>();

      for (const row of data || []) {
        const key = `${row.match_key}_${row.team_number}`;
        const consensus = this.mapRowToConsensus(row);

        if (!consensusMap.has(key)) {
          consensusMap.set(key, []);
        }
        consensusMap.get(key)!.push(consensus);
      }

      return consensusMap;
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to get event consensus', error);
    }
  }

  async getExecutionConsensus(executionId: string): Promise<ConsensusValue[]> {
    try {
      const { data, error } = await this.client
        .from('validation_consensus')
        .select('*')
        .eq('execution_id', executionId)
        .order('match_key', { ascending: true })
        .order('team_number', { ascending: true })
        .order('field_path', { ascending: true });

      if (error) {
        throw new DatabaseOperationError(
          `Failed to fetch execution consensus: ${error.message}`,
          error
        );
      }

      return (data || []).map(this.mapRowToConsensus);
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to get execution consensus', error);
    }
  }

  async deleteByExecution(executionId: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('validation_consensus')
        .delete()
        .eq('execution_id', executionId);

      if (error) {
        throw new DatabaseOperationError(
          `Failed to delete consensus: ${error.message}`,
          error
        );
      }
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to delete consensus', error);
    }
  }

  async getLowAgreementFields(
    eventKey: string,
    agreementThreshold: number = 70
  ): Promise<Array<{
    matchKey: string;
    teamNumber: number;
    fieldPath: string;
    agreementPercentage: number;
    scoutCount: number;
  }>> {
    try {
      const { data, error } = await this.client
        .from('validation_consensus')
        .select('match_key, team_number, field_path, agreement_percentage, scout_count')
        .eq('event_key', eventKey)
        .lt('agreement_percentage', agreementThreshold)
        .order('agreement_percentage', { ascending: true });

      if (error) {
        throw new DatabaseOperationError(
          `Failed to fetch low agreement fields: ${error.message}`,
          error
        );
      }

      return (data || []).map((row) => ({
        matchKey: row.match_key,
        teamNumber: row.team_number,
        fieldPath: row.field_path,
        agreementPercentage: Number(row.agreement_percentage),
        scoutCount: row.scout_count,
      }));
    } catch (error) {
      if (error instanceof RepositoryError) throw error;
      throw new DatabaseOperationError('Failed to get low agreement fields', error);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private mapRowToConsensus(row: ValidationConsensusRow): ConsensusValue {
    return {
      fieldPath: row.field_path,
      value: row.consensus_value,
      method: row.consensus_method,
      scoutCount: row.scout_count,
      agreementPercentage: Number(row.agreement_percentage),
      confidenceLevel: this.calculateConfidence(
        row.scout_count,
        Number(row.agreement_percentage)
      ),
      standardDeviation: row.standard_deviation ? Number(row.standard_deviation) : undefined,
      outlierCount: row.outlier_count,
    };
  }

  /**
   * Calculate confidence level based on scout count and agreement
   *
   * More scouts + higher agreement = higher confidence
   */
  private calculateConfidence(scoutCount: number, agreementPercentage: number): number {
    // Normalize inputs
    const scoutFactor = Math.min(scoutCount / 10, 1); // Max at 10 scouts
    const agreementFactor = agreementPercentage / 100;

    // Weighted average (70% agreement, 30% scout count)
    return 0.7 * agreementFactor + 0.3 * scoutFactor;
  }
}

/**
 * Factory function to create repository with service client
 */
export function createValidationConsensusRepository(): IValidationConsensusRepository {
  return new ValidationConsensusRepository();
}
