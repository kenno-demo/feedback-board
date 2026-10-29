"use client";

import { useMutation, useQuery } from "convex/react";
import { type FormEvent, useEffect, useState } from "react";
import { api } from "../convex/_generated/api";
import { voterId as loadVoterId } from "./voter";

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export default function Board() {
  const [voterId, setVoterId] = useState<string>();
  // Wait for this browser's voter ID so the board shows its votes from the first render.
  const suggestions = useQuery(api.suggestions.list, voterId ? { voterId } : "skip");
  const add = useMutation(api.suggestions.add);
  const toggleVote = useMutation(api.suggestions.toggleVote);
  const [title, setTitle] = useState("");

  useEffect(() => {
    setVoterId(loadVoterId(browserStorage()));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    await add({ title });
    setTitle("");
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

      {suggestions === undefined || voterId === undefined ? (
        <p className="muted">Loading…</p>
      ) : (
        <ul>
          {suggestions.map((suggestion) => (
            <li key={suggestion._id}>
              <button
                type="button"
                className="vote"
                aria-pressed={suggestion.voted}
                aria-label={`Vote for ${suggestion.title}, ${suggestion.votes} votes`}
                onClick={() => toggleVote({ suggestionId: suggestion._id, voterId })}
              >
                <span aria-hidden="true">▲</span>
                <span>{suggestion.votes}</span>
              </button>
              <span>{suggestion.title}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
