/**
 * Base repository interface for common CRUD operations
 * Following the Repository pattern for data access abstraction
 */

/**
 * Generic query options for list operations
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * Base repository interface
 * T: Entity type
 * ID: Primary key type (defaults to string)
 */
export interface IBaseRepository<T, ID = string> {
  /**
   * Find a single entity by its primary key
   */
  findById(id: ID): Promise<T | null>;

  /**
   * Find all entities with optional query parameters
   */
  findAll(options?: QueryOptions): Promise<T[]>;

  /**
   * Create a new entity
   */
  create(data: Omit<T, 'id'>): Promise<T>;

  /**
   * Update an existing entity
   */
  update(id: ID, data: Partial<T>): Promise<T>;

  /**
   * Delete an entity
   */
  delete(id: ID): Promise<void>;
}

/**
 * Custom error class for repository operations
 */
export class RepositoryError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

/**
 * Error thrown when an entity is not found
 */
export class EntityNotFoundError extends RepositoryError {
  constructor(entityName: string, id: any) {
    super(`${entityName} with ID ${id} not found`, 'ENTITY_NOT_FOUND', { entityName, id });
    this.name = 'EntityNotFoundError';
  }
}

/**
 * Error thrown when a duplicate entity would be created
 */
export class DuplicateEntityError extends RepositoryError {
  constructor(entityName: string, field: string, value: any) {
    super(
      `${entityName} with ${field} = ${value} already exists`,
      'DUPLICATE_ENTITY',
      { entityName, field, value }
    );
    this.name = 'DuplicateEntityError';
  }
}

/**
 * Error thrown when database operation fails
 */
export class DatabaseOperationError extends RepositoryError {
  constructor(operation: string, details?: any) {
    super(`Database operation failed: ${operation}`, 'DATABASE_ERROR', details);
    this.name = 'DatabaseOperationError';
  }
}
