/**
 * JSONB Data Display Demo Page
 *
 * Test page to showcase the JSONBDataDisplay component with sample data
 * from the 2025 Reefscape season.
 */

'use client';

import React from 'react';
import { JSONBDataDisplay, JSONBDataDisplayInline } from '@/components/scouting';
import { REEFSCAPE_CONFIG } from '@/lib/config/season-2025';
import {
  DEFAULT_AUTO_PERFORMANCE_2025,
  DEFAULT_TELEOP_PERFORMANCE_2025,
  DEFAULT_ENDGAME_PERFORMANCE_2025,
} from '@/types/season-2025';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

// Sample data for testing
const sampleAutoPerformance = {
  ...DEFAULT_AUTO_PERFORMANCE_2025,
  left_starting_zone: true,
  coral_scored_L1: 2,
  coral_scored_L2: 3,
  coral_scored_L3: 1,
  coral_scored_L4: 0,
  coral_missed: 1,
  preloaded_piece_type: 'coral' as const,
  preloaded_piece_scored: true,
  notes: 'Strong auto performance with consistent scoring on L2. Missed one attempt on L3.',
};

const sampleTeleopPerformance = {
  ...DEFAULT_TELEOP_PERFORMANCE_2025,
  coral_scored_L1: 5,
  coral_scored_L2: 8,
  coral_scored_L3: 6,
  coral_scored_L4: 2,
  coral_missed: 3,
  algae_scored_barge: 4,
  algae_scored_processor: 2,
  algae_missed: 1,
  cycles_completed: 12,
  ground_pickup_coral: 8,
  station_pickup_coral: 13,
  ground_pickup_algae: 3,
  reef_pickup_algae: 2,
  lollipop_pickup_algae: 1,
  defense_time_seconds: 15,
  defense_effectiveness: 'moderate' as const,
  defended_by_opponent_seconds: 8,
  penalties_caused: 1,
  notes: 'Very efficient cycling. Preferred L2 scoring. Brief defensive play in final minute.',
};

const sampleEndgamePerformance = {
  ...DEFAULT_ENDGAME_PERFORMANCE_2025,
  cage_climb_attempted: true,
  cage_climb_successful: true,
  cage_level_achieved: 'deep' as const,
  endgame_start_time_seconds: 125,
  endgame_completion_time_seconds: 8,
  endgame_points: 12,
  cooperation_with_alliance: 'Coordinated well with 1678, waited for them to position before climbing.',
  notes: 'Clean deep cage climb. Very reliable.',
};

export default function ScoutingDataDemoPage() {
  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          JSONB Data Display Component Demo
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Testing the JSONBDataDisplay component with 2025 Reefscape sample data
        </p>
      </div>

      {/* Autonomous Period - Standard View */}
      <Card>
        <CardHeader>
          <CardTitle>Autonomous Period - Standard View</CardTitle>
        </CardHeader>
        <CardContent>
          <JSONBDataDisplay
            data={sampleAutoPerformance}
            seasonConfig={REEFSCAPE_CONFIG}
            compact={false}
            collapsible={true}
            showCopy={true}
            title="Auto Performance"
          />
        </CardContent>
      </Card>

      {/* Autonomous Period - Compact View */}
      <Card>
        <CardHeader>
          <CardTitle>Autonomous Period - Compact View</CardTitle>
        </CardHeader>
        <CardContent>
          <JSONBDataDisplay
            data={sampleAutoPerformance}
            seasonConfig={REEFSCAPE_CONFIG}
            compact={true}
            collapsible={true}
            showCopy={true}
          />
        </CardContent>
      </Card>

      {/* Teleoperated Period - Standard View */}
      <Card>
        <CardHeader>
          <CardTitle>Teleoperated Period - Standard View</CardTitle>
        </CardHeader>
        <CardContent>
          <JSONBDataDisplay
            data={sampleTeleopPerformance}
            seasonConfig={REEFSCAPE_CONFIG}
            compact={false}
            collapsible={true}
            showCopy={true}
            title="Teleop Performance"
          />
        </CardContent>
      </Card>

      {/* Teleoperated Period - Compact View */}
      <Card>
        <CardHeader>
          <CardTitle>Teleoperated Period - Compact View (Max Info Density)</CardTitle>
        </CardHeader>
        <CardContent>
          <JSONBDataDisplay
            data={sampleTeleopPerformance}
            seasonConfig={REEFSCAPE_CONFIG}
            compact={true}
            collapsible={true}
            showCopy={true}
          />
        </CardContent>
      </Card>

      {/* Endgame Period - Standard View */}
      <Card>
        <CardHeader>
          <CardTitle>Endgame Period - Standard View</CardTitle>
        </CardHeader>
        <CardContent>
          <JSONBDataDisplay
            data={sampleEndgamePerformance}
            seasonConfig={REEFSCAPE_CONFIG}
            compact={false}
            collapsible={true}
            showCopy={true}
            title="Endgame Performance"
          />
        </CardContent>
      </Card>

      {/* Inline Display */}
      <Card>
        <CardHeader>
          <CardTitle>Inline Display (No Sections)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Auto Performance
              </h4>
              <JSONBDataDisplayInline
                data={sampleAutoPerformance}
                seasonConfig={REEFSCAPE_CONFIG}
                showCopy={true}
              />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Endgame Performance
              </h4>
              <JSONBDataDisplayInline
                data={sampleEndgamePerformance}
                seasonConfig={REEFSCAPE_CONFIG}
                showCopy={true}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section Filtering Example */}
      <Card>
        <CardHeader>
          <CardTitle>Section Filtering - Coral Scoring Only</CardTitle>
        </CardHeader>
        <CardContent>
          <JSONBDataDisplay
            data={sampleTeleopPerformance}
            seasonConfig={REEFSCAPE_CONFIG}
            sections={['Coral Scoring', 'Algae Scoring']}
            compact={true}
            collapsible={true}
            showCopy={false}
          />
        </CardContent>
      </Card>

      {/* All Three Periods Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Auto</CardTitle>
          </CardHeader>
          <CardContent>
            <JSONBDataDisplay
              data={sampleAutoPerformance}
              seasonConfig={REEFSCAPE_CONFIG}
              compact={true}
              collapsible={false}
              showCopy={false}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Teleop</CardTitle>
          </CardHeader>
          <CardContent>
            <JSONBDataDisplay
              data={sampleTeleopPerformance}
              seasonConfig={REEFSCAPE_CONFIG}
              compact={true}
              collapsible={false}
              showCopy={false}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Endgame</CardTitle>
          </CardHeader>
          <CardContent>
            <JSONBDataDisplay
              data={sampleEndgamePerformance}
              seasonConfig={REEFSCAPE_CONFIG}
              compact={true}
              collapsible={false}
              showCopy={false}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
