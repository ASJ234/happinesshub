// Remembers a creator's invite between the visit and a later signup.
// Kept free of other imports: the proxy loads it on every request.

export const REFERRAL_COOKIE = "hh_ref";
/** How long an invite is remembered, in seconds (30 days). */
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/** The invite's username if it is well formed, else null. */
export function parseReferralCode(value: string | null | undefined): string | null {
  const code = (value ?? "").trim().toLowerCase();
  return /^[a-z0-9_.]{3,20}$/.test(code) ? code : null;
}

export const referralCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: REFERRAL_COOKIE_MAX_AGE,
};
