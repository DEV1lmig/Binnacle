export function isValidUsername(value: string) {
  const candidate = value.trim().toLowerCase();
  return /^[a-z0-9_]{3,32}$/.test(candidate);
}

export function isValidPassword(value: string) {
  return value.length >= 8;
}
