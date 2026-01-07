// A module for working with dates for the applications table

// Helper function to format the date applied
export function dateAppliedFormat(dateIso: string) {
  const applied = new Date(dateIso);
  const now = new Date();

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysAgo = Math.floor((now.getTime() - applied.getTime()) / msPerDay);

  const dateText = applied.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  if (!Number.isFinite(daysAgo) || daysAgo < 0) return dateText;

  if (daysAgo === 0) return `${dateText} (today)`;
  if (daysAgo === 1) return `${dateText} (1 day ago)`;
  return `${dateText} (${daysAgo} days ago)`;
}

// Helper function to format the date for the <input type="date" />
export function toDateInputValue(dateIso: string | null | undefined): string {
  if (!dateIso) return "";
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return "";

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Helper function to convert the date from the <input type="date" /> to ISO string
export function dateInputToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Interpret as local midnight
  const d = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

// Helper function to get the today's date in the <input type="date" /> format
export function todayInputValue() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`; // yyyy-mm-dd
}