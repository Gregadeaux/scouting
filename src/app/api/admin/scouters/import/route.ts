/**
 * API Route for Bulk Scouter Import
 * Handles CSV/JSON bulk import of scouters with validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/api/auth-middleware';
import type { CreateScouterInput, ExperienceLevel } from '@/types/scouter';
import { isExperienceLevel, isPreferredRole, areCertifications } from '@/types/scouter';

// ============================================================================
// TYPES
// ============================================================================

interface ImportRow {
  email: string;
  experience_level: ExperienceLevel;
  team_number?: number | null;
  preferred_role?: 'match_scouting' | 'pit_scouting' | 'both' | null;
  certifications?: string[];
  availability_notes?: string | null;
}

interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  failed: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
}

// ============================================================================
// POST /api/admin/scouters/import - Bulk import scouters
// ============================================================================
export async function POST(request: NextRequest) {
  // Require admin authentication
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const supabase = createServiceClient();
    const body = await request.json();

    // Validate request body
    if (!body.scouters || !Array.isArray(body.scouters)) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: 'Request body must contain a "scouters" array',
        },
        { status: 400 }
      );
    }

    const rows: ImportRow[] = body.scouters;

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error: 'Empty import',
          details: 'No scouters to import',
        },
        { status: 400 }
      );
    }

    if (rows.length > 100) {
      return NextResponse.json(
        {
          error: 'Too many rows',
          details: 'Maximum 100 scouters per import',
        },
        { status: 400 }
      );
    }

    // Initialize result tracking
    const result: ImportResult = {
      success: true,
      total: rows.length,
      imported: 0,
      failed: 0,
      errors: [],
    };

    // Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;

      try {
        // Validate required fields
        if (!row.email) {
          result.errors.push({
            row: rowNumber,
            email: row.email || 'unknown',
            error: 'Missing required field: email',
          });
          result.failed++;
          continue;
        }

        if (!row.experience_level) {
          result.errors.push({
            row: rowNumber,
            email: row.email,
            error: 'Missing required field: experience_level',
          });
          result.failed++;
          continue;
        }

        // Validate experience_level
        if (!isExperienceLevel(row.experience_level)) {
          result.errors.push({
            row: rowNumber,
            email: row.email,
            error: 'Invalid experience_level. Must be: rookie, intermediate, or veteran',
          });
          result.failed++;
          continue;
        }

        // Validate preferred_role (if provided)
        if (row.preferred_role && !isPreferredRole(row.preferred_role)) {
          result.errors.push({
            row: rowNumber,
            email: row.email,
            error: 'Invalid preferred_role. Must be: match_scouting, pit_scouting, both, or null',
          });
          result.failed++;
          continue;
        }

        // Validate certifications (if provided)
        if (row.certifications && !areCertifications(row.certifications)) {
          result.errors.push({
            row: rowNumber,
            email: row.email,
            error: 'Invalid certifications array',
          });
          result.failed++;
          continue;
        }

        // Find user by email
        const { data: user, error: userError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('email', row.email)
          .single();

        if (userError || !user) {
          result.errors.push({
            row: rowNumber,
            email: row.email,
            error: `User not found with email: ${row.email}`,
          });
          result.failed++;
          continue;
        }

        // Check if scouter profile already exists
        const { data: existingScouter } = await supabase
          .from('scouters')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (existingScouter) {
          result.errors.push({
            row: rowNumber,
            email: row.email,
            error: 'Scouter profile already exists for this user',
          });
          result.failed++;
          continue;
        }

        // Verify team exists (if provided)
        if (row.team_number) {
          const { data: team, error: teamError } = await supabase
            .from('teams')
            .select('team_number')
            .eq('team_number', row.team_number)
            .single();

          if (teamError || !team) {
            result.errors.push({
              row: rowNumber,
              email: row.email,
              error: `Team not found: ${row.team_number}`,
            });
            result.failed++;
            continue;
          }
        }

        // Create scouter input
        const scouterInput: CreateScouterInput = {
          user_id: user.id,
          experience_level: row.experience_level,
          team_number: row.team_number || null,
          preferred_role: row.preferred_role || null,
          certifications: row.certifications || [],
          availability_notes: row.availability_notes || null,
        };

        // Insert scouter
        const { error: insertError } = await supabase
          .from('scouters')
          .insert([scouterInput]);

        if (insertError) {
          console.error('Error inserting scouter:', insertError);
          result.errors.push({
            row: rowNumber,
            email: row.email,
            error: `Database error: ${insertError.message}`,
          });
          result.failed++;
          continue;
        }

        result.imported++;
      } catch (rowError) {
        console.error(`Error processing row ${rowNumber}:`, rowError);
        result.errors.push({
          row: rowNumber,
          email: row.email || 'unknown',
          error: rowError instanceof Error ? rowError.message : 'Unknown error',
        });
        result.failed++;
      }
    }

    // Set overall success based on results
    result.success = result.failed === 0;

    // Return appropriate status code
    const statusCode = result.failed === 0 ? 200 : result.imported > 0 ? 207 : 400;

    return NextResponse.json(result, { status: statusCode });
  } catch (error) {
    console.error('Error in POST /api/admin/scouters/import:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Example CSV format for documentation
// ============================================================================
/**
 * CSV Import Format:
 *
 * email,experience_level,team_number,preferred_role,certifications,availability_notes
 * john@example.com,veteran,930,both,"pit_certified,match_certified,lead_scout",Available weekends
 * jane@example.com,intermediate,930,match_scouting,match_certified,
 * bob@example.com,rookie,,pit_scouting,,First year scout
 *
 * Notes:
 * - email: Required, must match existing user profile
 * - experience_level: Required, must be: rookie, intermediate, or veteran
 * - team_number: Optional, must match existing team
 * - preferred_role: Optional, must be: match_scouting, pit_scouting, both, or empty
 * - certifications: Optional, comma-separated list of certifications
 * - availability_notes: Optional, free text
 *
 * JSON Import Format:
 * {
 *   "scouters": [
 *     {
 *       "email": "john@example.com",
 *       "experience_level": "veteran",
 *       "team_number": 930,
 *       "preferred_role": "both",
 *       "certifications": ["pit_certified", "match_certified", "lead_scout"],
 *       "availability_notes": "Available weekends"
 *     },
 *     {
 *       "email": "jane@example.com",
 *       "experience_level": "intermediate",
 *       "preferred_role": "match_scouting",
 *       "certifications": ["match_certified"]
 *     }
 *   ]
 * }
 */
