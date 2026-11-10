/** The `error` field of a failed JSON API response, or the fallback. */
export async function readError(
  response: Response,
  fallback: string
): Promise<string> {
  const body = await response.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : fallback;
}
