import React from 'react';
import { FormSection } from '@/components/ui/FormSection';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import type { PitScouting } from '@/types';
import type {
  RobotCapabilities2025,
  AutonomousCapabilities2025,
  EndgameCapabilities2025,
} from '@/types/season-2025';

type ExtendedRobotCapabilities2025 = RobotCapabilities2025 & {
  endgame_capabilities?: EndgameCapabilities2025;
};

interface PitScoutingViewerProps {
  pitScouting?: PitScouting<ExtendedRobotCapabilities2025, AutonomousCapabilities2025>;
  scoutedByName?: string;
}

/**
 * PitScoutingViewer Component
 *
 * Read-only display of 2025 Reefscape pit scouting data.
 * Organizes capabilities into collapsible sections.
 *
 * @example
 * ```tsx
 * <PitScoutingViewer pitScouting={pitData} />
 * ```
 */
export function PitScoutingViewer({ pitScouting, scoutedByName }: PitScoutingViewerProps) {
  if (!pitScouting) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pit Scouting Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No pit scouting data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  const capabilities = pitScouting.robot_capabilities as ExtendedRobotCapabilities2025 | undefined;
  const autoCapabilities = pitScouting.autonomous_capabilities as AutonomousCapabilities2025 | undefined;
  const endgameCapabilities = capabilities?.endgame_capabilities;

  // If no capabilities data, show simple message
  if (!capabilities && !autoCapabilities) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pit Scouting Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Pit scouting data has been collected but capabilities information is not available.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Helper to display boolean as Yes/No badge
  const BooleanBadge = ({ value }: { value: boolean }) => (
    <Badge variant={value ? 'success' : 'secondary'}>
      {value ? 'Yes' : 'No'}
    </Badge>
  );

  // Helper to render a field row
  const FieldRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <span className="text-sm text-gray-900 dark:text-gray-100">
        {value}
      </span>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Pit Scouting Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <FieldRow
            label="Scouted By"
            value={scoutedByName || pitScouting.scouted_by || 'Unknown'}
          />
          {pitScouting.scouted_at && (
            <FieldRow
              label="Scouted At"
              value={new Date(pitScouting.scouted_at).toLocaleString()}
            />
          )}
          {pitScouting.scouting_notes && (
            <div className="pt-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                General Notes
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded">
                {pitScouting.scouting_notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drivetrain & Basic Capabilities */}
      <FormSection
        title="Drivetrain & Physical"
        description="Robot physical characteristics"
        defaultOpen
      >
        <FieldRow
          label="Drive Train Type"
          value={pitScouting.drive_train || 'Not specified'}
        />
        {pitScouting.drive_motors && (
          <FieldRow
            label="Drive Motors"
            value={pitScouting.drive_motors}
          />
        )}
        {pitScouting.programming_language && (
          <FieldRow
            label="Programming Language"
            value={pitScouting.programming_language}
          />
        )}
        <FieldRow
          label="Weight (lbs)"
          value={pitScouting.robot_weight_lbs ? `${pitScouting.robot_weight_lbs} lbs` : 'Not specified'}
        />
        <FieldRow
          label="Dimensions (L×W×H)"
          value={
            pitScouting.length_inches && pitScouting.width_inches && pitScouting.height_inches
              ? `${pitScouting.length_inches}" × ${pitScouting.width_inches}" × ${pitScouting.height_inches}"`
              : 'Not specified'
          }
        />
      </FormSection>

      {/* Game Piece Handling */}
      {capabilities && (
        <FormSection
          title="Game Piece Handling"
          description="Coral and Algae manipulation capabilities"
          defaultOpen
        >
          <FieldRow
            label="Can Handle Coral"
            value={<BooleanBadge value={capabilities.can_handle_coral} />}
          />
          <FieldRow
            label="Can Handle Algae"
            value={<BooleanBadge value={capabilities.can_handle_algae} />}
          />
          <FieldRow
            label="Can Handle Both Simultaneously"
            value={<BooleanBadge value={capabilities.can_handle_both_simultaneously} />}
          />
          {capabilities.preferred_game_piece && (
            <FieldRow
              label="Preferred Game Piece"
              value={
                <Badge variant="default">
                  {capabilities.preferred_game_piece.charAt(0).toUpperCase() +
                    capabilities.preferred_game_piece.slice(1)}
                </Badge>
              }
            />
          )}
          {capabilities.pickup_mechanism_type && (
            <FieldRow
              label="Pickup Mechanism"
              value={capabilities.pickup_mechanism_type}
            />
          )}
        </FormSection>
      )}

      {/* Coral Scoring Capabilities */}
      {capabilities?.can_score_coral && (
        <FormSection
          title="Coral Scoring"
          description="Reef level scoring capabilities"
          defaultOpen
        >
          <FieldRow
            label="Can Score L1"
            value={<BooleanBadge value={capabilities.can_score_L1} />}
          />
          <FieldRow
            label="Can Score L2"
            value={<BooleanBadge value={capabilities.can_score_L2} />}
          />
          <FieldRow
            label="Can Score L3"
            value={<BooleanBadge value={capabilities.can_score_L3} />}
          />
          <FieldRow
            label="Can Score L4"
            value={<BooleanBadge value={capabilities.can_score_L4} />}
          />
          {capabilities.max_reef_level && (
            <FieldRow
              label="Max Reef Level"
              value={<Badge variant="default">{capabilities.max_reef_level}</Badge>}
            />
          )}
        </FormSection>
      )}

      {/* Algae Scoring Capabilities */}
      {capabilities?.can_score_algae && (
        <FormSection
          title="Algae Scoring"
          description="Barge and Processor scoring"
          defaultOpen
        >
          <FieldRow
            label="Can Score in Barge"
            value={<BooleanBadge value={capabilities.can_score_algae_barge} />}
          />
          <FieldRow
            label="Can Score in Processor"
            value={<BooleanBadge value={capabilities.can_score_algae_processor} />}
          />
        </FormSection>
      )}

      {/* Autonomous Capabilities */}
      {autoCapabilities && (
      <FormSection
        title="Autonomous"
        description="Auto period capabilities and strategy"
        defaultOpen
      >
        <FieldRow
          label="Auto Scoring Capability"
          value={<BooleanBadge value={autoCapabilities.auto_scoring_capability} />}
        />
        <FieldRow
          label="Max Coral Pieces in Auto"
          value={autoCapabilities.auto_max_coral_pieces}
        />
        {autoCapabilities.auto_preferred_starting_position && (
          <FieldRow
            label="Preferred Starting Position"
            value={<Badge>{autoCapabilities.auto_preferred_starting_position}</Badge>}
          />
        )}
        <FieldRow
          label="Uses Vision in Auto"
          value={<BooleanBadge value={autoCapabilities.auto_uses_vision} />}
        />
        <FieldRow
          label="Path Planning"
          value={<BooleanBadge value={autoCapabilities.auto_path_planning} />}
        />
        <FieldRow
          label="Multi-Piece Capable"
          value={<BooleanBadge value={autoCapabilities.auto_multi_piece_capable} />}
        />
        {autoCapabilities.auto_success_rate_estimate !== undefined && (
          <FieldRow
            label="Estimated Success Rate"
            value={`${autoCapabilities.auto_success_rate_estimate}%`}
          />
        )}
        {autoCapabilities.auto_strategy_description && (
          <div className="pt-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Auto Strategy
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded">
              {autoCapabilities.auto_strategy_description}
            </p>
          </div>
        )}
      </FormSection>
      )}

      {/* Endgame Capabilities */}
      {endgameCapabilities && (
        <FormSection
          title="Endgame"
          description="Cage climbing and endgame strategy"
          defaultOpen
        >
          <FieldRow
            label="Can Climb Cage"
            value={<BooleanBadge value={endgameCapabilities.can_climb_cage} />}
          />
          {endgameCapabilities.max_cage_level && (
            <FieldRow
              label="Max Cage Level"
              value={
                <Badge variant="default">
                  {endgameCapabilities.max_cage_level.charAt(0).toUpperCase() +
                    endgameCapabilities.max_cage_level.slice(1)}
                </Badge>
              }
            />
          )}
          {endgameCapabilities.endgame_success_rate_estimate !== undefined && (
            <FieldRow
              label="Estimated Success Rate"
              value={`${endgameCapabilities.endgame_success_rate_estimate}%`}
            />
          )}
          {endgameCapabilities.endgame_time_estimate_seconds && (
            <FieldRow
              label="Estimated Time"
              value={`${endgameCapabilities.endgame_time_estimate_seconds}s`}
            />
          )}
          {endgameCapabilities.endgame_preference && (
            <FieldRow
              label="Endgame Preference"
              value={
                <Badge>
                  {endgameCapabilities.endgame_preference.charAt(0).toUpperCase() +
                    endgameCapabilities.endgame_preference.slice(1)}
                </Badge>
              }
            />
          )}
        </FormSection>
      )}

      {/* Performance & Features */}
      {capabilities && (
      <FormSection
        title="Performance & Features"
        description="Cycle time and special features"
        defaultOpen
      >
        {capabilities.estimated_cycle_time_seconds && (
          <FieldRow
            label="Estimated Cycle Time"
            value={`${capabilities.estimated_cycle_time_seconds}s`}
          />
        )}
        {capabilities.scoring_consistency && (
          <FieldRow
            label="Scoring Consistency"
            value={
              <Badge
                variant={
                  capabilities.scoring_consistency === 'high'
                    ? 'success'
                    : capabilities.scoring_consistency === 'medium'
                    ? 'warning'
                    : 'secondary'
                }
              >
                {capabilities.scoring_consistency.charAt(0).toUpperCase() +
                  capabilities.scoring_consistency.slice(1)}
              </Badge>
            }
          />
        )}
        <FieldRow
          label="Vision Targeting"
          value={<BooleanBadge value={capabilities.has_vision_targeting} />}
        />
        <FieldRow
          label="Automated Scoring"
          value={<BooleanBadge value={capabilities.has_automated_scoring} />}
        />
        {capabilities.programming_features && capabilities.programming_features.length > 0 && (
          <div className="pt-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Programming Features
            </p>
            <div className="flex flex-wrap gap-2">
              {capabilities.programming_features.map((feature, index) => (
                <Badge key={index} variant="outline">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </FormSection>
      )}

      {/* Additional Notes */}
      {capabilities?.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {capabilities.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
