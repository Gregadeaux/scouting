/**
 * ScoutingDataDetail Component
 * Detail modal/drawer for viewing full scouting data with JSONBDataDisplay
 */

'use client';

import React, { useState } from 'react';
import { X, Copy, Trash2, ExternalLink, Users, Calendar, Trophy } from 'lucide-react';
import { JSONBDataDisplay } from '@/components/scouting/JSONBDataDisplay';
import { Button } from '@/components/ui/Button';
import { REEFSCAPE_CONFIG } from '@/lib/config/season-2025';
import type { ScoutingEntryWithDetails } from '@/types/admin';
import Link from 'next/link';

interface ScoutingDataDetailProps {
  entry: ScoutingEntryWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export function ScoutingDataDetail({
  entry,
  isOpen,
  onClose,
  onDelete,
}: ScoutingDataDetailProps) {
  const [activeTab, setActiveTab] = useState<'auto' | 'teleop' | 'endgame' | 'context'>('auto');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !entry) return null;

  const handleCopy = async () => {
    try {
      const dataToCopy = {
        match_key: entry.match_key,
        team_number: entry.team_number,
        scout_name: entry.scout_name,
        auto_performance: entry.auto_performance,
        teleop_performance: entry.teleop_performance,
        endgame_performance: entry.endgame_performance,
        created_at: entry.created_at,
      };
      await navigator.clipboard.writeText(JSON.stringify(dataToCopy, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(entry.id);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  const getCompLevelDisplay = (level?: string) => {
    switch (level) {
      case 'qm': return 'Qualification Match';
      case 'ef': return 'Elimination Match';
      case 'qf': return 'Quarterfinal';
      case 'sf': return 'Semifinal';
      case 'f': return 'Final';
      default: return 'Match';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 z-50 mx-auto my-8 max-w-5xl overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-900 lg:inset-x-auto">
        {/* Header */}
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Match Scouting Details
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span className="font-medium">Team {entry.team_number}</span>
                  {entry.team_name && <span>- {entry.team_name}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4" />
                  <span>{getCompLevelDisplay(entry.comp_level)} #{entry.match_number || '-'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{entry.event_name || entry.event_key}</span>
                </div>
              </div>
              <div className="mt-1 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>Scout: <strong>{entry.scout_name}</strong></span>
                <span>Submitted: {new Date(entry.created_at).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
              >
                {copied ? 'Copied!' : 'Copy Data'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <button
                onClick={onClose}
                className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-6 px-6">
            <button
              onClick={() => setActiveTab('auto')}
              className={`border-b-2 py-3 text-sm font-medium transition-colors ${
                activeTab === 'auto'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Autonomous
            </button>
            <button
              onClick={() => setActiveTab('teleop')}
              className={`border-b-2 py-3 text-sm font-medium transition-colors ${
                activeTab === 'teleop'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Teleoperated
            </button>
            <button
              onClick={() => setActiveTab('endgame')}
              className={`border-b-2 py-3 text-sm font-medium transition-colors ${
                activeTab === 'endgame'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Endgame
            </button>
            <button
              onClick={() => setActiveTab('context')}
              className={`border-b-2 py-3 text-sm font-medium transition-colors ${
                activeTab === 'context'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Match Context
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          <div className="p-6">
            {activeTab === 'auto' && (
              <div>
                <div className="mb-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-blue-900 dark:text-blue-100">
                      Autonomous Performance
                    </h3>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {entry.preview_metrics.auto_points} points
                    </div>
                  </div>
                </div>
                <JSONBDataDisplay
                  data={entry.auto_performance}
                  seasonConfig={REEFSCAPE_CONFIG}
                  compact={false}
                  collapsible={false}
                  showCopy={false}
                />
              </div>
            )}

            {activeTab === 'teleop' && (
              <div>
                <div className="mb-4 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-green-900 dark:text-green-100">
                      Teleoperated Performance
                    </h3>
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {entry.preview_metrics.teleop_points} points
                    </div>
                  </div>
                </div>
                <JSONBDataDisplay
                  data={entry.teleop_performance}
                  seasonConfig={REEFSCAPE_CONFIG}
                  compact={false}
                  collapsible={false}
                  showCopy={false}
                />
              </div>
            )}

            {activeTab === 'endgame' && (
              <div>
                <div className="mb-4 rounded-lg bg-purple-50 p-3 dark:bg-purple-900/20">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-purple-900 dark:text-purple-100">
                      Endgame Performance
                    </h3>
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {entry.preview_metrics.endgame_points} points
                    </div>
                  </div>
                </div>
                <JSONBDataDisplay
                  data={entry.endgame_performance}
                  seasonConfig={REEFSCAPE_CONFIG}
                  compact={false}
                  collapsible={false}
                  showCopy={false}
                />
              </div>
            )}

            {activeTab === 'context' && (
              <div className="space-y-6">
                <div>
                  <h3 className="mb-3 text-lg font-medium text-gray-900 dark:text-gray-100">
                    Match Information
                  </h3>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Match Key
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                          {entry.match_key}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Competition Level
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                          {getCompLevelDisplay(entry.comp_level)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Event
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                          {entry.event_name || entry.event_key}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Total Score
                        </dt>
                        <dd className="mt-1 text-lg font-bold text-blue-600 dark:text-blue-400">
                          {entry.preview_metrics.total_points} points
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-lg font-medium text-gray-900 dark:text-gray-100">
                    Score Breakdown
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-800">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {entry.preview_metrics.auto_points}
                      </div>
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Autonomous
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-800">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {entry.preview_metrics.teleop_points}
                      </div>
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Teleoperated
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-700 dark:bg-gray-800">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {entry.preview_metrics.endgame_points}
                      </div>
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Endgame
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-3 text-lg font-medium text-gray-900 dark:text-gray-100">
                    Quick Links
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/teams/${entry.team_number}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
                    >
                      View Team Profile
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <Link
                      href={`/admin/matches/${entry.match_key}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
                    >
                      View Match Details
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Delete Scouting Entry?
            </h3>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to delete this scouting entry? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Entry
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}