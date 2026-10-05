function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Client-side table search. Every word of the query must appear somewhere in the fields, ignoring case:
 * "kamal colombo" finds Kamal Perera in Colombo. A number is also matched ignoring spaces and dashes,
 * so "077 123" finds 0771234567.
 */
export function matchesQuery(query: string, ...fields: (string | null | undefined)[]): boolean {
  const words = normalize(query).split(' ').filter(Boolean);
  if (words.length === 0) return true;

  const text = normalize(fields.filter(Boolean).join(' '));
  const digits = text.replace(/[\s-]/g, '');
  return words.every((word) => text.includes(word) || (/\d/.test(word) && digits.includes(word.replace(/-/g, ''))));
}
