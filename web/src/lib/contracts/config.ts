// Typed consumer defaults. Protected persistence/audit is a later server concern;
// no client can write hosted configuration through this registry.
type NumericSetting = { default: number; min: number; max: number; description: string; isPublic?: boolean };
export const configRegistry = {
  page_size: { default: 20, min: 1, max: 50, description: 'Default bounded feed/inbox page size', isPublic: true },
  message_page_size: { default: 50, min: 1, max: 100, description: 'Default bounded message page size', isPublic: true },
  introductions_per_day: { default: 20, min: 1, max: 1000, description: 'Server-owned invitation daily cap; compatible with mvp_limits' },
} as const satisfies Record<string, NumericSetting>;
export type ConfigKey = keyof typeof configRegistry;
export type ResolvedConfig = { version: 1; values: Record<ConfigKey, number> };
export function resolveConfig(input: unknown): ResolvedConfig {
  const record = input !== null && typeof input === 'object' ? input as Record<string, unknown> : {};
  const values = record.version === 1 && record.values !== null && typeof record.values === 'object'
    ? record.values as Record<string, unknown> : {};
  const resolved = Object.fromEntries(Object.entries(configRegistry).map(([key, entry]) => {
    const value = Object.hasOwn(values, key) ? values[key] : undefined;
    return [key, typeof value === 'number' && Number.isInteger(value) && value >= entry.min && value <= entry.max ? value : entry.default];
  })) as Record<ConfigKey, number>;
  return { version: 1, values: resolved };
}
export function publicConfig(input: unknown): Record<string, number> {
  const { values } = resolveConfig(input);
  return Object.fromEntries(Object.entries(configRegistry).filter(([, entry]) => 'isPublic' in entry && entry.isPublic === true)
    .map(([key]) => [key, values[key as ConfigKey]]));
}
// Structural invariants are deliberately absent from mutable config.
export const structuralLimits = { groupMembers: 4 } as const;
