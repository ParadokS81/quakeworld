import type { InvokeFn } from "./invoke-types";

export type DataRootMode = "portable" | "installed";

export interface DataRootInfo {
  path: string;
  mode: DataRootMode;
}

export async function getDataRoot(invoke: InvokeFn): Promise<DataRootInfo> {
  return invoke<DataRootInfo>("get_data_root");
}
