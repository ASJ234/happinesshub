/** Set once a visitor confirms they are 18 or older. */
export const AGE_COOKIE = "age_verified";
export const AGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Where visitors who are under 18 are sent. */
export const UNDER_AGE_URL = "https://www.google.com";

/** Pages the gate links to, which must stay readable before confirming. */
export const AGE_GATE_EXEMPT_PATHS = ["/terms", "/privacy"];
