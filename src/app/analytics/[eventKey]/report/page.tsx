/**
 * Event Analytics Report Page
 *
 * Printable analytics report showing:
 * - Event overview and metadata
 * - Top 5 teams radar chart
 * - Breakdown table with OPR rankings
 * - 8 boxplot charts (all game piece metrics)
 *
 * Optimized for printing to PDF
 *
 * Related: SCOUT-88
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Printer, ArrowLeft, Download } from 'lucide-react';
import { TeamRadarProfile } from '@/components/analytics/TeamRadarProfile';
import { GamePieceBoxplotFull } from '@/components/analytics/GamePieceBoxplotFull';
import { BreakdownTable } from '@/components/analytics/BreakdownTable';
import type { TeamStatistics } from '@/types';

interface Event {
  event_key: string;
  event_name: string;
  start_date: string;
  end_date: string;
  city: string;
  state_prov: string;
  country: string;
  year: number;
}

interface EventReportPageProps {
  params: Promise<{ eventKey: string }>;
}

export default function EventReportPage({ params }: EventReportPageProps) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [teamStats, setTeamStats] = useState<TeamStatistics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt] = useState(new Date());
  const [eventKey, setEventKey] = useState<string | null>(null);

  useEffect(() => {
    params.then(({ eventKey }) => {
      setEventKey(eventKey);
      Promise.all([
        fetchEvent(eventKey),
        fetchTeamStats(eventKey),
      ]).finally(() => setIsLoading(false));
    });
  }, [params]);

  const fetchEvent = async (eventKey: string) => {
    try {
      const response = await fetch(`/api/admin/events/${eventKey}`);
      const data = await response.json();

      if (data.success && data.data) {
        setEvent(data.data);
      } else {
        setError('Failed to load event details');
      }
    } catch (error) {
      console.error('[Report] Error fetching event:', error);
      setError('Failed to load event details');
    }
  };

  const fetchTeamStats = async (eventKey: string) => {
    try {
      const response = await fetch(`/api/analytics/event/${eventKey}`);
      const data = await response.json();

      if (data.success && data.data) {
        setTeamStats(data.data);
      } else {
        setError('Failed to load team statistics');
      }
    } catch (error) {
      console.error('[Report] Error fetching stats:', error);
      setError('Failed to load team statistics');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    // Use browser's print to PDF
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Generating report...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || 'Event not found'}</p>
          <Button onClick={() => router.push('/analytics')}>
            Back to Analytics
          </Button>
        </div>
      </div>
    );
  }

  const eventDate = event.start_date
    ? new Date(event.start_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Date TBD';

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          /* Hide navigation and controls */
          nav,
          header,
          .no-print {
            display: none !important;
          }

          /* Optimize page layout */
          @page {
            size: letter landscape;
            margin: 0.5in;
          }

          body {
            font-size: 10pt;
            line-height: 1.3;
          }

          /* Page breaks */
          .page-break {
            page-break-after: always;
            break-after: always;
          }

          .print-section {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 1.5rem;
          }

          /* Avoid breaking cards */
          .break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          /* Table styling */
          table {
            border-collapse: collapse;
            width: 100%;
          }

          th,
          td {
            border: 1px solid #ddd;
            padding: 6px;
            font-size: 9pt;
          }

          /* Force all chart elements to be visible */
          .recharts-wrapper,
          .recharts-wrapper * {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }

          /* Force SVG visibility */
          svg,
          svg * {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }

          /* Ensure chart surfaces render */
          .recharts-surface {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            height: 100% !important;
          }

          /* Prevent ResponsiveContainer issues */
          .recharts-responsive-container {
            position: relative !important;
            width: 100% !important;
            height: auto !important;
            min-height: 300px !important;
          }

          /* Ensure colors print correctly */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Force chart container dimensions */
          .h-80,
          .h-96 {
            min-height: 300px !important;
          }

          /* Prevent overflow hiding charts */
          .overflow-x-auto {
            overflow: visible !important;
          }

          /* Make sure flex containers don't collapse */
          .flex {
            display: flex !important;
          }

          .items-center {
            align-items: center !important;
          }

          .justify-center {
            justify-content: center !important;
          }
        }

        /* Screen-only controls */
        @media screen {
          .print-header {
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 1rem;
            margin-bottom: 2rem;
          }
        }
      `}</style>

      {/* Screen Controls (Hidden in Print) */}
      <div className="no-print p-6 bg-background border-b sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Button
            onClick={() => router.push('/analytics')}
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Analytics
          </Button>
          <div className="flex gap-2">
            <Button onClick={handleExportPDF} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Save as PDF
            </Button>
            <Button onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print Report
            </Button>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-7xl mx-auto p-6">

        {/* Section 1: Top 5 Teams Radar Chart */}
        <div className="mb-8">
          {eventKey && <TeamRadarProfile eventKey={eventKey} topTeamsCount={6} sortBy="opr" />}
        </div>
        <div className="mb-8">
          {eventKey && <TeamRadarProfile eventKey={eventKey} topTeamsCount={6} sortBy="ccwm" />}
        </div>
        <div className="mb-8">
          {eventKey && <TeamRadarProfile eventKey={eventKey} topTeamsCount={6} sortBy="auto" />}
        </div>
        <div className="mb-8">
          {eventKey && <TeamRadarProfile eventKey={eventKey} topTeamsCount={6} sortBy="teleop" />}
        </div>
        <div className="mb-8">
          {eventKey && <TeamRadarProfile eventKey={eventKey} topTeamsCount={6} sortBy="endgame" />}
        </div>
        <div className="mb-8">
          {eventKey && <TeamRadarProfile eventKey={eventKey} topTeamsCount={6} sortBy="reliability" />}
        </div>

        {/* Page break after radar */}
        <div className="page-break"></div>

        {/* Section 2: OPR Rankings with Breakdowns */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 border-b pb-2">
            Top Teams by OPR with Breakdown Analysis
          </h2>
          {eventKey && (
            <BreakdownTable
              eventKey={eventKey}
              teamStats={teamStats}
              topN={15}
            />
          )}
        </div>

        {/* Page break before boxplots */}
        <div className="page-break"></div>

        {/* Section 3: Game Piece Distribution Boxplots */}
        <div className="mb-8">
          {eventKey && <GamePieceBoxplotFull eventKey={eventKey} teamsPerCategory={10} />}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t text-xs text-muted-foreground print-section">
          <p>
            Generated by FRC Scouting System • {generatedAt.toLocaleString()}
          </p>
          <p className="mt-1">
            Event Key: {eventKey} • Teams: {teamStats.length}
          </p>
        </div>
      </div>
    </>
  );
}
