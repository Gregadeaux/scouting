/**
 * Port Interface: Event Bus
 *
 * Defines the contract for publishing and subscribing to domain events.
 * Enables loose coupling between different parts of the system.
 *
 * Observer Pattern: Subscribers receive notifications about domain events
 * without tight coupling to the event publishers.
 */

import type { SubmissionId } from '../domain/types';

/**
 * Base interface for all domain events
 */
export interface DomainEvent {
  /** Unique ID for this event instance */
  eventId: string;

  /** Timestamp when the event occurred */
  timestamp: number;

  /** Type of the event */
  type: string;
}

/**
 * Event fired when a submission is queued for sync
 */
export interface SubmissionQueuedEvent extends DomainEvent {
  type: 'submission.queued';
  submissionId: string;
  url: string;
  method: string;
}

/**
 * Event fired when a sync operation starts
 */
export interface SyncStartedEvent extends DomainEvent {
  type: 'sync.started';
  submissionIds: string[];
  count: number;
}

/**
 * Event fired when a sync operation completes successfully
 */
export interface SyncCompletedEvent extends DomainEvent {
  type: 'sync.completed';
  succeeded: number;
  failed: number;
  durationMs: number;
}

/**
 * Event fired when a sync operation fails
 */
export interface SyncFailedEvent extends DomainEvent {
  type: 'sync.failed';
  error: string;
  submissionIds: string[];
}

/**
 * Event fired when a single submission syncs successfully
 */
export interface SubmissionSuccessEvent extends DomainEvent {
  type: 'submission.success';
  submissionId: string;
  attempt: number;
}

/**
 * Event fired when a single submission fails to sync
 */
export interface SubmissionFailedEvent extends DomainEvent {
  type: 'submission.failed';
  submissionId: string;
  error: string;
  attempt: number;
  willRetry: boolean;
}

/**
 * Event fired when a submission is retrying
 */
export interface SubmissionRetryingEvent extends DomainEvent {
  type: 'submission.retrying';
  submissionId: string;
  attempt: number;
  nextRetryMs: number;
}

/**
 * Event fired when a submission is deleted
 */
export interface SubmissionDeletedEvent extends DomainEvent {
  type: 'submission.deleted';
  submissionId: string;
}

/**
 * Event fired when queue state changes
 */
export interface QueueStateChangedEvent extends DomainEvent {
  type: 'queue.stateChanged';
  pendingCount: number;
  failedCount: number;
  totalCount: number;
}

/**
 * Union type of all possible events
 */
export type OfflineEvent =
  | SubmissionQueuedEvent
  | SyncStartedEvent
  | SyncCompletedEvent
  | SyncFailedEvent
  | SubmissionSuccessEvent
  | SubmissionFailedEvent
  | SubmissionRetryingEvent
  | SubmissionDeletedEvent
  | QueueStateChangedEvent;

/**
 * Event handler function type
 */
export type EventHandler<T extends OfflineEvent = OfflineEvent> = (event: T) => void | Promise<void>;

/**
 * Subscription handle for unsubscribing
 */
export interface Subscription {
  /** Unsubscribe from the event */
  unsubscribe(): void;
}

/**
 * Event bus interface for publish/subscribe pattern
 */
export interface IEventBus {
  /**
   * Publish an event to all subscribers
   *
   * @param event - The event to publish
   */
  publish<T extends OfflineEvent>(event: Omit<T, 'eventId' | 'timestamp'>): void;

  /**
   * Subscribe to events of a specific type
   *
   * @param eventType - The type of event to subscribe to
   * @param handler - The handler function to call when event is published
   * @returns Subscription object to unsubscribe later
   */
  subscribe<T extends OfflineEvent>(
    eventType: T['type'],
    handler: EventHandler<T>
  ): Subscription;

  /**
   * Subscribe to all events
   *
   * @param handler - The handler function to call for any event
   * @returns Subscription object to unsubscribe later
   */
  subscribeAll(handler: EventHandler<OfflineEvent>): Subscription;

  /**
   * Clear all subscriptions (useful for testing)
   */
  clearAll(): void;
}

/**
 * Helper function to create domain events with automatic ID and timestamp
 */
export function createEvent<T extends OfflineEvent>(
  event: Omit<T, 'eventId' | 'timestamp'>
): T {
  return {
    ...event,
    eventId: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    timestamp: Date.now(),
  } as T;
}
