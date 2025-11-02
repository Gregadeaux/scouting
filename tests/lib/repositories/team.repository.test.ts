/**
 * Unit Tests for TeamRepository
 *
 * Tests team data access layer with mocked Supabase client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TeamRepository } from '@/lib/repositories/team.repository';
import { createMockSupabaseClient, asMockSupabaseClient, mockTeam } from '../../__mocks__/supabase';
import { DatabaseOperationError } from '@/lib/repositories/base.repository';

describe('TeamRepository', () => {
  let repository: TeamRepository;
  let mockClient: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Create a fresh mock client
    mockClient = createMockSupabaseClient({ data: mockTeam });
    repository = new TeamRepository(asMockSupabaseClient(mockClient));
  });

  describe('findByTeamNumber', () => {
    it('should return a team when found', async () => {
      // Arrange
      mockClient = createMockSupabaseClient({ data: mockTeam });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act
      const result = await repository.findByTeamNumber(930);

      // Assert
      expect(result).toEqual(mockTeam);
      expect(mockClient.from).toHaveBeenCalledWith('teams');
    });

    it('should return null when team not found (PGRST116)', async () => {
      // Arrange - simulate PostgreSQL "not found" error
      const notFoundError = new Error('Not found');
      (notFoundError as Error & { code: string }).code = 'PGRST116';

      mockClient = createMockSupabaseClient({
        data: null,
        error: notFoundError,
      });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act
      const result = await repository.findByTeamNumber(9999);

      // Assert
      expect(result).toBeNull();
    });

    it('should throw DatabaseOperationError on other database errors', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      mockClient = createMockSupabaseClient({
        data: null,
        error: dbError,
      });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act & Assert
      await expect(repository.findByTeamNumber(930)).rejects.toThrow(DatabaseOperationError);
    });

    it('should build correct query', async () => {
      // Arrange
      mockClient = createMockSupabaseClient({ data: mockTeam });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act
      await repository.findByTeamNumber(930);

      // Assert
      expect(mockClient.from).toHaveBeenCalledWith('teams');
      // The mock query builder will track chained calls
    });
  });

  describe('findByEventKey', () => {
    it('should return teams for an event', async () => {
      // Arrange
      // The repository first queries event_teams with nested teams relation
      const eventTeamsData = [
        {
          team_number: 930,
          teams: mockTeam,
        },
      ];
      mockClient = createMockSupabaseClient({ data: eventTeamsData });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act
      const result = await repository.findByEventKey('2025wimi');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockTeam);
      expect(mockClient.from).toHaveBeenCalled();
    });

    it('should return empty array when no teams found', async () => {
      // Arrange
      mockClient = createMockSupabaseClient({ data: [] });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act
      const result = await repository.findByEventKey('2025test');

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      // Arrange
      const dbError = new Error('Query failed');
      mockClient = createMockSupabaseClient({
        data: null,
        error: dbError,
      });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act & Assert
      await expect(repository.findByEventKey('2025wimi')).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    it('should return all teams', async () => {
      // Arrange
      const teams = [mockTeam, { ...mockTeam, team_number: 931 }];
      mockClient = createMockSupabaseClient({ data: teams });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toEqual(teams);
      expect(result).toHaveLength(2);
    });

    it('should apply query options', async () => {
      // Arrange
      mockClient = createMockSupabaseClient({ data: [mockTeam] });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act
      const result = await repository.findAll({
        limit: 10,
        offset: 0,
        orderBy: 'team_number',
        orderDirection: 'asc',
      });

      // Assert
      expect(result).toBeDefined();
      expect(mockClient.from).toHaveBeenCalledWith('teams');
    });

    it('should return empty array when no teams exist', async () => {
      // Arrange
      mockClient = createMockSupabaseClient({ data: [] });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('upsert', () => {
    it('should insert new team', async () => {
      // Arrange
      const newTeam = { ...mockTeam };
      mockClient = createMockSupabaseClient({ data: newTeam });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act
      const result = await repository.upsert(newTeam);

      // Assert
      expect(result).toEqual(newTeam);
      expect(mockClient.from).toHaveBeenCalledWith('teams');
    });

    it('should update existing team', async () => {
      // Arrange
      const updatedTeam = { ...mockTeam, team_name: 'Updated Name' };
      mockClient = createMockSupabaseClient({ data: updatedTeam });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act
      const result = await repository.upsert(updatedTeam);

      // Assert
      expect(result).toEqual(updatedTeam);
      expect(result.team_name).toBe('Updated Name');
    });

    it('should handle upsert errors', async () => {
      // Arrange
      const dbError = new Error('Constraint violation');
      mockClient = createMockSupabaseClient({
        data: null,
        error: dbError,
      });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act & Assert
      await expect(repository.upsert(mockTeam)).rejects.toThrow();
    });
  });

  describe('bulkUpsert', () => {
    it('should insert multiple teams', async () => {
      // Arrange
      const teams = [
        mockTeam,
        { ...mockTeam, team_number: 931, team_name: 'Team 931' },
        { ...mockTeam, team_number: 932, team_name: 'Team 932' },
      ];
      mockClient = createMockSupabaseClient({ data: teams });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act
      const result = await repository.bulkUpsert(teams);

      // Assert
      expect(result).toHaveLength(3);
      expect(result).toEqual(teams);
    });

    it('should handle empty array', async () => {
      // Arrange
      mockClient = createMockSupabaseClient({ data: [] });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act
      const result = await repository.bulkUpsert([]);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle bulk upsert errors', async () => {
      // Arrange
      const dbError = new Error('Bulk insert failed');
      mockClient = createMockSupabaseClient({
        data: null,
        error: dbError,
      });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act & Assert
      await expect(repository.bulkUpsert([mockTeam])).rejects.toThrow();
    });
  });

  describe('updateFromTBA', () => {
    it('should merge TBA data with existing team', async () => {
      // Arrange
      const tbaData = {
        team_name: 'Updated from TBA',
        website: 'https://newtbawebsite.com',
      };
      const updatedTeam = { ...mockTeam, ...tbaData };
      mockClient = createMockSupabaseClient({ data: updatedTeam });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act
      const result = await repository.updateFromTBA(930, tbaData);

      // Assert
      expect(result.team_name).toBe('Updated from TBA');
      expect(result.website).toBe('https://newtbawebsite.com');
    });

    it('should handle update errors', async () => {
      // Arrange
      const dbError = new Error('Update failed');
      mockClient = createMockSupabaseClient({
        data: null,
        error: dbError,
      });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act & Assert
      await expect(repository.updateFromTBA(930, {})).rejects.toThrow();
    });
  });

  describe('count', () => {
    it('should return total team count', async () => {
      // Arrange
      mockClient = createMockSupabaseClient({ data: [], count: 150 });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act
      const result = await repository.count();

      // Assert
      expect(result).toBe(150);
    });

    it('should return 0 when no teams exist', async () => {
      // Arrange
      mockClient = createMockSupabaseClient({ data: [], count: 0 });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act
      const result = await repository.count();

      // Assert
      expect(result).toBe(0);
    });

    it('should handle count errors', async () => {
      // Arrange
      const dbError = new Error('Count query failed');
      mockClient = createMockSupabaseClient({
        data: null,
        error: dbError,
      });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act & Assert
      await expect(repository.count()).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null responses gracefully', async () => {
      // Arrange
      mockClient = createMockSupabaseClient({ data: null });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act & Assert
      // The implementation should handle null responses appropriately
      // This depends on the specific method
    });

    it('should handle network errors', async () => {
      // Arrange
      const networkError = new Error('Network request failed');
      mockClient = createMockSupabaseClient({
        data: null,
        error: networkError,
      });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act & Assert
      await expect(repository.findByTeamNumber(930)).rejects.toThrow();
    });

    it('should handle partial team data', async () => {
      // Arrange
      const partialTeam = {
        team_number: 930,
        team_name: 'Partial Team',
      };
      mockClient = createMockSupabaseClient({ data: partialTeam });
      repository = new TeamRepository(asMockSupabaseClient(mockClient));

      // Act
      const result = await repository.upsert(partialTeam);

      // Assert
      expect(result).toBeDefined();
      expect(result.team_number).toBe(930);
    });
  });
});
