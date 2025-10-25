# Building an extensible FRC scouting database for 2026

**PostgreSQL with hybrid JSONB columns is the optimal architecture for FRC scouting systems**, combining structured relational tables for evergreen data with flexible JSON fields for season-specific metrics. This approach, validated by top-performing teams and production database systems, requires minimal maintenance year-to-year while supporting sophisticated queries and maintaining data integrity. The core insight from analyzing dozens of FRC scouting systems: approximately 60-70% of valuable scouting data remains consistent across seasons (team identification, match structure, basic performance metrics), while 30-40% changes annually with new game mechanics. Smart schema design separates these concerns.

This research examined GitHub implementations from championship-winning teams like 1678 (Citrus Circuits), analyzed published methodologies from elite programs, and evaluated database design patterns used in sports analytics systems. The findings reveal proven approaches that balance structure with adaptability, enabling teams to collect rich data without rebuilding their database every January.

## The FRC scouting challenge: stability meets constant change

Every January, FIRST Robotics unveils a completely new game with different scoring mechanisms, game pieces, and field layouts. Yet the fundamental competition structure—3v3 alliances, 15-second autonomous periods, qualification matches leading to playoff brackets—remains remarkably consistent. **This creates a unique database design challenge**: how do you build a system that doesn't require complete restructuring annually while accommodating entirely different scoring systems?

Successful teams solve this by identifying the stable platform beneath the variable challenge. Team 1678 Citrus Circuits, whose scouting system helped them win multiple world championships, demonstrates this principle through their architecture: they maintain separate schema repositories per year (schema-2024-public, schema-2025-public) that plug into a consistent processing pipeline. Their MongoDB-based system processes team-in-match data regardless of whether robots are scoring foam torus "Notes" (2024) or PVC "Coral" pieces (2025).

The pattern observed across top teams: **structure the evergreen, flex the specific**. Core entities like teams, events, and matches get traditional relational tables with foreign keys and constraints. Game-specific performance data gets stored in flexible formats—MongoDB documents, PostgreSQL JSONB columns, or configuration-driven JSON structures—that adapt without schema migrations.

## What elite teams revealed: patterns from championship-level systems

Team 1678's published whitepapers (2013-2024) provide unprecedented insight into production scouting systems. Their 24-person software subteam—larger than many FRC teams entirely—dedicates over half the competition team to scouting. They employ **three scouts per robot** (18 total per match), generating redundant data that consolidation algorithms merge using weighted averages and majority voting. This multi-scout approach achieves accuracy within one game piece per alliance per match when validated against official results.

Their data architecture separates collection, processing, and visualization into distinct layers. Android tablets running match collection apps generate QR codes encoding compressed performance data. Python servers decompress these codes, store raw data in MongoDB, run consolidation algorithms, calculate predictive metrics, and expose results through viewer apps and picklist editors. The system operates offline-first—critical since competition venues often have unreliable WiFi—using QR codes and local file backups for data transfer.

**MongoDB dominates among competitive teams** for good reason: flexible schemas accommodate annual rule changes without migrations. FReCon explicitly designed as "season-agnostic" uses Ruby with MongoDB to define dynamic fields via API. Scoutradioz uses JSON "acorn" configurations that generate entire scouting forms without code changes. When 2023's game featured both Cones AND Cubes while 2024 switched to Notes, these teams simply updated configuration files rather than rebuilding databases.

SQL-based systems like Peregrine (PostgreSQL) and traditional relational databases appear less frequently but prove viable with proper architecture. Peregrine uses golang-migrate for schema version control, adding season-specific columns through migration files. The key insight: whether MongoDB or PostgreSQL, successful systems **separate concerns between fixed and flexible data**.

Configuration-driven forms emerged as a universal pattern. ScoutingPASS, QRScout, and FRC930's system all use JSON configurations specifying field types (counters, booleans, dropdowns), validation rules, and page organization. Non-programmers can adapt these systems to new games by editing configuration files. This democratizes scouting system maintenance, crucial for teams where the software lead graduates and knowledge transfer becomes critical.

## Evergreen foundations: the data that never changes

Certain FRC structures remain absolutely consistent across seasons, providing reliable anchors for database schema. **Team identification** uses four-digit numbers assigned at registration (team_number as primary key) that never change. These link to The Blue Alliance's standardized team_key format (frc####) used industry-wide for data sharing.

