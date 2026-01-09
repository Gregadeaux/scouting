'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { UserRole } from '@/types/auth';

interface UserWithTeam {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  primary_team_number?: number | null;
  is_active: boolean;
}

interface EditUserModalProps {
  user: UserWithTeam;
  teams: Array<{ team_number: number; team_name: string }>;
  onSave: (userId: string, updates: Partial<UserWithTeam>) => void;
  onClose: () => void;
  isLoading: boolean;
}

export function EditUserModal({ user, teams, onSave, onClose, isLoading }: EditUserModalProps) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [teamNumber, setTeamNumber] = useState<string>(
    user.primary_team_number?.toString() || 'none'
  );
  const [isActive, setIsActive] = useState(user.is_active);

  // Update state when user prop changes
  useEffect(() => {
    setRole(user.role);
    setTeamNumber(user.primary_team_number?.toString() || 'none');
    setIsActive(user.is_active);
  }, [user]);

  const handleSave = () => {
    const updates: Partial<UserWithTeam> = {};

    if (role !== user.role) updates.role = role;

    const currentTeam = user.primary_team_number?.toString() || 'none';
    if (teamNumber !== currentTeam) {
      updates.primary_team_number = teamNumber === 'none' ? null : parseInt(teamNumber);
    }

    if (isActive !== user.is_active) updates.is_active = isActive;

    onSave(user.id, updates);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Email</Label>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>

          <div className="grid gap-2">
            <Label>Full Name</Label>
            <div className="text-sm text-muted-foreground">{user.full_name || '-'}</div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="mentor">Mentor</SelectItem>
                <SelectItem value="scouter">Scouter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="team">Team</Label>
            <Select value={teamNumber} onValueChange={setTeamNumber}>
              <SelectTrigger id="team">
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Team</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.team_number} value={team.team_number.toString()}>
                    {team.team_number} - {team.team_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="is-active"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked as boolean)}
            />
            <Label htmlFor="is-active" className="cursor-pointer">
              Active Account
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
