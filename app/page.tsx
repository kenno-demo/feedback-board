"use client";

import { useMutation, useQuery } from "convex/react";
import { type FormEvent, useEffect, useState } from "react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

const VOTER_KEY = "feedback-voter-id";

// A random ID this browser keeps, so its votes are remembered across reloads.
function useVoterId() {
  const [voterId, setVoterId] = useState<string>();
  useEffect(() => {
    let id = localStorage.getItem(VOTER_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VOTER_KEY, id);
    }
    setVoterId(id);
  }, []);
  return voterId;
}

export default function Board() {
  const voterId = useVoterId();
  const suggestions = useQuery(api.suggestions.list, { voterId });
  const add = useMutation(api.suggestions.add);
  const toggleVote = useMutation(api.suggestions.toggleVote);
  const [title, setTitle] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    await add({ title });
    setTitle("");
  }

  function vote(suggestionId: Id<"suggestions">) {
    if (!voterId) return;
    void toggleVote({ suggestionId, voterId });
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
                className={suggestion.voted ? "vote voted" : "vote"}
                aria-pressed={suggestion.voted}
                aria-label={
                  suggestion.voted
                    ? `Take back your vote for ${suggestion.title}`
                    : `Vote for ${suggestion.title}`
                }
                disabled={!voterId}
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
