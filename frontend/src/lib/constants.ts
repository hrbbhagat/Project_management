// Enum values the backend accepts. Adjust here if the backend contract differs —
// these are the only values the UI will ever send.
export const PROJECT_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "PLANNING", "ON_HOLD"] as const;
export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "BLOCKED"] as const;
export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export const DONE_STATUS = "DONE";

export function labelize(v?: string | null) {
  if (!v) return "—";
  return v
    .toString()
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function toDateInput(v?: string | null) {
  if (!v) return "";
  return String(v).slice(0, 10);
}
