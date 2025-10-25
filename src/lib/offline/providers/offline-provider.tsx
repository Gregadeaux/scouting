'use client';

/**
 * OfflineProvider
 *
 * Provides offline services to the component tree via React context.
 * Initializes IndexedDB and sync services on mount.
 *
 * @example
 * ```tsx
 * // In app/layout.tsx
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <OfflineProvider>
 *           {children}
 *         </OfflineProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */

import React, { createContext, useEffect, useState, useMemo, type ReactNode } from 'react';
import {
  createOfflineServices,
  getDefaultConfig,
  type OfflineServices
} from '@/infrastructure/offline';

export interface OfflineContextValue {
  /**
   * Offline services
   */
  services: OfflineServices;

  /**
   * Whether services are initialized
   */
  isInitialized: boolean;

  /**
   * Initialization error if any
   */
  error: Error | null;
}

/**
 * Context for offline services
 */
export const OfflineContext = createContext<OfflineContextValue | null>(null);

export interface OfflineProviderProps {
  children: ReactNode;

  /**
   * Custom error boundary component
   */
  errorBoundary?: React.ComponentType<{ error: Error; reset: () => void }>;

  /**
   * Callback when services are initialized
   */
  onInitialized?: () => void;

  /**
   * Callback when initialization fails
   */
  onError?: (error: Error) => void;
}

/**
 * Provider component for offline services
 *
 * Sets up:
 * - IndexedDB for queue storage
 * - Sync services for background sync
 * - Domain services (SubmissionService, SyncService)
 * - Online/offline event listeners
 *
 * @param props - Provider props
 */
export function OfflineProvider({
  children,
  errorBoundary: ErrorBoundary,
  onInitialized,
  onError,
}: OfflineProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Create services once
  const services = useMemo(() => {
    try {
      const config = getDefaultConfig();
      return createOfflineServices(config);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create offline services');
      setError(error);
      onError?.(error);
      throw error;
    }
  }, [onError]);

  /**
   * Initialize offline services
   */
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        // Initialize services
        await services.initialize();

        if (mounted) {
          setIsInitialized(true);
          onInitialized?.();
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to initialize offline services');
        console.error('Offline initialization error:', error);

        if (mounted) {
          setError(error);
          onError?.(error);
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
      // Cleanup services
      services.cleanup().catch(console.error);
    };
  }, [services, onInitialized, onError]);

  /**
   * Context value
   */
  const value: OfflineContextValue = {
    services,
    isInitialized,
    error,
  };

  /**
   * Show error boundary if initialization failed
   */
  if (error && ErrorBoundary) {
    return (
      <ErrorBoundary
        error={error}
        reset={() => {
          setError(null);
          setIsInitialized(false);
        }}
      />
    );
  }

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

/**
 * Error boundary component for offline services
 */
export class OfflineErrorBoundary extends React.Component<
  {
    children: ReactNode;
    fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  },
  { error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Offline service error:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      const Fallback = this.props.fallback;

      if (Fallback) {
        return (
          <Fallback
            error={this.state.error}
            reset={() => this.setState({ error: null })}
          />
        );
      }

      return (
        <div role="alert" style={{ padding: '20px', color: 'red' }}>
          <h2>Offline Service Error</h2>
          <p>{this.state.error.message}</p>
          <button onClick={() => this.setState({ error: null })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap component with offline services
 */
export function withOfflineProvider<P extends object>(
  Component: React.ComponentType<P>
) {
  return function OfflineProviderWrapper(props: P) {
    return (
      <OfflineProvider>
        <Component {...props} />
      </OfflineProvider>
    );
  };
}
