import { readError } from "./fetch-error";

// Client-side calls shared by the owner's editor and the admin screens.
// Each resolves to an error message, or null when it worked.

export type ReviewAction = "approve" | "reject";

export async function reviewListing(
  id: string,
  action: ReviewAction
): Promise<string | null> {
  const response = await fetch("/api/admin/listings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, action }),
  });
  return response.ok ? null : readError(response, "Could not update the profile");
}

export async function deleteListing(id: string): Promise<string | null> {
  const response = await fetch(`/api/listings/${id}`, { method: "DELETE" });
  return response.ok ? null : readError(response, "Could not delete the profile");
}
