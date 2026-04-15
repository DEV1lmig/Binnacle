export function toIdString(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (value && typeof value === "object" && "toString" in value) {
    try {
      const resolved = String((value as { toString(): string }).toString());
      return resolved || null;
    } catch {
      return null;
    }
  }

  return null;
}
