import { expect, test } from "vitest";
import { rememberVoter, VOTER_KEY } from "./voter";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

// vote-signout: votes are remembered on the device across reloads and later visits
test("a browser keeps the same voter id across visits", () => {
  const storage = fakeStorage();
  let minted = 0;
  const makeId = () => `voter-${++minted}`;

  const firstVisit = rememberVoter(storage, makeId);
  const reload = rememberVoter(storage, makeId);
  const laterVisit = rememberVoter(storage, makeId);

  expect(firstVisit).toBe("voter-1");
  expect(reload).toBe("voter-1");
  expect(laterVisit).toBe("voter-1");
  expect(storage.getItem(VOTER_KEY)).toBe("voter-1");
  expect(minted).toBe(1);
});
