export const PAGE = {
  width: 841.89,
  height: 595.28,
  margin: 42,
};

export const COLORS = {
  background: "#FAF4DF",
  navy: "#010E1C",
  gold: "#E6AB42",
  muted: "#A48B73",
  danger: "#E6606A",
};

export const FONT = {
  body: "body",
  semibold: "semibold",
  bold: "bold",
};

export function formatDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getUTCFullYear()}`;
}

export function formatGrade(
  grade: number | string,
  scale: "10" | "4" | "letter",
  grade4?: number
): string {
  if (scale === "letter") {
    return String(grade);
  }

  if (scale === "10") {
    const base = `${grade}/10`;
    return grade4 !== undefined ? `${base} (${grade4}/4)` : base;
  }

  return `${grade}/4`;
}
