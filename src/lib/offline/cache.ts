/**
 * Offline Cache Utilities
 *
 * Provides caching for match schedules and team lists to enable
 * offline access to critical data needed for scouting.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { MatchSchedule, Team, Event } from '@/types';

interface OfflineCacheDB extends DBSchema {
  matches: {
    key: string; // eventKey
    value: {
      eventKey: string;
      matches: MatchSchedule[];
      cachedAt: number;
    };
  };
  teams: {
    key: string; // eventKey
    value: {
      eventKey: string;
      teams: Team[];
      cachedAt: number;
    };
  };
  events: {
    key: string; // year
    value: {
      year: string;
      events: Event[];
      cachedAt: number;
    };
  };
}

const DB_NAME = 'offline-cache';
const DB_VERSION = 1;
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

/**
 * Open or create the offline cache database
 */
export async function openCache(): Promise<IDBPDatabase<OfflineCacheDB>> {
  return openDB<OfflineCacheDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('matches')) {
        db.createObjectStore('matches', { keyPath: 'eventKey' });
      }
      if (!db.objectStoreNames.contains('teams')) {
        db.createObjectStore('teams', { keyPath: 'eventKey' });
      }
      if (!db.objectStoreNames.contains('events')) {
        db.createObjectStore('events', { keyPath: 'year' });
      }
    },
  });
}

/**
 * Cache match schedule for an event
 */
export async function cacheMatches(eventKey: string, matches: MatchSchedule[]): Promise<void> {
  try {
    const db = await openCache();
    await db.put('matches', {
      eventKey,
      matches,
      cachedAt: Date.now(),
    });
  } catch (error) {
    console.error('Failed to cache matches:', error);
  }
}

/**
 * Get cached match schedule for an event
 * @returns Cached matches or null if not cached or expired
 */
export async function getCachedMatches(eventKey: string): Promise<MatchSchedule[] | null> {
  try {
    const db = await openCache();
    const cached = await db.get('matches', eventKey);

    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.cachedAt > CACHE_DURATION) {
      // Delete expired cache
      await db.delete('matches', eventKey);
      return null;
    }

    return cached.matches;
  } catch (error) {
    console.error('Failed to get cached matches:', error);
    return null;
  }
}

/**
 * Cache team list for an event
 */
export async function cacheTeams(eventKey: string, teams: Team[]): Promise<void> {
  try {
    const db = await openCache();
    await db.put('teams', {
      eventKey,
      teams,
      cachedAt: Date.now(),
    });
  } catch (error) {
    console.error('Failed to cache teams:', error);
  }
}

/**
 * Get cached team list for an event
 * @returns Cached teams or null if not cached or expired
 */
export async function getCachedTeams(eventKey: string): Promise<Team[] | null> {
  try {
    const db = await openCache();
    const cached = await db.get('teams', eventKey);

    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.cachedAt > CACHE_DURATION) {
      // Delete expired cache
      await db.delete('teams', eventKey);
      return null;
    }

    return cached.teams;
  } catch (error) {
    console.error('Failed to get cached teams:', error);
    return null;
  }
}

/**
 * Cache event list for a year
 */
export async function cacheEvents(year: string, events: Event[]): Promise<void> {
  try {
    const db = await openCache();
    await db.put('events', {
      year,
      events,
      cachedAt: Date.now(),
    });
  } catch (error) {
    console.error('Failed to cache events:', error);
  }
}

/**
 * Get cached event list for a year
 * @returns Cached events or null if not cached or expired
 */
export async function getCachedEvents(year: string): Promise<Event[] | null> {
  try {
    const db = await openCache();
    const cached = await db.get('events', year);

    if (!cached) return null;

    // Check if cache is expired (use longer duration for events)
    const eventCacheDuration = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - cached.cachedAt > eventCacheDuration) {
      // Delete expired cache
      await db.delete('events', year);
      return null;
    }

    return cached.events;
  } catch (error) {
    console.error('Failed to get cached events:', error);
    return null;
  }
}

/**
 * Clear all cached data
 */
export async function clearCache(): Promise<void> {
  try {
    const db = await openCache();
    const tx = db.transaction(['matches', 'teams', 'events'], 'readwrite');
    await Promise.all([
      tx.objectStore('matches').clear(),
      tx.objectStore('teams').clear(),
      tx.objectStore('events').clear(),
    ]);
    await tx.done;
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  matchesCount: number;
  teamsCount: number;
  eventsCount: number;
  oldestCacheTime: number | null;
}> {
  try {
    const db = await openCache();
    const [matchesCount, teamsCount, eventsCount] = await Promise.all([
      db.count('matches'),
      db.count('teams'),
      db.count('events'),
    ]);

    // Find oldest cache time
    let oldestCacheTime: number | null = null;

    const allMatches = await db.getAll('matches');
    const allTeams = await db.getAll('teams');
    const allEvents = await db.getAll('events');

    const allCachedItems = [...allMatches, ...allTeams, ...allEvents];

    if (allCachedItems.length > 0) {
      oldestCacheTime = Math.min(...allCachedItems.map(item => item.cachedAt));
    }

    return {
      matchesCount,
      teamsCount,
      eventsCount,
      oldestCacheTime,
    };
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return {
      matchesCount: 0,
      teamsCount: 0,
      eventsCount: 0,
      oldestCacheTime: null,
    };
  }
}