/** Turns 0772123456, 256772123456 or +256 772 123 456 into +256772123456. */
export function normalizeUgPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  let local: string;
  if (digits.startsWith("256") && digits.length === 12) local = digits.slice(3);
  else if (digits.startsWith("0") && digits.length === 10) local = digits.slice(1);
  else if (digits.length === 9) local = digits;
  else return null;
  return /^7\d{8}$/.test(local) ? `+256${local}` : null;
}

/** Why a payment number can't be used, or null when it is fine. */
export function phoneProblem(input: string): string | null {
  if (!input.trim()) return "Please fill in your number before paying.";
  if (!normalizeUgPhone(input)) {
    return "That doesn't look like an MTN or Airtel Uganda number. Use the format 0772123456.";
  }
  return null;
}
