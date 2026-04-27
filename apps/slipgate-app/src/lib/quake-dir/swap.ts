import type { InvokeFn } from "./invoke-types";

export interface SwapResult {
  previous_sha256: string | null;
  previous_was_foreign: boolean;
  new_version: string;
  backup_path: string | null;
}

export interface SwapArgs {
  client: string;
  targetVersion: string;
  quakeDir: string;
  targetExeName: string;
  /** Optional variant suffix; pairs with targetExeName to choose the
   * `<family>-<variant>.exe` canonical slot under D6+D8. */
  targetVariant?: string | null;
}

export async function swapActiveVersion(invoke: InvokeFn, args: SwapArgs): Promise<SwapResult> {
  return invoke<SwapResult>("swap_active_version", {
    client: args.client,
    targetVersion: args.targetVersion,
    quakeDir: args.quakeDir,
    targetExeName: args.targetExeName,
    targetVariant: args.targetVariant ?? null,
  });
}

export async function deleteWarehousedVersion(
  invoke: InvokeFn,
  client: string,
  version: string,
  variant?: string | null,
): Promise<void> {
  await invoke("delete_warehoused_version", { client, version, variant: variant ?? null });
}

export type ReconcileResult =
  | { status: "no_active" }
  | { status: "matched"; version: string }
  | { status: "foreign"; sha256: string };

export async function userInitiatedReconcile(
  invoke: InvokeFn,
  client: string,
  canonicalExePath: string,
): Promise<ReconcileResult> {
  return invoke<ReconcileResult>("reconcile_active_version", {
    client,
    canonicalExePath,
  });
}
