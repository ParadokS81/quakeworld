import type { InvokeFn } from "./invoke-types";

interface BootstrapArgs {
  invoke: InvokeFn;
  client: string;
  canonicalExePath: string | null;
}

type ReconcileResult =
  | { status: "no_active" }
  | { status: "matched"; version: string }
  | { status: "foreign"; sha256: string };

export async function runWarehouseBootstrap(args: BootstrapArgs): Promise<void> {
  if (!args.canonicalExePath) return;
  const result = await args.invoke<ReconcileResult>("reconcile_active_version", {
    client: args.client,
    canonicalExePath: args.canonicalExePath,
  });
  if (result.status === "foreign") {
    await args.invoke("import_existing_install", {
      client: args.client,
      exePath: args.canonicalExePath,
    });
    await args.invoke("reconcile_active_version", {
      client: args.client,
      canonicalExePath: args.canonicalExePath,
    });
  }
}
