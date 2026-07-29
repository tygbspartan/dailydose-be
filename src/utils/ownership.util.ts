import { ForbiddenError } from "./customError.util";
import { JwtPayload } from "../types/auth.types";
import { ROLES } from "../constants/roles.constants";

/**
 * Enforce that the caller may manage a resource owned by `ownerId`.
 * - Superadmin may manage anything (including platform-owned, ownerId = null).
 * - A vendor may manage only resources they own (ownerId === their userId).
 * Platform-owned resources (ownerId = null) are off-limits to vendors.
 */
export function assertOwnership(
  ownerId: number | null | undefined,
  user: JwtPayload,
  message = "You can only manage your own items.",
): void {
  if (user.role === ROLES.SUPERADMIN) return;
  if (ownerId == null || ownerId !== user.userId) {
    throw new ForbiddenError(message);
  }
}

/** True when the user is a vendor scoped to their own data (i.e. not a superadmin). */
export function isScopedVendor(user: JwtPayload): boolean {
  return user.role !== ROLES.SUPERADMIN;
}
