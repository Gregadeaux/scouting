# Pit Scouting Service Layer

## Overview

This directory contains a comprehensive service layer for pit scouting, following SOLID principles and clean architecture patterns. The service layer centralizes all business logic related to pit scouting operations, providing a clean separation of concerns between API routes, business logic, and data access.

## Architecture

```
┌─────────────────┐
│   API Routes    │  (src/app/api/pit-scouting/route.ts)
│  (Controllers)  │  - HTTP request/response handling
└────────┬────────┘  - Authentication
         │
         ▼
┌─────────────────┐
│  Service Layer  │  (pit-scouting.service.ts)
│ Business Logic  │  - Validation
└────────┬────────┘  - Duplicate detection
         │           - Schema version routing
         ▼           - Error handling
┌─────────────────┐
│     Mapper      │  (pit-scouting.mapper.ts)
│  DTO ↔ Entity   │  - Field name transformations
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Repository    │  (scouting-data.repository.ts)
│  Data Access    │  - Database operations
└─────────────────┘  - Query building
```

## Files Created

### 1. `/src/lib/services/pit-scouting.service.ts`

**Purpose**: Core business logic for pit scouting operations

**Key Classes**:
- `IPitScoutingService` - Service interface defining the contract
- `PitScoutingService` - Service implementation
- Custom error classes:
  - `PitScoutingValidationError` - Validation failures
  - `DuplicatePitScoutingError` - Duplicate team/event submissions
  - `PitScoutingNotFoundError` - Entry not found
  - `UnsupportedSchemaVersionError` - Unknown schema version

**Key Methods**:
```typescript
interface IPitScoutingService {
  getPitScoutingByTeam(eventKey: string, teamNumber: number): Promise<PitScoutingDTO | null>;
  getPitScoutingByEvent(eventKey: string): Promise<PitScoutingDTO[]>;
  createPitScouting(data: CreatePitScoutingDTO): Promise<PitScoutingDTO>;
  updatePitScouting(id: string, data: UpdatePitScoutingDTO): Promise<PitScoutingDTO>;
  validatePitScoutingData(data: {...}): ValidationResult;
  detectDuplicate(eventKey: string, teamNumber: number): Promise<PitScouting | null>;
}
```

**Business Logic Extracted from API Route**:
- ✅ Schema version detection (lines 66-72 from POST handler)
- ✅ JSONB validation routing (lines 74-102)
- ✅ Duplicate detection (lines 125-136)
- ✅ Field mapping logic (lines 104-121)
- ✅ Error handling with custom exceptions

**Dependencies (Injected)**:
- `IScoutingDataRepository` - Database access layer

---

### 2. `/src/lib/services/types/pit-scouting-dto.ts`

**Purpose**: Data Transfer Objects (DTOs) defining the API contract

**Key Interfaces**:

```typescript
// Create new pit scouting entry
interface CreatePitScoutingDTO {
  event_key: string;
  team_number: number;
  scout_id: string; // Client-friendly name → scouted_by (DB)
  robot_capabilities: RobotCapabilities2025;
  autonomous_capabilities: AutonomousCapabilities2025;
  physical_description?: string; // → robot_features (DB)
  photos?: string[]; // → photo_urls (DB)
  notes?: string; // → scouting_notes (DB)
  // ... other optional fields
}

// Update existing entry
interface UpdatePitScoutingDTO {
  id: string;
  // All other fields optional
}

// Response DTO
interface PitScoutingDTO {
  id: string;
  scout_id: string; // DB scouted_by → scout_id
  physical_description?: string; // DB robot_features → physical_description
  photos?: string[]; // DB photo_urls → photos
  notes?: string; // DB scouting_notes → notes
  // ... all fields with client-friendly names
}
```

**Why DTOs?**
- Clean API contract separate from database schema
- Client-friendly field names (e.g., `scout_id` instead of `scouted_by`)
- Validation happens on DTO boundaries
- Database schema changes don't break API

---

### 3. `/src/lib/mappers/pit-scouting.mapper.ts`

**Purpose**: Bidirectional mapping between DTOs and database entities

**Key Methods**:

```typescript
class PitScoutingMapper {
  // DTO → Database Entity (for inserts)
  static toCreateEntity(dto: CreatePitScoutingDTO): Omit<PitScouting, 'id' | 'created_at' | 'updated_at'>;

  // DTO → Partial Entity (for updates)
  static toUpdateEntity(dto: UpdatePitScoutingDTO): Partial<PitScouting>;

  // Database Entity → DTO (for responses)
  static toDTO(entity: PitScouting): PitScoutingDTO;

  // Bulk conversion
  static toDTOArray(entities: PitScouting[]): PitScoutingDTO[];

  // Development helper
  static getFieldMappings(): Record<string, { dto: string; db: string }>;
}
```

