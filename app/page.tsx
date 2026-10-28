"use client";

import { useMutation, useQuery } from "convex/react";
import { type FormEvent, useState } from "react";
import { api } from "../convex/_generated/api";
import { useVoterId } from "./voter";

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

  return (
    <main>
      <h1>Feedback board</h1>
      <p className="muted">Tell us what to build next, and vote for what you want.</p>

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
                aria-label={`${suggestion.voted ? "Remove your vote for" : "Vote for"} ${suggestion.title}`}
                disabled={voterId === undefined}
                onClick={() => voterId && toggleVote({ suggestionId: suggestion._id, voterId })}
              >
                <span aria-hidden="true">▲</span>
                <span className="count">{suggestion.votes}</span>
              </button>
              <span>{suggestion.title}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
