/**
 * The Blue Alliance (TBA) Utility Functions
 *
 * Helper functions for working with TBA API data
 */

import type { EventType } from '@/types';

/**
 * Map TBA event type codes to our EventType enum
 *
 * TBA Event Type Codes:
 * - 0: Regional
 * - 1: District
 * - 2: District Championship
 * - 3: Championship Subdivision
 * - 4: Championship
 * - 5: District Championship Division
 * - 6: Festival of Champions
 * - 99: Offseason
 * - 100: Preseason
 *
 * See: https://www.thebluealliance.com/apidocs/v3
 */
export function mapTBAEventType(tbaEventType: number): EventType {
  const mapping: Record<number, EventType> = {
    0: 'regional',
    1: 'district',
    2: 'district_championship',
    3: 'championship_subdivision',
    4: 'championship',
    5: 'district_championship', // District Championship Division
    6: 'offseason', // Festival of Champions
    99: 'offseason',
    100: 'offseason', // Preseason
  };
  return mapping[tbaEventType] || 'offseason';
}
