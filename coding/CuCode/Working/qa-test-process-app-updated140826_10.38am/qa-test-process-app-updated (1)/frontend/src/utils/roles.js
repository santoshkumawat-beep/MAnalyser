// Mirrors backend/utils/reportAccess.js — kept in sync so the UI only shows
// links the API will actually let the user use. The API re-checks all of
// this itself server-side, so this file is purely for UI show/hide, never
// the actual security boundary.

function normalize(value) {
  return (value || '').toString().trim().toUpperCase();
}

// Super Admin / Super User: Internal group type + name contains "SUPER ADMIN".
export function isSuperAdmin(user) {
  if (!user) return false;
  return normalize(user.NameOfUser).includes('SUPER ADMIN') && normalize(user.UserGroupType).includes('INTERNAL');
}

// Group Admin: name contains "ADMIN" (e.g. "REIL ADMIN", "DEPT ADMIN").
// Every Super Admin also matches this (their name contains "ADMIN" too),
// which is fine — hasReportAccess() below just needs "does this user get
// into the admin report pages at all".
export function isGroupAdmin(user) {
  if (!user) return false;
  return normalize(user.NameOfUser).includes('ADMIN');
}

export function hasReportAccess(user) {
  return isGroupAdmin(user) || isSuperAdmin(user);
}
