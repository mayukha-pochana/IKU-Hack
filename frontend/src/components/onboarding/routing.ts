// OWNER: Member 1 - where to send someone once they have a real backend session.
import { ApiError, profile } from "@/lib/api";

export async function destinationAfterSignIn(): Promise<"/onboarding" | "/dashboard"> {
  try {
    const p = await profile.get();
    return p.display_name ? "/dashboard" : "/onboarding";
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return "/onboarding";
    throw e;
  }
}