**Field Mappings**:
| DTO Field (Client) | Database Column | Direction |
|-------------------|-----------------|-----------|
| `scout_id` | `scouted_by` | Bidirectional |
| `physical_description` | `robot_features` | Bidirectional |
| `photos` | `photo_urls` | Bidirectional |
| `notes` | `scouting_notes` | Bidirectional |

**Why a Mapper?**
- Encapsulates field name transformations in one place
- Single Responsibility Principle (SRP)
- Easy to test in isolation
- Changes to field mappings require updating only one file

---

## SOLID Principles Applied

### 1. Single Responsibility Principle (SRP)
- **Service**: Business logic only (validation, duplicate detection)
- **Mapper**: Field transformations only
- **Repository**: Database access only
- **DTOs**: Data contracts only

### 2. Open/Closed Principle (OCP)
- Service is open for extension (add new methods) but closed for modification
- Schema version routing uses switch statement for new seasons
- Custom error classes extend Error without modifying base

### 3. Liskov Substitution Principle (LSP)
- `PitScoutingService` implements `IPitScoutingService`
- Any implementation of `IPitScoutingService` can be substituted
- Enables mocking for tests

### 4. Interface Segregation Principle (ISP)
- `IPitScoutingService` defines only pit scouting operations
- Clients depend on specific interfaces, not implementation
- Repository interface is focused (`IScoutingDataRepository`)

### 5. Dependency Inversion Principle (DIP)
- Service depends on `IScoutingDataRepository` interface, not concrete implementation
- Constructor dependency injection
- Factory function enables easy instantiation

---

## Usage Examples

### In API Route (Refactored)

```typescript
// src/app/api/pit-scouting/route.ts
import { createPitScoutingService } from '@/lib/services/pit-scouting.service';
import { createScoutingDataRepository } from '@/lib/repositories/scouting-data.repository';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Dependency injection
    const repository = createScoutingDataRepository(supabase);
    const service = createPitScoutingService(repository);

    const body = await request.json();

    // Service handles all business logic
    const result = await service.createPitScouting(body);

    return successResponse(result, 201);
  } catch (error) {
    if (error instanceof PitScoutingValidationError) {
      return errorResponse('Validation failed', 400, error.errors);
    }
    if (error instanceof DuplicatePitScoutingError) {
      return errorResponse(error.message, 409);
    }
    if (error instanceof UnsupportedSchemaVersionError) {
      return errorResponse(error.message, 400);
    }
    return serverError();
  }
}
```

### In Tests

```typescript
// Mock repository for unit tests
const mockRepository: IScoutingDataRepository = {
  createPitScouting: jest.fn(),
  findPitScoutingByTeamAndEvent: jest.fn(),
  // ... other methods
};

const service = new PitScoutingService(mockRepository);

// Test validation
test('should throw validation error for invalid data', async () => {
  const invalidData = { /* missing required fields */ };

  await expect(service.createPitScouting(invalidData))
    .rejects.toThrow(PitScoutingValidationError);
});

// Test duplicate detection
test('should throw duplicate error when team/event exists', async () => {
  mockRepository.findPitScoutingByTeamAndEvent.mockResolvedValue(existingEntry);

  await expect(service.createPitScouting(validData))
    .rejects.toThrow(DuplicatePitScoutingError);
});
```

### Standalone Validation

```typescript
// In a form component
import { createPitScoutingService } from '@/lib/services/pit-scouting.service';

const service = createPitScoutingService(repository);

const validationResult = service.validatePitScoutingData({
  robot_capabilities: formData.robotCapabilities,
  autonomous_capabilities: formData.autoCapabilities,
});

if (!validationResult.valid) {
  setErrors(validationResult.errors);
}
```

---

## Business Logic Flow

### Create Pit Scouting Entry

```
1. API Route receives HTTP POST
   ↓
2. Extract body and authenticate
   ↓
3. Service.createPitScouting(dto)
   ├─ Detect schema version from JSONB
   ├─ Validate JSONB data (route to correct validator)
   ├─ Check for duplicates (team + event)
   ├─ Map DTO → Entity (via Mapper)
   ├─ Repository.createPitScouting(entity)
   └─ Map Entity → DTO (via Mapper)
   ↓
4. Return DTO in HTTP response
```

### Update Pit Scouting Entry

