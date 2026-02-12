'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { ScoutingSession } from '@/types';
import type { ScouterPresenceState } from '@/types/scouting-session';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface UseLiveScoutingSessionOptions {
  /** Opt-in to presence tracking on the channel */
  presence?: boolean;
  /** Initial presence state to broadcast when joining */
  presenceState?: Partial<ScouterPresenceState>;
  /** Poll interval in ms as fallback when Realtime is slow (default: 5000) */
  pollInterval?: number;
}

export interface UseLiveScoutingSessionReturn {
  session: ScoutingSession | null;
  currentMatchNumber: number;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  setMatchNumber: (n: number) => Promise<void>;
  incrementMatch: () => Promise<void>;
  decrementMatch: () => Promise<void>;
  updateSessionData: (data: Record<string, unknown>) => Promise<void>;
  // Presence (only populated when options.presence = true)
  connectedScouters: ScouterPresenceState[];
  connectedCount: number;
  trackPresence: (state: Partial<ScouterPresenceState>) => void;
  updatePresenceStatus: (status: ScouterPresenceState['status']) => void;
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

async function fetchSession(eventKey: string): Promise<ScoutingSession> {
  const res = await fetch(`/api/scouting-session?event_key=${encodeURIComponent(eventKey)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch session: ${res.statusText}`);
  }
  const json = await res.json();
  return json.data as ScoutingSession;
}

async function patchSession(
  eventKey: string,
  updates: {
    current_match_number?: number;
    comp_level?: string;
    session_data?: Record<string, unknown>;
  }
): Promise<ScoutingSession> {
  const res = await fetch('/api/scouting-session', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_key: eventKey, ...updates }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update session: ${res.statusText}`);
  }
  const json = await res.json();
  return json.data as ScoutingSession;
}

export function useLiveScoutingSession(
  eventKey: string | null,
  options: UseLiveScoutingSessionOptions = {}
): UseLiveScoutingSessionReturn {
  const [session, setSession] = useState<ScoutingSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [connectedScouters, setConnectedScouters] = useState<ScouterPresenceState[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceStateRef = useRef<Partial<ScouterPresenceState> | undefined>(options.presenceState);

  // Keep ref in sync
  useEffect(() => {
    presenceStateRef.current = options.presenceState;
  }, [options.presenceState]);

  // Fetch initial session
  useEffect(() => {
    if (!eventKey) {
      setSession(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchSession(eventKey)
      .then((data) => {
        if (!cancelled) {
          setSession(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(toError(err));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [eventKey]);

  // Subscribe to Realtime changes + optional presence
  useEffect(() => {
    if (!eventKey) return;

    const channel = supabase
      .channel(`scouting-session:${eventKey}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scouting_sessions',
          filter: `event_key=eq.${eventKey}`,
        },
        (payload) => {
          setSession(payload.new as ScoutingSession);
        }
      );

    // Add presence tracking if opted in
    if (options.presence) {
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<ScouterPresenceState>();
        const scouters: ScouterPresenceState[] = [];
        for (const presences of Object.values(state)) {
          for (const p of presences) {
            scouters.push(p as unknown as ScouterPresenceState);
          }
        }
        setConnectedScouters(scouters);
      });
    }

    channel.subscribe(async (status) => {
      setIsConnected(status === 'SUBSCRIBED');

      // Track presence after subscribing
      if (status === 'SUBSCRIBED' && options.presence && presenceStateRef.current) {
        await channel.track(presenceStateRef.current);
      }
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsConnected(false);
      setConnectedScouters([]);
    };
  }, [eventKey, options.presence]);

  // Poll as fallback for Realtime — ensures scouters get session updates
  const pollMs = options.pollInterval ?? 5000;
  useEffect(() => {
    if (!eventKey || pollMs <= 0) return;

    const id = setInterval(() => {
      fetchSession(eventKey)
        .then((data) => setSession(data))
        .catch(() => {/* ignore poll errors — Realtime or next poll will recover */});
    }, pollMs);

    return () => clearInterval(id);
  }, [eventKey, pollMs]);

  const setMatchNumber = useCallback(
    async (n: number) => {
      if (!eventKey || n < 1) return;
      setError(null);
      try {
        const updated = await patchSession(eventKey, { current_match_number: n });
        setSession(updated);
      } catch (err) {
        setError(toError(err));
      }
    },
    [eventKey]
  );

  const incrementMatch = useCallback(async () => {
    if (!session) return;
    await setMatchNumber(session.current_match_number + 1);
  }, [session, setMatchNumber]);

  const decrementMatch = useCallback(async () => {
    if (!session || session.current_match_number <= 1) return;
    await setMatchNumber(session.current_match_number - 1);
  }, [session, setMatchNumber]);

  const updateSessionData = useCallback(
    async (data: Record<string, unknown>) => {
      if (!eventKey) return;
      setError(null);
      try {
        const updated = await patchSession(eventKey, { session_data: data });
        setSession(updated);
      } catch (err) {
        setError(toError(err));
      }
    },
    [eventKey]
  );

  const trackPresence = useCallback(
    (state: Partial<ScouterPresenceState>) => {
      presenceStateRef.current = { ...presenceStateRef.current, ...state };
      if (channelRef.current && isConnected) {
        channelRef.current.track(presenceStateRef.current);
      }
    },
    [isConnected]
  );

  const updatePresenceStatus = useCallback(
    (status: ScouterPresenceState['status']) => {
      trackPresence({ status });
    },
    [trackPresence]
  );

  return {
    session,
    currentMatchNumber: session?.current_match_number ?? 1,
    isConnected,
    isLoading,
    error,
    setMatchNumber,
    incrementMatch,
    decrementMatch,
    updateSessionData,
    connectedScouters,
    connectedCount: connectedScouters.length,
    trackPresence,
    updatePresenceStatus,
  };
}
