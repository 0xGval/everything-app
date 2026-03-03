export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return 'https://example.com';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
