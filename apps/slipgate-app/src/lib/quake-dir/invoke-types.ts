export type InvokeFn = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
