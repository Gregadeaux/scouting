# Admin Audit Log Setup

This document explains the audit logging system for tracking administrative actions in the FRC Scouting System.

## 🎯 Overview

The audit log system automatically tracks all administrative actions including:
- User creation, updates, and deletions
- Role changes
- Team assignments
- Account activations/deactivations

All actions are displayed in the **Recent Activity** section on the admin dashboard.

## 📋 Setup Instructions

### 1. Create the Audit Log Table

Run the SQL file in your **Supabase SQL Editor**:

```bash
create-audit-log.sql
```

This creates:
- ✅ `admin_audit_log` table for storing all admin actions
- ✅ Indexes for performance
- ✅ Automatic triggers that log user profile changes
- ✅ Helper function to backfill existing data

### 2. Verify the Setup

After running the SQL, verify the table exists:

```sql
SELECT COUNT(*) FROM admin_audit_log;
```

Should return `0` (or more if you've already made changes).

## 📊 What Gets Logged

### Automatic Logging (via Database Triggers)

The following actions are **automatically** logged when they happen:

| Action | Trigger | Description |
|--------|---------|-------------|
| **User Created** | `INSERT` on `user_profiles` | New user signs up or is created |
| **User Updated** | `UPDATE` on `user_profiles` | User profile changes |
| **Role Changed** | `UPDATE` on `user_profiles` (role column) | User role is modified |
| **Team Assignment** | `UPDATE` on `user_profiles` (primary_team_number) | User assigned to team |
| **Account Status** | `UPDATE` on `user_profiles` (is_active) | Account activated/deactivated |
| **User Deleted** | `DELETE` on `user_profiles` | User account is removed |

### Activity Types

The system tracks these activity types:

```typescript
type ActivityType =
  | 'user_created'        // New user account
  | 'user_updated'        // Profile updated
  | 'user_role_changed'   // Role modified
  | 'user_deleted'        // Account deleted
  | 'team_created'        // New team added
  | 'event_created'       // New event added
  | 'match_scheduled'     // Match scheduled
  | 'match_scouted'       // Scouting data submitted
```

## 🎨 Dashboard Display

Activities appear in the admin dashboard with color-coded icons:

| Activity | Icon | Color |
|----------|------|-------|
| User Created | 👤➕ | Teal |
| User Updated | ✏️ | Indigo |
| Role Changed | 🛡️ | Pink |
| User Deleted | 👤➖ | Red |
| Team Created | 👥 | Blue |
| Event Created | 📅 | Green |
| Match Scheduled | 📋 | Purple |
| Match Scouted | 📝 | Orange |

## 🔍 Example Activity Descriptions

The system generates human-readable descriptions:

```
✅ User gregadeaux@gmail.com was created
✅ User gregadeaux@gmail.com role changed from scouter to admin
✅ User gregadeaux@gmail.com team changed to 930
✅ User gregadeaux@gmail.com was activated
✅ User test@example.com was deleted
```

## 📖 Querying the Audit Log

### View All Recent Activity

```sql
SELECT
  action_type,
  description,
  created_at
FROM admin_audit_log
ORDER BY created_at DESC
LIMIT 20;
```

### View User-Specific Actions

```sql
SELECT
  action_type,
  description,
  created_at
FROM admin_audit_log
WHERE entity_id = 'user-uuid-here'
ORDER BY created_at DESC;
```

### View Role Changes

```sql
SELECT
  description,
  changes,
  created_at
FROM admin_audit_log
WHERE action_type = 'user_role_changed'
ORDER BY created_at DESC;
```

### See Before/After Values

```sql
SELECT
  description,
  changes->>'before' as before_value,
  changes->>'after' as after_value,
  created_at
FROM admin_audit_log
WHERE action_type = 'user_updated'
ORDER BY created_at DESC;
```

## 🔐 Security & Compliance

### Data Retention

The audit log stores:
- ✅ All administrative actions
- ✅ Timestamp of each action
- ✅ Who performed the action (if applicable)
- ✅ Before/after values for updates
- ✅ Full change history

### Permissions

- **Read Access**: All authenticated users can view the log
- **Write Access**: Only the database triggers can write to the log
- **Cannot be modified**: Audit entries are immutable once created

### Compliance Benefits

- 📋 Complete audit trail for security reviews
- 🔍 Accountability for all admin actions
- 📊 Reporting for compliance requirements
- 🛡️ Tamper-proof logging (via database triggers)

## 🚀 Future Enhancements

Potential improvements:

1. **IP Address Tracking**: Log the IP address of the admin
2. **User Agent**: Track browser/device information
3. **Manual Audit Entries**: Allow admins to add notes
4. **Export to CSV**: Download audit logs for compliance
5. **Retention Policies**: Auto-archive old logs
6. **Alert System**: Notify on suspicious activity

## 🐛 Troubleshooting

### No Activities Showing

1. **Check the table exists**:
   ```sql
   SELECT * FROM admin_audit_log LIMIT 1;
   ```

2. **Verify triggers are active**:
   ```sql
   SELECT
     trigger_name,
     event_manipulation,
     event_object_table
   FROM information_schema.triggers
   WHERE event_object_table = 'user_profiles';
   ```

3. **Refresh the dashboard**: Hard refresh (Cmd/Ctrl + Shift + R)

### Activities Not Updating

- The dashboard fetches new data on page load
- Refresh the page after making changes
- Check browser console for API errors

## 📝 Notes

- The audit log is **append-only** (no updates or deletes)
- Triggers run **automatically** - no code changes needed
- The system logs **significant** changes only (not every field update)
- Timestamps are in **UTC timezone**

---

**Last Updated**: 2025-10-21
