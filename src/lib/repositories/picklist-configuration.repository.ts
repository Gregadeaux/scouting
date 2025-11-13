/**
 * PickList Configuration Repository
 *
 * Data access layer for managing saved picklist view configurations.
 * Handles CRUD operations for the picklist_configurations table.
 *
 * Related: SCOUT-58
 */

import { createClient } from '@/lib/supabase/server';
import type {
  PickListConfiguration,
  SaveConfigurationRequest,
  UpdateConfigurationRequest,
} from '@/types/picklist';

/**
 * Repository for picklist configuration operations
 */
export class PickListConfigurationRepository {
  /**
   * Find all configurations for a user and event
   */
  async findByUserAndEvent(
    userId: string,
    eventKey: string
  ): Promise<PickListConfiguration[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('picklist_configurations')
      .select('*')
      .eq('user_id', userId)
      .eq('event_key', eventKey)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch configurations: ${error.message}`);
    }

    return this.mapToDomain(data || []);
  }

  /**
   * Find a configuration by ID
   */
  async findById(id: string): Promise<PickListConfiguration | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('picklist_configurations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to fetch configuration: ${error.message}`);
    }

    return data ? this.mapToDomain([data])[0] : null;
  }

  /**
   * Create a new configuration
   */
  async create(
    data: SaveConfigurationRequest,
    userId: string
  ): Promise<PickListConfiguration> {
    const supabase = await createClient();

    // If setting as default, unset other defaults for this user/event
    if (data.isDefault) {
      await this.unsetDefaults(userId, data.eventKey);
    }

    const { data: created, error } = await supabase
      .from('picklist_configurations')
      .insert({
        user_id: userId,
        event_key: data.eventKey,
        name: data.name,
        configuration: data.configuration,
        is_default: data.isDefault || false,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        throw new Error(
          `A configuration named "${data.name}" already exists for this event`
        );
      }
      throw new Error(`Failed to create configuration: ${error.message}`);
    }

    return this.mapToDomain([created])[0];
  }

  /**
   * Update an existing configuration
   */
  async update(
    id: string,
    data: UpdateConfigurationRequest
  ): Promise<PickListConfiguration> {
    const supabase = await createClient();

    // Get current config to check user/event for default handling
    const current = await this.findById(id);
    if (!current) {
      throw new Error('Configuration not found');
    }

    // If setting as default, unset other defaults
    if (data.isDefault && !current.isDefault) {
      await this.unsetDefaults(current.userId, current.eventKey);
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.configuration !== undefined)
      updateData.configuration = data.configuration;
    if (data.isDefault !== undefined) updateData.is_default = data.isDefault;

    const { data: updated, error } = await supabase
      .from('picklist_configurations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        throw new Error(
          `A configuration named "${data.name}" already exists for this event`
        );
      }
      throw new Error(`Failed to update configuration: ${error.message}`);
    }

    return this.mapToDomain([updated])[0];
  }

  /**
   * Delete a configuration
   */
  async delete(id: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('picklist_configurations')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete configuration: ${error.message}`);
    }
  }

  /**
   * Set a configuration as default (and unset others)
   */
  async setDefault(
    id: string,
    eventKey: string,
    userId: string
  ): Promise<void> {
    const supabase = await createClient();

    // Unset all other defaults for this user/event
    await this.unsetDefaults(userId, eventKey);

    // Set this one as default
    const { error } = await supabase
      .from('picklist_configurations')
      .update({ is_default: true })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to set default configuration: ${error.message}`);
    }
  }

  /**
   * Unset all default configurations for a user/event
   */
  private async unsetDefaults(userId: string, eventKey: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('picklist_configurations')
      .update({ is_default: false })
      .eq('user_id', userId)
      .eq('event_key', eventKey)
      .eq('is_default', true);

    if (error) {
      throw new Error(`Failed to unset default configurations: ${error.message}`);
    }
  }

  /**
   * Map database records to domain models
   */
  private mapToDomain(
    records: Record<string, unknown>[]
  ): PickListConfiguration[] {
    return records.map((record) => ({
      id: record.id as string,
      userId: record.user_id as string,
      eventKey: record.event_key as string,
      name: record.name as string,
      configuration: record.configuration as PickListConfiguration['configuration'],
      isDefault: record.is_default as boolean,
      createdAt: new Date(record.created_at as string),
      updatedAt: new Date(record.updated_at as string),
    }));
  }
}

/**
 * Singleton instance
 */
export const pickListConfigurationRepository =
  new PickListConfigurationRepository();