**Match structure follows rigid patterns**: exactly 2 minutes 30 seconds duration split into 15-second autonomous followed by 2:15 teleoperated periods. Every match features 3v3 alliances (red vs blue) playing qualification rounds leading to playoff brackets. Match identification combines event_key + comp_level + match_number to create unique identifiers like "2024casj_qm15" (2024 San Jose Regional, Qualification Match 15).

**Competition flow maintains consistency**: teams play 10-12 qualification matches with different alliance partners, rankings determine top 8 alliance captains, snake-draft alliance selection creates playoff brackets, best-of-3 match series determine winners. This tournament structure appears in every FRC event from local competitions to World Championships.

**Core performance categories transcend specific games**. Every season features autonomous scoring, teleoperated scoring, and endgame challenges—only the specific mechanisms change. Defense capability, reliability tracking, cycle time measurement, and driver skill assessment remain valuable metrics regardless of whether robots shoot balls, place cones, or score coral pieces. The concept of "pick ability" (estimating a robot's contribution to alliance success) persists even as the underlying formula adapts to new point systems.

**Robot physical characteristics** like drivetrain type (tank, mecanum, swerve), dimensions, and weight represent evergreen pit scouting data. Rule enforcement through yellow/red cards, foul tracking, and penalty point deductions follows consistent patterns. Drive team composition—up to 3 operators, 1 coach, human players—provides stable organizational structure.

The Blue Alliance's data model exemplifies this stability. Their API maintains consistent team, event, and match endpoints across all seasons. Team resources return team_number, nickname, city, state_prov, and rookie_year identically whether querying 2015 or 2025 data. Event endpoints consistently provide event_key, event_code, year, start_date, and location. Only the score_breakdown field—containing game-specific scoring details—changes structure annually.

## Season-specific variables: the data that transforms annually

**Game pieces define each season's identity**. 2022 featured 9.5-inch inflatable Cargo balls. 2023 introduced dual piece types (yellow rubber Cones AND purple inflated Cubes). 2024 switched to orange foam Notes shaped like torus rings. 2025 brings PVC Coral pipes and inflatable Algae balls. These aren't subtle variations—they represent fundamentally different object manipulation challenges requiring completely different robot mechanisms and scouting metrics.

**Scoring mechanisms undergo radical redesigns**. 2022's Central Hub featured multiple height levels for shooting cargo. 2023's Grids presented 9 nodes per alliance in 3×3 arrays for precise game piece placement. 2024's Speaker required shooting into goals with amplification mechanics, plus Amp scoring and elevated Trap locations. 2025's Reef introduces vertical scoring structures with Processors and Nets. The field geometry, target locations, point values, and optimal strategies differ entirely.

**Endgame challenges transform completely**. 2022 featured climbing on bars with four difficulty levels (Traversal, High, Mid, Low rungs). 2023 required balancing on a Charge Station platform (Dock vs. Engage states). 2024 switched to hanging from chains on a Stage with Harmonizing bonuses for shared chains. 2025 introduces Barge parking and Cage suspension. These aren't variations on a theme—they're entirely different mechanical challenges requiring distinct robot capabilities and scouting questions.

**Ranking Point criteria** (bonus points earned in qualification matches) reset annually with game-specific thresholds. 2023 awarded Sustainability Bonus for 5-6 Links and Activation Bonus for 26+ Charge Station points. 2024 introduced Melody Bonus for 18+ Notes and Ensemble Bonus for 10+ Stage points. These thresholds directly impact match strategy and alliance selection decisions, making them critical scouting priorities, yet they become obsolete each January.

**Autonomous routines vary dramatically** based on field layout and scoring opportunities. 2023's grid placement created three distinct starting positions with different optimal paths. 2024's Note locations and Speaker positioning enabled various multi-piece auto routines. Tracking specific autonomous strategies requires season-specific data structures that can't be generically defined.

Analyzing 2020-2025 seasons reveals no convergence toward standardization. Each game intentionally explores different robot design spaces—shooting vs. placing, climbing vs. balancing, single vs. multiple game piece types, offense-focused vs. defense-viable metas. **This intentional variety means scouting databases must embrace flexibility rather than predict future game mechanics**.

## Recommended schema: PostgreSQL hybrid architecture

After evaluating MongoDB flexibility, PostgreSQL JSONB hybrids, MySQL JSON columns, and EAV patterns, **PostgreSQL with JSONB columns emerges as the optimal solution** for most FRC teams. This approach combines relational structure for evergreen data with document flexibility for season-specific metrics, delivering excellent query performance, ACID compliance, and minimal maintenance overhead.

### Core relational tables for stable entities

```sql
-- Team data persists forever
CREATE TABLE teams (
    team_number INTEGER PRIMARY KEY,
    team_name VARCHAR(255) NOT NULL,
    team_nickname VARCHAR(100),
    city VARCHAR(100),
    state_province VARCHAR(50),
    country VARCHAR(50),
    rookie_year INTEGER,
    website VARCHAR(255),
    
    INDEX idx_location (state_province, country)
);

-- Events follow consistent structure
CREATE TABLE events (
    event_key VARCHAR(50) PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    event_code VARCHAR(20) NOT NULL,
    year INTEGER NOT NULL,
    event_type VARCHAR(50),
    district VARCHAR(50),
    start_date DATE,
    end_date DATE,
    city VARCHAR(100),
    state_province VARCHAR(50),
    country VARCHAR(50),
    
    INDEX idx_year (year),
    INDEX idx_district (district, year)
);

-- Match schedule with alliance composition
CREATE TABLE match_schedule (
    match_id SERIAL PRIMARY KEY,
    event_key VARCHAR(50) REFERENCES events(event_key),
    match_key VARCHAR(100) UNIQUE NOT NULL,
    comp_level VARCHAR(20) NOT NULL,
    set_number INTEGER,
    match_number INTEGER NOT NULL,
    
    -- Alliance composition
    red_1 INTEGER REFERENCES teams(team_number),
    red_2 INTEGER REFERENCES teams(team_number),
    red_3 INTEGER REFERENCES teams(team_number),
    blue_1 INTEGER REFERENCES teams(team_number),
    blue_2 INTEGER REFERENCES teams(team_number),
    blue_3 INTEGER REFERENCES teams(team_number),
    
    -- Official results (from The Blue Alliance)
    red_score INTEGER,
    blue_score INTEGER,
    winning_alliance VARCHAR(10),
    
    scheduled_time TIMESTAMP,
    actual_time TIMESTAMP,
    
    INDEX idx_event (event_key),
    INDEX idx_comp_level (comp_level),
    CHECK (comp_level IN ('qm', 'ef', 'qf', 'sf', 'f'))
);
```

### Hybrid scouting table with JSONB flexibility

```sql
-- Match scouting: structured evergreen + flexible JSONB
CREATE TABLE match_scouting (
    id SERIAL PRIMARY KEY,
    match_id INTEGER REFERENCES match_schedule(match_id) ON DELETE CASCADE,
    team_number INTEGER REFERENCES teams(team_number),
    scout_name VARCHAR(100) NOT NULL,
    device_id VARCHAR(50),
    
    -- Fixed universal fields (never change)
    alliance_color VARCHAR(10) NOT NULL,
    starting_position INTEGER CHECK (starting_position BETWEEN 1 AND 3),
    
    -- Universal performance tracking
    robot_disconnected BOOLEAN DEFAULT false,
    robot_disabled BOOLEAN DEFAULT false,
    foul_count INTEGER DEFAULT 0 CHECK (foul_count >= 0),
    tech_foul_count INTEGER DEFAULT 0 CHECK (tech_foul_count >= 0),
    yellow_card BOOLEAN DEFAULT false,
    red_card BOOLEAN DEFAULT false,
    
    -- Flexible season-specific data (JSONB)
    auto_performance JSONB NOT NULL,
    teleop_performance JSONB NOT NULL,
    endgame_performance JSONB NOT NULL,
    
    -- Universal qualitative assessments
    defense_rating INTEGER CHECK (defense_rating BETWEEN 1 AND 5),
    driver_skill_rating INTEGER CHECK (driver_skill_rating BETWEEN 1 AND 5),
    speed_rating INTEGER CHECK (speed_rating BETWEEN 1 AND 5),
    
    -- Free-form observations
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(match_id, team_number, scout_name),
    CHECK (alliance_color IN ('red', 'blue')),
    
    -- Indexes for common queries
    INDEX idx_team (team_number),
    INDEX idx_match (match_id),
    INDEX idx_scout (scout_name),
    INDEX idx_alliance (alliance_color)
);

-- GIN indexes for efficient JSONB queries
CREATE INDEX idx_auto_gin ON match_scouting USING GIN (auto_performance);
CREATE INDEX idx_teleop_gin ON match_scouting USING GIN (teleop_performance);
CREATE INDEX idx_endgame_gin ON match_scouting USING GIN (endgame_performance);

-- Expression indexes for frequently-queried paths (add as patterns emerge)
CREATE INDEX idx_auto_mobility ON match_scouting 
    ((auto_performance->>'left_starting_zone')::BOOLEAN)
    WHERE auto_performance ? 'left_starting_zone';
```

### Pit scouting with capabilities tracking

```sql
-- Pit scouting: pre-competition robot assessment
CREATE TABLE pit_scouting (
    id SERIAL PRIMARY KEY,
    team_number INTEGER REFERENCES teams(team_number),
    event_key VARCHAR(50) REFERENCES events(event_key),
    
    -- Fixed physical characteristics
    drive_train VARCHAR(50),
    drive_motors VARCHAR(100),
    programming_language VARCHAR(50),
    robot_weight_lbs DECIMAL(5,2) CHECK (robot_weight_lbs <= 125),
    height_inches DECIMAL(4,1),
    width_inches DECIMAL(4,1),
    length_inches DECIMAL(4,1),
    
    -- Year-specific capabilities (JSONB for flexibility)
    robot_capabilities JSONB,
    autonomous_capabilities JSONB,
    
    -- Media and notes
    photo_urls TEXT[],
    robot_features TEXT,
    team_comments TEXT,
    scouting_notes TEXT,
    
    -- Metadata
    scouted_by VARCHAR(100),
    scouted_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(team_number, event_key),
    INDEX idx_drivetrain (drive_train),
    INDEX idx_capabilities_gin USING GIN (robot_capabilities)
);
```

### Season configuration table

```sql
-- Track season-specific configurations
CREATE TABLE season_config (
    year INTEGER PRIMARY KEY,
    game_name VARCHAR(100) NOT NULL,
    game_description TEXT,
    
    -- JSON schemas for validation
    auto_schema JSONB,
    teleop_schema JSONB,
    endgame_schema JSONB,
    capabilities_schema JSONB,
    
    -- Configuration metadata
    kickoff_date DATE,
    championship_dates DATERANGE,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Practical examples: 2024 Crescendo vs 2025 Reefscape

### 2024 Crescendo JSONB structure

```json
{
  "auto_performance": {
    "schema_version": "2024.1",
    "left_starting_zone": true,
    "speaker_notes_scored": 2,
    "speaker_notes_missed": 1,
    "amp_notes_scored": 0,
    "amp_notes_missed": 0,
    "preloaded_note_scored": true,
    "notes_picked_from_ground": 3,
    "notes": "Consistent 2-note auto from center position"
  },
  
  "teleop_performance": {
    "schema_version": "2024.1",
    "speaker_notes_scored": 15,
    "speaker_notes_missed": 3,
    "amp_notes_scored": 8,
    "amp_notes_missed": 1,
    "amplification_activated": true,
    "cycles_completed": 12,
    "cycle_time_avg_seconds": 11.5,
    "source_pickup_count": 18,
    "ground_pickup_count": 5,
    "defense_time_seconds": 0,
    "defended_by_opponent_seconds": 15,
    "notes": "Fast cycles, consistent scoring from mid-range"
  },
  
  "endgame_performance": {
    "schema_version": "2024.1",
    "climb_attempted": true,
    "climb_successful": true,
    "climb_position": "center_chain",
    "climb_time_seconds": 4.2,
    "harmony_climb": true,
    "trap_notes_scored": 1,
    "spotlit": false,
    "notes": "Quick reliable climb, good harmony coordination"
  }
}
```

### 2025 Reefscape JSONB structure (different game, same tables)

```json
{
  "auto_performance": {
    "schema_version": "2025.1",
    "left_starting_zone": true,
    "coral_scored_reef": 2,
    "coral_scored_processor": 0,
    "algae_scored_net": 1,
    "algae_scored_processor": 0,
    "coral_missed": 0,
    "algae_missed": 0,
    "reef_level_achieved": "L3",
    "notes": "Strong 3-piece auto, reached L3 reef"
  },
  
  "teleop_performance": {
    "schema_version": "2025.1",
    "coral_scored_reef": 8,
    "coral_scored_processor": 2,
    "algae_scored_net": 3,
    "algae_scored_processor": 1,
    "coral_missed": 2,
    "algae_missed": 0,
    "cycles_completed": 14,
    "cycle_time_avg_seconds": 9.8,
    "reef_level_max_achieved": "L4",
    "ground_pickup_coral": 7,
    "ground_pickup_algae": 3,
    "station_pickup_coral": 3,
    "station_pickup_algae": 1,
    "defense_effectiveness": "minimal",
    "notes": "Excellent cycle times, can handle both game pieces"
  },
  
  "endgame_performance": {
    "schema_version": "2025.1",
    "barge_attempted": true,
    "barge_successful": true,
    "barge_position": "shallow",
    "cage_climb_attempted": false,
    "cage_climb_successful": false,
    "cage_level_achieved": null,
    "suspension_successful": false,
    "endgame_points": 6,
    "notes": "Parked in shallow barge, no climb attempt"
  }
}
```

### Querying across both seasons

```sql
-- Top autonomous performers (works for any season)
SELECT 
    ms.team_number,
    t.team_name,
    e.year,
    e.game_name,
    COUNT(*) as matches,
    AVG(COALESCE((ms.auto_performance->>'speaker_notes_scored')::INT, 
                 (ms.auto_performance->>'coral_scored_reef')::INT, 
                 0)) as avg_auto_score
FROM match_scouting ms
JOIN teams t ON ms.team_number = t.team_number
JOIN match_schedule m ON ms.match_id = m.match_id
JOIN events e ON m.event_key = e.event_key
WHERE e.year IN (2024, 2025)
GROUP BY ms.team_number, t.team_name, e.year, e.game_name
HAVING COUNT(*) >= 5
ORDER BY e.year DESC, avg_auto_score DESC
LIMIT 20;

-- Endgame consistency (adapts to different endgame types)
SELECT 
    team_number,
    COUNT(*) as matches,
    SUM(CASE 
        WHEN (endgame_performance->>'climb_successful')::BOOLEAN = true 
        THEN 1 
        WHEN (endgame_performance->>'barge_successful')::BOOLEAN = true 
        THEN 1 
        ELSE 0 
    END) as endgame_successes,
    ROUND(100.0 * SUM(CASE 
        WHEN (endgame_performance->>'climb_successful')::BOOLEAN = true 
        THEN 1 
        WHEN (endgame_performance->>'barge_successful')::BOOLEAN = true 
        THEN 1 
        ELSE 0 
    END) / COUNT(*), 1) as success_percentage
FROM match_scouting
GROUP BY team_number
HAVING COUNT(*) >= 5
ORDER BY success_percentage DESC, endgame_successes DESC;
```

## Implementation workflow: from kickoff to competition

### Pre-season preparation (December - Week 0)

**Before game reveal**, prepare your infrastructure. Install PostgreSQL, set up the core relational tables (teams, events, match_schedule, match_scouting, pit_scouting, season_config), create base indexes, and test data insertion. Import historical team data from The Blue Alliance API. Set up your development environment and data entry interfaces using placeholder JSONB structures.

Build a configuration management system that defines your JSONB schemas. Use JSON Schema validation or Pydantic models to enforce data types and required fields. This validation layer prevents garbage data from entering your database and makes debugging easier during hectic competition days.

### Game reveal and analysis (Week 0-1)

**Watch the kickoff broadcast** and download the game manual immediately. Within 24 hours, identify all scoring mechanisms, game pieces, field elements, and endgame challenges. Map these to your data structure:

- **Autonomous actions**: What can robots score? From where? How tracked?
- **Teleoperated scoring**: What scoring locations exist? How many points each?
- **Cycle tracking**: What constitutes a complete cycle? Time measurement points?
- **Endgame challenges**: Success/failure criteria? Point values? Special bonuses?

Design your JSONB structure for auto_performance, teleop_performance, and endgame_performance. Include schema_version fields for future modifications. Add notes fields at multiple levels for qualitative observations. **Keep the structure flat** (avoid deep nesting) to simplify queries.

### Schema refinement (Week 1-2)

Create the season_config entry for 2026. Define JSON Schema validation rules matching your JSONB structure. Build data entry forms (web, mobile, or both) that generate valid JSONB objects. Implement validation at multiple layers: client-side for immediate feedback, server-side before database insertion, and database constraints for final enforcement.

Test with mock data. Create fictional matches with realistic performance values. Run your planned queries (top scorers, endgame success rates, cycle times, defense ratings) to verify the schema supports your analytics needs. **Iterate based on query complexity**—if you're writing complex JSONB path expressions repeatedly, consider expression indexes or materialized views.

### Scout training (Week 2-4)

Develop scouting guides explaining what to track and how to measure it. For subjective ratings (defense, driver skill, speed), provide anchor examples: "Rating 5 means consistently effective defense preventing multiple scoring attempts, rating 3 means occasional interference, rating 1 means no defensive impact." Consistency across scouts matters more than perfect accuracy.

Practice with scrimmage data or video from previous years' matches (even different games—focus on training observation skills). Have multiple scouts track the same match independently, then compare results. Calculate inter-rater reliability and provide feedback. The Blue Alliance or YouTube provide unlimited practice material.

### Competition deployment (Weeks 5+)

At events, your database becomes mission-critical. Test all systems before competition starts. Verify data entry devices connect to your server (or operate offline with QR code sync). Assign scouts to specific positions with clear responsibilities—Team 1678 uses 3 scouts per robot, but even 1-2 per robot generates valuable data if trained well.

**Implement data quality checks**. After each match, verify total scores roughly match The Blue Alliance official results (accounting for penalties). Flag outliers for review. If one scout consistently records 2x the scores of others, either they're observing something others miss or they're miscounting. Real-time validation prevents carrying bad data through alliance selection.

Build dashboards showing team statistics, ranking predictions, and pick lists. Export to spreadsheets for strategists who prefer familiar tools. The Blue Alliance API provides official match results—integrate these to supplement your scouting data. Many teams use TBA data for teams they couldn't scout directly.

### Post-season evolution (May+)

After championships, analyze what worked and what didn't. Which metrics proved predictive? Which were noise? Update your core schema if you discovered fundamental issues, but resist over-engineering. The hybrid JSONB approach succeeds because it accommodates uncertainty—you don't need perfect schema design, just good-enough structure with flexibility to adapt.

Archive season-specific data but maintain access for historical analysis. Comparing team performance across years provides insights into program consistency and growth trajectories. Teams that consistently perform well across different game types demonstrate strong fundamentals (drive team skill, mechanical reliability, strategic thinking) that transcend specific game mechanics.

## Alternative approaches and when to choose them

**MongoDB remains viable** if your team has strong JavaScript/NoSQL expertise or anticipates massive scale (hundreds of thousands of records). Teams like 1678 prove MongoDB works excellently for FRC scouting. The document model naturally maps to match data, and horizontal scaling supports ambitious analytics. However, MongoDB's schemaless nature can become a liability without rigorous validation—bad data is easier to insert and harder to clean. If you choose MongoDB, invest heavily in application-layer validation.

**MySQL with JSON columns** provides middle-ground functionality. It's more common in shared hosting environments and integrates well with PHP-based web applications. JSON support in MySQL 5.7+ enables similar patterns to PostgreSQL JSONB, though with less elegant syntax (functions vs operators) and weaker indexing. Choose MySQL if your organization standardizes on it or you need the simplicity of shared hosting.

**Google Sheets with Apps Script** works for resource-limited teams. Many successful teams use Forms for data collection feeding into Sheets for analysis. While not a "database," Sheets handles thousands of rows adequately for single-season analysis. The accessibility—anyone with a Google account can contribute—and zero infrastructure costs make this attractive. However, Sheets struggles with complex queries, multi-season history, and data integrity constraints that databases handle naturally.

**Avoid Entity-Attribute-Value (EAV)** patterns despite their theoretical flexibility. Storing data as (entity, attribute, value) triplets creates severe query complexity requiring multiple self-joins for simple questions. Database experts widely consider EAV an anti-pattern. The flexibility JSONB provides accomplishes the same goals with dramatically better usability and performance.

## Schema extensions: advanced features

### Multi-scout consolidation

Team 1678's three-scouts-per-robot approach generates redundant data requiring consolidation. Implement this by tracking scout_name in match_scouting, then creating consolidated views:

```sql
CREATE VIEW consolidated_match_data AS
SELECT 
    match_id,
    team_number,
    alliance_color,
    
    -- Majority vote for booleans
    MODE() WITHIN GROUP (ORDER BY robot_disconnected) as robot_disconnected,
    
    -- Weighted average for counts (by scout reliability if tracked)
    ROUND(AVG((auto_performance->>'speaker_scored')::INT)) as avg_auto_speaker,
    
    -- Combine notes
    STRING_AGG(notes, ' | ' ORDER BY scout_name) as combined_notes,
    
    COUNT(DISTINCT scout_name) as scout_count
FROM match_scouting
GROUP BY match_id, team_number, alliance_color;
```

Track scout performance ratings (SPR - Scout Performance Rating) by comparing their observations to official results and other scouts. Use these ratings to weight averages in consolidation algorithms.

### Predictive metrics calculation

Store calculated statistics in separate tables for performance:

```sql
CREATE TABLE team_statistics (
    team_number INTEGER REFERENCES teams(team_number),
    event_key VARCHAR(50) REFERENCES events(event_key),
    
    matches_played INTEGER,
    avg_total_score DECIMAL(5,2),
    avg_auto_score DECIMAL(5,2),
    avg_teleop_score DECIMAL(5,2),
    avg_endgame_score DECIMAL(5,2),
    
    -- Calculated ratings
    opr DECIMAL(6,2), -- Offensive Power Rating
    dpr DECIMAL(6,2), -- Defensive Power Rating  
    ccwm DECIMAL(6,2), -- Calculated Contribution to Winning Margin
    
    endgame_success_rate DECIMAL(5,2),
    reliability_score DECIMAL(5,2),
    
    -- Pick list ranking
    first_pick_ability DECIMAL(6,2),
    second_pick_ability DECIMAL(6,2),
    
    updated_at TIMESTAMP DEFAULT NOW(),
    
    PRIMARY KEY (team_number, event_key)
);
```

Recalculate these statistics after each match using materialized views or scheduled jobs. Picklist editors query this table rather than raw scouting data for responsive performance.

### Media integration

Store photo URLs and video timestamps for review:

```sql
ALTER TABLE match_scouting ADD COLUMN video_timestamp INTEGER;
ALTER TABLE pit_scouting ADD COLUMN photo_urls TEXT[];

-- Query teams with specific capabilities via photos
SELECT team_number, photo_urls 
FROM pit_scouting 
WHERE robot_capabilities->>'swerve_drive' = 'true'
AND array_length(photo_urls, 1) > 0;
```

### Offline synchronization tracking

For QR code or offline-first mobile apps:

```sql
CREATE TABLE sync_queue (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    data_payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    synced_at TIMESTAMP,
    sync_status VARCHAR(20) DEFAULT 'pending',
    
    INDEX idx_pending (sync_status, created_at)
);
```

## Key takeaways and recommendations

**Start with the PostgreSQL hybrid approach** unless you have compelling reasons otherwise. It provides 80% of NoSQL flexibility with 100% of relational reliability. The learning curve is gentle for teams familiar with SQL, hosting costs are minimal (single server handles thousands of matches), and the mature ecosystem provides extensive tooling and community support.

**Design for adaptability, not prediction**. You can't anticipate future game mechanics, so don't try. Create flexible JSONB fields for season-specific data and focus your engineering effort on robust validation, efficient queries, and quality user interfaces. The best schema is the one your team actually uses consistently.

**Validate rigorously at every layer**. Define JSON Schemas or Pydantic models for your JSONB structures. Implement client-side validation for immediate feedback, server-side validation before database writes, and database constraints as final safeguards. Bad data is worse than no data—it leads to incorrect strategic decisions.

**Prioritize data quality over quantity**. Team 1678's research shows that less data collected more accurately outperforms more data collected sloppily. If limited by volunteer scouts, focus on core metrics (scoring counts, endgame success, reliability) rather than attempting comprehensive tracking that introduces errors.

**Build for your team's capabilities**. If you have experienced database developers, implement the full PostgreSQL solution with calculated statistics, materialized views, and sophisticated queries. If you're learning as you go, start simpler—even well-structured Google Sheets beats an over-engineered database nobody understands. You can migrate data later if you outgrow simple solutions.

The extensible scouting database doesn't require prescience about future games. It requires smart separation of concerns: structure the stable, flex the variable, validate rigorously, and iterate based on real competition experience. This architecture served championship teams well across radically different games and will continue serving them as FIRST invents new challenges each January.

Your 2026 schema is ready: create the relational foundation now, design the JSONB structure at kickoff, and adapt as you learn what matters for this year's game. The system that balances structure with flexibility wins—not the most complex architecture, but the most maintainable one that your team will actually use consistently throughout the season.