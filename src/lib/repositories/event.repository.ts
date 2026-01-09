/**
 * Repository for event data access
 * Handles CRUD operations for FRC events
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import type { Event } from '@/types';
import {
  RepositoryError,

  DatabaseOperationError,
} from './base.repository';

/**
 * Event Repository Interface
 */
export interface IEventRepository {
  findByEventKey(eventKey: string): Promise<Event | null>;
  findByYear(year: number): Promise<Event[]>;
  upsert(event: Partial<Event>): Promise<Event>;
  updateFromTBA(eventKey: string, tbaData: Partial<Event>): Promise<Event>;
}

/**
 * Event Repository Implementation
 */
export class EventRepository implements IEventRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || createServiceClient();
  }

  /**
   * Find event by event key
   */
  async findByEventKey(eventKey: string): Promise<Event | null> {
    try {
      const { data, error } = await this.client
        .from('events')
        .select('*')
        .eq('event_key', eventKey)
        .single();

      if (error) {
        // Not found is expected, not an error
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new DatabaseOperationError('find event by key', error);
      }

      return data as Event;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find event by key', error);
    }
  }

  /**
   * Find events by year
   */
  async findByYear(year: number): Promise<Event[]> {
    try {
      const { data, error } = await this.client
        .from('events')
        .select('*')
        .eq('year', year)
        .order('start_date', { ascending: true });

      if (error) {
        throw new DatabaseOperationError('find events by year', error);
      }

      return (data || []) as Event[];
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('find events by year', error);
    }
  }

  /**
   * Upsert an event
   */
  async upsert(event: Partial<Event>): Promise<Event> {
    try {
      if (!event.event_key) {
        throw new RepositoryError('event_key is required for upsert');
      }

      const { data, error } = await this.client
        .from('events')
        .upsert(event, {
          onConflict: 'event_key',
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (error) {
        throw new DatabaseOperationError('upsert event', error);
      }

      if (!data) {
        throw new RepositoryError('Failed to upsert event - no data returned');
      }

      return data as Event;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('upsert event', error);
    }
  }

  /**
   * Update event from TBA data
   */
  async updateFromTBA(eventKey: string, tbaData: Partial<Event>): Promise<Event> {
    try {
      // Get existing event to preserve local fields
      const existingEvent = await this.findByEventKey(eventKey);

      // Merge TBA data with local data
      const mergedEvent: Partial<Event> = {
        ...tbaData,
        event_key: eventKey, // Ensure event_key is set
      };

      // If event exists, preserve local-only fields if they exist
      if (existingEvent) {
        // Currently no local-only fields in Event schema
        // but this pattern would preserve them
      }

      return await this.upsert(mergedEvent);
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new DatabaseOperationError('update event from TBA', error);
    }
  }
}

/**
 * Factory function for dependency injection
 */
export function createEventRepository(client?: SupabaseClient): IEventRepository {
  return new EventRepository(client);
}
