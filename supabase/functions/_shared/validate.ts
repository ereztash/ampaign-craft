// Lightweight runtime input guards for Edge Function request bodies.
//
// Pulling Zod into every edge function would bloat cold-start time, so we
// use the narrowest possible hand-written checks. Apply these at the
// beginning of each handler so a malformed body is rejected before any
// network / LLM call is made.

export class ValidationError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "ValidationError";
  }
}

export function requireString(value: unknown, name: string, max = 8000): string {
  if (typeof value !== "string") throw new ValidationError(`${name} must be a string`);
  if (value.length === 0) throw new ValidationError(`${name} must not be empty`);
  if (value.length > max) throw new ValidationError(`${name} too long (max ${max})`);
  return value;
}

export function optionalString(value: unknown, name: string, max = 8000): string | undefined {
  if (value === undefined || value === null) return undefined;
  return requireString(value, name, max);
}

export function requireUuid(value: unknown, name: string): string {
  const s = requireString(value, name, 64);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
    throw new ValidationError(`${name} must be a UUID`);
  }
  return s;
}

export function requireEnum<T extends string>(
  value: unknown,
  name: string,
  allowed: readonly T[],
): T {
  const s = requireString(value, name, 64);
  if (!(allowed as readonly string[]).includes(s)) {
    throw new ValidationError(`${name} must be one of: ${allowed.join(", ")}`);
  }
  return s as T;
}

export function requirePositiveInt(value: unknown, name: string, max = 10_000): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max) {
    throw new ValidationError(`${name} must be a number in [0, ${max}]`);
  }
  return Math.floor(value);
}

export function requireArray<T>(
  value: unknown,
  name: string,
  max = 2048,
): T[] {
  if (!Array.isArray(value)) throw new ValidationError(`${name} must be an array`);
  if (value.length === 0) throw new ValidationError(`${name} must not be empty`);
  if (value.length > max) throw new ValidationError(`${name} too long (max ${max})`);
  return value as T[];
}

export function requireObject(value: unknown, name: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError(`${name} must be an object`);
  }
  return value as Record<string, unknown>;
}
