/**
 * Event Bus Implementation
 * Type-safe event emission and subscription system
 */

import type { IEventBus, EventHandler, Subscription as ISubscription, OfflineEvent } from '@/core/offline/ports/event-bus';
import { createEvent } from '@/core/offline/ports/event-bus';

/**
 * Internal subscription tracking
 */
interface InternalSubscription<T extends OfflineEvent = OfflineEvent> {
  handler: EventHandler<T>;
  once: boolean;
}

/**
 * Event bus implementation with type-safe events
 */
export class EventBus implements IEventBus {
  private readonly subscriptions: Map<string, InternalSubscription[]> = new Map();
  private readonly globalSubscriptions: InternalSubscription<OfflineEvent>[] = [];
  private readonly eventHistory: OfflineEvent[] = [];
  private readonly maxHistorySize: number;

  constructor(options?: { maxHistorySize?: number }) {
    this.maxHistorySize = options?.maxHistorySize || 100;
  }

  /**
   * Publish an event to all subscribers
   */
  publish<T extends OfflineEvent>(event: Omit<T, 'eventId' | 'timestamp'>): void {
    // Create full event with ID and timestamp
    const fullEvent = createEvent(event);

    // Record event in history
    this.recordEvent(fullEvent);

    // Notify type-specific subscribers
    const typeSubscriptions = this.subscriptions.get(fullEvent.type);
    if (typeSubscriptions) {
      this.notifySubscribers(typeSubscriptions, fullEvent);
    }

    // Notify global subscribers
    if (this.globalSubscriptions.length > 0) {
      this.notifySubscribers(this.globalSubscriptions, fullEvent);
    }
  }

  /**
   * Subscribe to events of a specific type
   */
  subscribe<T extends OfflineEvent>(
    eventType: T['type'],
    handler: EventHandler<T>
  ): ISubscription {
    const subscription: InternalSubscription<T> = { handler, once: false };
    this.addSubscription(eventType, subscription);

    // Return subscription object
    return {
      unsubscribe: () => this.unsubscribe(eventType, handler),
    };
  }

  /**
   * Subscribe to all events
   */
  subscribeAll(handler: EventHandler<OfflineEvent>): ISubscription {
    const subscription: InternalSubscription<OfflineEvent> = { handler, once: false };
    this.globalSubscriptions.push(subscription);

    // Return subscription object
    return {
      unsubscribe: () => {
        const index = this.globalSubscriptions.findIndex(sub => sub.handler === handler);
        if (index !== -1) {
          this.globalSubscriptions.splice(index, 1);
        }
      },
    };
  }

  /**
   * Clear all subscriptions
   */
  clearAll(): void {
    this.subscriptions.clear();
    this.globalSubscriptions.length = 0;
  }

  /**
   * Unsubscribe from a specific event type
   */
  private unsubscribe<T extends OfflineEvent>(
    eventType: T['type'],
    handler: EventHandler<T>
  ): void {
    const subscriptions = this.subscriptions.get(eventType);
    if (!subscriptions) {
      return;
    }

    const index = subscriptions.findIndex(sub => sub.handler === handler);
    if (index !== -1) {
      subscriptions.splice(index, 1);
    }

    // Clean up empty subscription arrays
    if (subscriptions.length === 0) {
      this.subscriptions.delete(eventType);
    }
  }

  /**
   * Notify subscribers of an event
   */
  private notifySubscribers<T extends OfflineEvent>(
    subscriptions: InternalSubscription<T>[],
    event: T
  ): void {
    // Create a copy to avoid issues if handlers modify subscriptions
    const subscriptionsCopy = [...subscriptions];

    // Call all handlers
    for (const subscription of subscriptionsCopy) {
      try {
        const result = subscription.handler(event);
        // Handle async handlers
        if (result instanceof Promise) {
          result.catch(error => {
            console.error(`Error in async event handler for "${event.type}":`, error);
          });
        }
      } catch (error) {
        console.error(`Error in event handler for "${event.type}":`, error);
      }
    }
  }

  /**
   * Add a subscription
   */
  private addSubscription<T extends OfflineEvent>(
    eventType: string,
    subscription: InternalSubscription<T>
  ): void {
    const subscriptions = this.subscriptions.get(eventType);
    if (subscriptions) {
      subscriptions.push(subscription as InternalSubscription);
    } else {
      this.subscriptions.set(eventType, [subscription as InternalSubscription]);
    }
  }

  /**
   * Record event in history
   */
  private recordEvent(event: OfflineEvent): void {
    this.eventHistory.push(event);

    // Limit history size
    while (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Get event history
   */
  getHistory(eventType?: string): OfflineEvent[] {
    if (eventType) {
      return this.eventHistory.filter(event => event.type === eventType);
    }
    return [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory.length = 0;
  }

  /**
   * Get count of subscribers for an event type
   */
  listenerCount(eventType: string): number {
    const subscriptions = this.subscriptions.get(eventType);
    return subscriptions ? subscriptions.length : 0;
  }

  /**
   * Get all event types with subscribers
   */
  eventTypes(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

/**
 * Global event bus instance
 */
let globalEventBus: EventBus | null = null;

/**
 * Get or create global event bus
 */
export function getGlobalEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus();
  }
  return globalEventBus;
}

/**
 * Reset global event bus (useful for testing)
 */
export function resetGlobalEventBus(): void {
  if (globalEventBus) {
    globalEventBus.clearAll();
    globalEventBus.clearHistory();
    globalEventBus = null;
  }
}

/**
 * Create a scoped event bus
 */
export function createEventBus(options?: { maxHistorySize?: number }): EventBus {
  return new EventBus(options);
}