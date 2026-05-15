// Russian phone helpers — strict +7 (XXX) XXX-XX-XX format

/** Returns digits string, always starting with leading "7" if user typed "8" or "+7". Up to 11 chars. */
export function digitsOf(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("8")) d = "7" + d.slice(1);
  if (!d.startsWith("7") && d.length > 0) d = "7" + d;
  return d.slice(0, 11);
}

/** Pretty formatter: "+7 (999) 123-45-67" */
export function formatRuPhone(input: string): string {
  const d = digitsOf(input);
  if (!d) return "";
  const a = d.slice(1, 4);
  const b = d.slice(4, 7);
  const c = d.slice(7, 9);
  const e = d.slice(9, 11);
  let out = "+7";
  if (a) out += ` (${a}`;
  if (a.length === 3) out += ")";
  if (b) out += ` ${b}`;
  if (c) out += `-${c}`;
  if (e) out += `-${e}`;
  return out;
}

/** Returns canonical "+7XXXXXXXXXX" or null when invalid. */
export function toE164Ru(input: string | null | undefined): string | null {
  if (!input) return null;
  const d = digitsOf(input);
  if (d.length !== 11 || !d.startsWith("7")) return null;
  return "+" + d;
}

export function isValidRuPhone(input: string | null | undefined): boolean {
  return toE164Ru(input) !== null;
}
