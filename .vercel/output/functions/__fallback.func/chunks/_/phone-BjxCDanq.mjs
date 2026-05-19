function digitsOf(input) {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("8")) d = "7" + d.slice(1);
  if (!d.startsWith("7") && d.length > 0) d = "7" + d;
  return d.slice(0, 11);
}
function formatRuPhone(input) {
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
function toE164Ru(input) {
  if (!input) return null;
  const d = digitsOf(input);
  if (d.length !== 11 || !d.startsWith("7")) return null;
  return "+" + d;
}
function isValidRuPhone(input) {
  return toE164Ru(input) !== null;
}

export { formatRuPhone as f, isValidRuPhone as i, toE164Ru as t };
//# sourceMappingURL=phone-BjxCDanq.mjs.map
