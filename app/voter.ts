import { useSyncExternalStore } from "react";

export const VOTER_KEY = "feedback-board:voter";

type VoterStorage = Pick<Storage, "getItem" | "setItem">;

// Returns the id this browser votes under, creating and saving one on the
// first visit so later visits and reloads keep the same votes.
export function rememberVoter(storage: VoterStorage, makeId: () => string): string {
  const stored = storage.getItem(VOTER_KEY);
  if (stored) return stored;
  const fresh = makeId();
  storage.setItem(VOTER_KEY, fresh);
  return fresh;
}

let cached: string | undefined;

function readVoterId(): string {
  if (cached) return cached;
  try {
    cached = rememberVoter(window.localStorage, () => crypto.randomUUID());
  } catch {
    // Storage blocked (private window, strict settings): vote for this visit only.
    cached = crypto.randomUUID();
  }
  return cached;
}

const subscribe = () => () => {};
const onServer = () => undefined;

// undefined while rendering on the server and during hydration; the id after.
export function useVoterId(): string | undefined {
  return useSyncExternalStore(subscribe, readVoterId, onServer);
}
