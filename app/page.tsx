"use client";

import { useMutation, useQuery } from "convex/react";
import { type FormEvent, useEffect, useState } from "react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

const VOTER_KEY = "feedback-board-voter";

// A random id this browser keeps, so its votes are remembered across reloads
// without anyone signing in. Read in an effect: it only exists in the browser.
function useVoterId() {
  const [voterId, setVoterId] = useState<string>();
  useEffect(() => {
    try {
      let id = window.localStorage.getItem(VOTER_KEY);
      if (!id) {
        id = crypto.randomUUID();
        window.localStorage.setItem(VOTER_KEY, id);
      }
      setVoterId(id);
    } catch {
      setVoterId(crypto.randomUUID());
    }
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

  async function vote(suggestionId: Id<"suggestions">) {
    if (!voterId) return;
    await toggleVote({ suggestionId, voterId });
  }

  return (
    <main>
      <h1>Feedback board</h1>
      <p className="muted">Tell us what to build next. Vote for what matters to you.</p>

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
                aria-label={`${suggestion.voted ? "Remove your vote for" : "Vote for"} ${suggestion.title}`}
                title={suggestion.voted ? "Remove your vote" : "Vote"}
                disabled={!voterId}
                onClick={() => vote(suggestion._id)}
              >
                <span aria-hidden="true">▲</span>
                <span className="count">{suggestion.votes}</span>
              </button>
              <span>{suggestion.title}</span>
              {suggestion.voted && <span className="voted">You voted</span>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
