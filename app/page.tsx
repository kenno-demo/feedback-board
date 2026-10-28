"use client";

import { useMutation, useQuery } from "convex/react";
import { type FormEvent, useEffect, useState } from "react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

// A random ID saved on this device; every tab in the browser shares it, so it votes once.
function useBrowserId() {
  const [browserId, setBrowserId] = useState<string>();
  useEffect(() => {
    let id = localStorage.getItem("browserId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("browserId", id);
    }
    setBrowserId(id);
  }, []);
  return browserId;
}

export default function Board() {
  const browserId = useBrowserId();
  const suggestions = useQuery(api.suggestions.list, { voterId: browserId });
  const add = useMutation(api.suggestions.add);
  const toggleVote = useMutation(api.suggestions.toggleVote);
  const [title, setTitle] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    await add({ title });
    setTitle("");
  }

  async function vote(suggestionId: Id<"suggestions">) {
    if (!browserId) return;
    await toggleVote({ suggestionId, voterId: browserId });
  }

  return (
    <main>
      <h1>Feedback board</h1>
      <p className="muted">Tell us what to build next.</p>

      <form onSubmit={submit}>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Suggest a feature"
          maxLength={120}
        />
        <button type="submit">Suggest</button>
      </form>

      {suggestions === undefined ? (
        <p className="muted">Loading…</p>
      ) : (
        <ul>
          {suggestions.map((suggestion) => (
            <li key={suggestion._id}>
              <button
                type="button"
                className="vote"
                aria-pressed={suggestion.voted}
                aria-label={suggestion.voted ? "Take back vote" : "Vote"}
                disabled={!browserId}
                onClick={() => vote(suggestion._id)}
              >
                ▲ {suggestion.votes}
              </button>
              <span>{suggestion.title}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
