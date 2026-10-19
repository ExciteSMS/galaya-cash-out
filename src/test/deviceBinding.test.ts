import { describe, it, expect, vi, beforeEach } from "vitest";

type Row = Record<string, unknown>;
const { rpc, state } = vi.hoisted(() => ({
  rpc: vi.fn(),
  state: { devices: [] as Record<string, unknown>[], calls: [] as { op: string; table?: string; payload?: Record<string, unknown> }[] },
}));
const calls = state.calls;

function builder(table: string) {
  let op = "select";
  const b: any = {
    select: () => b,
    insert: (p: Row) => { calls.push({ op: "insert", table, payload: p }); return Promise.resolve({ error: null }); },
    update: (p: Row) => { op = "update"; calls.push({ op: "update", table, payload: p }); return b; },
    eq: () => b,
    then: (res: (v: unknown) => unknown) =>
      Promise.resolve({ data: state.devices, error: null }).then(res),
  };
  return b;
}
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: builder, rpc } }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock("@capacitor/device", () => ({ Device: {} }));

import { verifyDeviceForUser, getDeviceId } from "@/lib/deviceId";

describe("device binding", () => {
  beforeEach(() => { state.devices = []; calls.length = 0; rpc.mockReset(); rpc.mockResolvedValue({ data: null, error: null }); localStorage.clear(); });

  it("binds the first device", async () => {
    const r = await verifyDeviceForUser("u1");
    expect(r.ok).toBe(true);
    expect(calls.find((c) => c.op === "insert")?.payload).toMatchObject({ user_id: "u1", is_bound: true });
  });

  it("blocks a different device and files a transfer request", async () => {
    state.devices = [{ id: "1", device_id: "other", is_bound: true, is_active: true, remote_disabled: false }];
    const r = await verifyDeviceForUser("u1");
    expect(r.ok).toBe(false);
    expect(rpc).toHaveBeenCalledWith("request_device_transfer", { p_device_id: await getDeviceId() });
    expect(calls.find((c) => c.op === "insert")?.payload).toMatchObject({ is_bound: false });
  });

  it("allows the bound device", async () => {
    const id = await getDeviceId();
    state.devices = [{ id: "1", device_id: id, is_bound: true, is_active: true, remote_disabled: false }];
    expect((await verifyDeviceForUser("u1")).ok).toBe(true);
  });

  it("refuses a remotely disabled device", async () => {
    const id = await getDeviceId();
    state.devices = [{ id: "1", device_id: id, is_bound: true, is_active: true, remote_disabled: true }];
    const r = await verifyDeviceForUser("u1");
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/disabled/i);
  });

  it("rebinds after an admin release", async () => {
    const id = await getDeviceId();
    state.devices = [{ id: "1", device_id: id, is_bound: false, is_active: false, remote_disabled: false }];
    expect((await verifyDeviceForUser("u1")).ok).toBe(true);
    expect(calls.find((c) => c.op === "update")?.payload).toMatchObject({ is_bound: true });
  });
});
