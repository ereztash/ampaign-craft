import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { Team, TeamMember, TeamInvitation } from "@/types/team";
import type { UserRole } from "@/types/governance";

const TEAM_KEY = "funnelforge-team";

interface TeamContextValue {
  team: Team | null;
  invitations: TeamInvitation[];
  createTeam: (name: string, ownerId: string) => Team;
  inviteMember: (email: string, role: UserRole) => TeamInvitation | null;
  removeMember: (userId: string) => void;
  listMembers: () => TeamMember[];
}

const TeamContext = createContext<TeamContextValue | null>(null);

function loadTeam(): Team | null {
  try {
    const raw = localStorage.getItem(TEAM_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveTeam(team: Team): void {
  localStorage.setItem(TEAM_KEY, JSON.stringify(team));
}

export function TeamProvider({ children }: { children: ReactNode }) {
  const [team, setTeam] = useState<Team | null>(() => loadTeam());
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);

  const createTeam = useCallback((name: string, ownerId: string): Team => {
    const newTeam: Team = {
      id: `team_${Date.now()}`,
      name,
      ownerId,
      members: [{
        userId: ownerId,
        email: "",
        displayName: "Owner",
        role: "owner",
        invitedAt: new Date().toISOString(),
        acceptedAt: new Date().toISOString(),
      }],
      createdAt: new Date().toISOString(),
    };
    setTeam(newTeam);
    saveTeam(newTeam);
    return newTeam;
  }, []);

  const inviteMember = useCallback((email: string, role: UserRole): TeamInvitation | null => {
    if (!team) return null;

    const invitation: TeamInvitation = {
      id: `inv_${Date.now()}`,
      teamId: team.id,
      email,
      role,
      invitedBy: team.ownerId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "pending",
    };

    setInvitations((prev) => [...prev, invitation]);
    return invitation;
  }, [team]);

  const removeMember = useCallback((userId: string) => {
    if (!team) return;
    const updated: Team = {
      ...team,
      members: team.members.filter((m) => m.userId !== userId),
    };
    setTeam(updated);
    saveTeam(updated);
  }, [team]);

  const listMembers = useCallback((): TeamMember[] => {
    return team?.members ?? [];
  }, [team]);

  return (
    <TeamContext.Provider value={{ team, invitations, createTeam, inviteMember, removeMember, listMembers }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  const ctx = useContext(TeamContext);
  if (!ctx) throw new Error("useTeam must be used within TeamProvider");
  return ctx;
}
