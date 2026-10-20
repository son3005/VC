export function maskName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return fullName;
  }

  const [family, ...rest] = parts;
  return `${family} ${rest.map((part) => `${part[0]}.`).join(" ")}`;
}

export function maskCode(code: string): string {
  if (code.length <= 4) return "***";
  return `${code.slice(0, 4)}***`;
}
