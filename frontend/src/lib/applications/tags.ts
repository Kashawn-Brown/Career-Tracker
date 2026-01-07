// A module for working with tags for the applications table

// Parse tagsText into a list of tags
export function parseTags(tagsText: string | null | undefined): string[] {
  if (!tagsText) return [];
  return tagsText
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// Join tags back into comma-separated string for the backend
export function serializeTags(tags: string[]): string {
  return tags.join(", ");
}

// Split user input into tags (supports commas + newlines for paste)
export function splitTagInput(raw: string): string[] {
  return raw
    .split(/[,|\n]/g)
    .map((t) => t.trim())
    .filter(Boolean);
}