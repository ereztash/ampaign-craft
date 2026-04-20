// Shared role gate used by AdminRoute, AARRRDashboard, and sidebar/topbar
// admin-only UI. Previously these were inline string checks that drifted
// (AdminRoute accepted "owner|admin" but AARRRDashboard accepted only "admin"),
// which meant a user could load /admin/agents but get bounced off /admin/aarrr.
export function isAdminRole(role: string | undefined | null): boolean {
  return role === "admin" || role === "owner";
}
