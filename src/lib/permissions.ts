export type MerchantRole = "owner" | "manager" | "supervisor" | "cashier" | "viewer";
export type Permission = "owner" | "manage" | "inventory" | "sell";

// Mirrors public.has_merchant_perm in the database, which is what actually enforces access.
const GRANTS: Record<Permission, MerchantRole[]> = {
  owner: ["owner"],
  manage: ["owner", "manager"],
  inventory: ["owner", "manager", "supervisor"],
  sell: ["owner", "manager", "supervisor", "cashier"],
};

export function can(role: MerchantRole | null | undefined, permission: Permission): boolean {
  return !!role && GRANTS[permission].includes(role);
}

export const SETTINGS_PERMISSION: Record<string, Permission> = {
  profile: "owner",
  goal: "owner",
  staff: "owner",
  payout: "owner",
  payments: "manage",
  webhooks: "manage",
  zra: "manage",
  loyalty: "manage",
  tip: "manage",
  inventory: "inventory",
  split: "sell",
};

export const ROLE_LABELS: Record<Exclude<MerchantRole, "owner">, string> = {
  manager: "Manager",
  supervisor: "Supervisor",
  cashier: "Cashier",
  viewer: "Viewer (read-only)",
};
