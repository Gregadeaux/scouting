# Documentation

Comprehensive documentation for the FRC Scouting System.

## Getting Started

New to the project? Start here:
1. Read [`/README.md`](/README.md) - Project overview and quick start
2. Read [`/CLAUDE.md`](/CLAUDE.md) - Current application state and AI assistant guide
3. Read [`/scouting_research.md`](/scouting_research.md) - Foundational research and architecture decisions

## Setup Guides

Setting up your development environment:

- **[Supabase Setup](./setup/supabase.md)** - Database connection + Auth configuration (comprehensive guide)
- **[Admin Setup](./setup/admin.md)** - Admin dashboard configuration
- **[Storage Setup](./setup/storage.md)** - Supabase Storage for robot photos
- **[Audit Log Setup](./setup/audit-log.md)** - Security audit logging

## Features

Documentation for implemented features:

- **[Admin Dashboard](./features/admin/)** - Events, teams, users management (CRUD + TBA import)
- **[Authentication](./features/auth/)** - Login, signup, RBAC with 3 roles (admin, scout, viewer)
- **[Storage](./features/storage/)** - Robot photo uploads with Supabase Storage
- **[Pit Scouting](./features/pit-scouting/)** - Pre-competition robot capabilities scouting
- **[Offline Support](./features/offline/)** - IndexedDB-based sync system for offline scouting

## Progress Archive

Historical implementation summaries (for reference):

- **[Phase 1-3 Progress](./progress/)** - Service layer and infrastructure implementation
- **[Feature Summaries](./progress/)** - Admin, pit scouting, storage implementation histories

These documents capture the evolution of the project and can be referenced for understanding design decisions.

## Contributing

When adding new documentation:

- **Setup guides** → `/docs/setup/`
- **Feature docs** → `/docs/features/{feature-name}/`
- **Implementation summaries** → `/docs/progress/` (when feature is complete)
- **How-to guides** → `/docs/guides/` (tutorials and walkthroughs)

## Quick Links

### For Developers
- [Database Schema](/supabase-schema.sql)
- [Type Definitions](/src/types/)
- [API Routes](/src/app/api/)

### For Scouts
- [Match Scouting Guide](./features/match-scouting/) (Coming soon)
- [Pit Scouting Guide](./features/pit-scouting/)

### For Admins
- [Admin Dashboard Guide](./features/admin/)
- [User Management](./features/admin/quick-start.md)

---

**Last Updated**: 2025-10-24
