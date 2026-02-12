/**
 * PitScoutingService
 *
 * Service layer for pit scouting operations. Handles business logic,
 * data transformation, and API communication for pit scouting.
 *
 * Responsibilities:
 * - Data fetching and saving
 * - Business logic (create vs update detection)
 * - Data transformation and validation
 * - Error handling
 */

export interface PitScoutingFormData {
  event_key: string;
  team_number: number;
  scout_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  robot_capabilities: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  autonomous_capabilities: Record<string, any>;
  drive_train?: string;
  drive_motors?: string;
  programming_language?: string;
  robot_weight_lbs?: number;
  height_inches?: number;
  width_inches?: number;
  length_inches?: number;
  physical_description?: string;
  team_strategy?: string;
  preferred_starting_position?: number;
  team_goals?: string;
  team_comments?: string;
  photos?: string[];
  id?: string; // For updates
}

export interface PitScoutingRecord extends PitScoutingFormData {
  id: string;
  created_at: string;
  updated_at: string;
  photos: string[]; // DTO field name (not photo_urls)
}

export interface LoadPitDataResult {
  existingData: PitScoutingRecord | null;
  isExisting: boolean;
}

export interface SavePitDataResult {
  id: string;
  isUpdate: boolean;
  data: PitScoutingRecord;
}

class PitScoutingService {
  /**
   * Load existing pit data for a team at an event
   * Returns null if no existing data found
   */
  async loadPitData(
    eventKey: string,
    teamNumber: number
  ): Promise<LoadPitDataResult> {
    const params = new URLSearchParams({
      event_key: eventKey,
      team_number: teamNumber.toString(),
    });

    const response = await fetch(`/api/pit-scouting?${params.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to load pit data');
    }

    const result = await response.json();
    // API returns { success: true, data: { data: [...], pagination: {...} } }
    const pitData = result.data?.data || [];

    if (pitData.length > 0) {
      return {
        existingData: pitData[0],
        isExisting: true,
      };
    }

    return {
      existingData: null,
      isExisting: false,
    };
  }

  /**
   * Save pit data (create or update)
   * Automatically detects whether to create or update based on presence of ID
   */
  async savePitData(
    formData: PitScoutingFormData
  ): Promise<SavePitDataResult> {
    const isUpdate = !!formData.id;
    const method = isUpdate ? 'PUT' : 'POST';

    // Build request body
    const body: PitScoutingFormData = {
      event_key: formData.event_key,
      team_number: formData.team_number,
      scout_id: formData.scout_id,
      robot_capabilities: formData.robot_capabilities,
      autonomous_capabilities: formData.autonomous_capabilities,
      drive_train: formData.drive_train,
      drive_motors: formData.drive_motors,
      programming_language: formData.programming_language,
      robot_weight_lbs: formData.robot_weight_lbs,
      height_inches: formData.height_inches,
      width_inches: formData.width_inches,
      length_inches: formData.length_inches,
      physical_description: formData.physical_description,
      team_strategy: formData.team_strategy,
      preferred_starting_position: formData.preferred_starting_position,
      team_goals: formData.team_goals,
      team_comments: formData.team_comments,
      photos: formData.photos || [],
    };

    // Add ID for updates
    if (isUpdate && formData.id) {
      body.id = formData.id;
    }

    const response = await fetch('/api/pit-scouting', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to save pit data');
    }

    const result = await response.json();

    return {
      id: result.data.id,
      isUpdate,
      data: result.data,
    };
  }

  /**
   * Transform API response to form state
   * Handles null/undefined values and provides defaults
   */
  transformToFormState(record: PitScoutingRecord | null): {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    robotCapabilities: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    autonomousCapabilities: Record<string, any>;
    physicalSpecs: Record<string, string | number | undefined>;
    photos: string[];
    existingId: string | null;
  } {
    if (!record) {
      return {
        robotCapabilities: { schema_version: '2025.1' },
        autonomousCapabilities: { schema_version: '2025.1' },
        physicalSpecs: {
          drive_train: '',
          drive_motors: '',
          programming_language: '',
        },
        photos: [],
        existingId: null,
      };
    }

    return {
      robotCapabilities: record.robot_capabilities || { schema_version: '2025.1' },
      autonomousCapabilities: record.autonomous_capabilities || { schema_version: '2025.1' },
      physicalSpecs: {
        drive_train: record.drive_train || '',
        drive_motors: record.drive_motors || '',
        programming_language: record.programming_language || '',
        robot_weight_lbs: record.robot_weight_lbs,
        height_inches: record.height_inches,
        width_inches: record.width_inches,
        length_inches: record.length_inches,
        physical_description: record.physical_description,
        team_strategy: record.team_strategy,
        preferred_starting_position: record.preferred_starting_position,
        team_goals: record.team_goals,
        team_comments: record.team_comments,
      },
      photos: record.photos || [],
      existingId: record.id,
    };
  }
}

// Export singleton instance
export const pitScoutingService = new PitScoutingService();
