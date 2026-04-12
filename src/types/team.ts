// ═══════════════════════════════════════════════
// Team Types — Multi-user collaboration foundation
// Gated behind Business tier.
// ═══════════════════════════════════════════════

import type { UserRole } from "./governance";

export interface Team {
  id: string;
  name: string;
  ownerId: string;
  members: TeamMember[];
  createdAt: string;
}

export interface TeamMember {
  userId: string;
  email: string;
  displayName: string;
  role: UserRole;
  invitedAt: string;
  acceptedAt: string | null;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: UserRole;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
  status: "pending" | "accepted" | "declined" | "expired";
}
