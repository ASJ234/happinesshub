/** The `error` field of a failed JSON API response, or the fallback. */
export async function readError(
  response: Response,
  fallback: string
): Promise<string> {
  const body = await response.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : fallback;
}

/**
 * Sends a DELETE and returns null on success or a message for the user.
 * Network failures become a message too, so callers never have to catch.
 * With `missingIsDone`, a 404 counts as success: the thing is already gone.
 */
export async function sendDelete(
  url: string,
  fallback: string,
  { missingIsDone = false }: { missingIsDone?: boolean } = {}
): Promise<string | null> {
  try {
    const response = await fetch(url, { method: "DELETE" });
    if (response.ok || (missingIsDone && response.status === 404)) return null;
    return await readError(response, fallback);
  } catch {
    return "Can't reach the server. Check your connection and try again.";
  }
}