```
1. API Route receives HTTP PUT
   ↓
2. Service.updatePitScouting(id, dto)
   ├─ Repository.getPitScoutingById(id) - verify exists
   ├─ If JSONB updated: validate new data
   ├─ Map DTO → Partial Entity (via Mapper)
   ├─ Repository.updatePitScouting(id, entity)
   └─ Map Entity → DTO (via Mapper)
   ↓
3. Return updated DTO
```

---

## Schema Version Support

The service automatically detects schema versions and routes to the appropriate validator:

```typescript
// Current: 2025.1
const SUPPORTED_SCHEMA_VERSIONS = ['2025.1'] as const;

// To add 2026 support:
const SUPPORTED_SCHEMA_VERSIONS = ['2025.1', '2026.1'] as const;

// Then update validatePitScoutingDataWithVersion():
switch (schemaVersion) {
  case '2025.1':
    return validatePitScoutingData2025(data);
  case '2026.1':
    return validatePitScoutingData2026(data);
}
```

This follows the extensibility pattern from `/CLAUDE.md` for season transitions.

---

## Error Handling

Custom error classes provide type-safe, semantic error handling:

```typescript
try {
  await service.createPitScouting(data);
} catch (error) {
  if (error instanceof PitScoutingValidationError) {
    // Validation failed - return 400 with error.errors
    console.log(error.errors); // Array of ValidationError
  }
  if (error instanceof DuplicatePitScoutingError) {
    // Duplicate found - return 409
    console.log(error.existingEntry); // The conflicting entry
  }
  if (error instanceof UnsupportedSchemaVersionError) {
    // Unknown version - return 400
    console.log(error.version); // The unsupported version
    console.log(error.supportedVersions); // Array of supported versions
  }
  if (error instanceof PitScoutingNotFoundError) {
    // Entry not found - return 404
  }
}
```

---

## Testing Strategy

### Unit Tests (Service Layer)
- ✅ Test validation logic with mock repository
- ✅ Test schema version detection
- ✅ Test duplicate detection logic
- ✅ Test error throwing with invalid data
- ✅ Mock repository responses

### Unit Tests (Mapper)
- ✅ Test DTO → Entity mapping
- ✅ Test Entity → DTO mapping
- ✅ Verify all field mappings are bidirectional
- ✅ Test partial updates

### Integration Tests
- ✅ Test with real database (test environment)
- ✅ Verify JSONB validation against database constraints
- ✅ Test duplicate constraint enforcement
- ✅ Test full CRUD operations

---

## Benefits of This Architecture

1. **Testability**: Service can be tested in isolation with mocked dependencies
2. **Maintainability**: Business logic centralized in one place
3. **Reusability**: Service can be used from multiple API routes or background jobs
4. **Type Safety**: TypeScript ensures compile-time safety
5. **Clean API**: DTOs provide stable API contract independent of database schema
6. **Error Handling**: Semantic errors with rich context
7. **Extensibility**: Easy to add new seasons or features
8. **Separation of Concerns**: Each layer has a single, well-defined responsibility

---

## Future Enhancements

### Potential Additions
- **Caching Layer**: Add Redis caching in service
- **Event Emission**: Emit domain events (e.g., `PitScoutingCreated`)
- **Audit Logging**: Track who changed what and when
- **Batch Operations**: `createMultiplePitScoutings()`
- **Statistics**: `getPitScoutingStatsByEvent()`
- **Export**: `exportPitScoutingToCSV()`

### Adding New Season (e.g., 2026)
1. Create types in `/src/types/season-2026.ts`
2. Create validators in `/src/lib/supabase/validation.ts`
3. Update `SUPPORTED_SCHEMA_VERSIONS` in service
4. Add case in `validatePitScoutingDataWithVersion()`
5. Update DTOs to support new types (generic)

No changes needed to mapper or core service logic!

---

## Dependencies

- `@/types` - Core type definitions
- `@/types/season-2025` - Season-specific types
- `@/lib/repositories/scouting-data.repository` - Database access
- `@/lib/supabase/validation` - JSONB schema validators

---

## Related Files

- `/src/app/api/pit-scouting/route.ts` - API route using this service
- `/src/lib/repositories/scouting-data.repository.ts` - Repository layer
- `/src/lib/supabase/validation.ts` - Validation functions
- `/src/types/season-2025.ts` - Season-specific types
- `/CLAUDE.md` - Season transition guide

---

## Questions?

For questions about this architecture or how to extend it, refer to:
- This README
- SOLID principles documentation
- Clean Architecture patterns
- `/CLAUDE.md` for season-specific guidance
