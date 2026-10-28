"use client";

import { useMutation, useQuery } from "convex/react";
import { type FormEvent, useEffect, useState } from "react";
import { api } from "../convex/_generated/api";

// An anonymous ID kept in this browser, so each browser votes once per suggestion.
function useVoter() {
  const [voter, setVoter] = useState<string>();
  useEffect(() => {
    let id = localStorage.getItem("voter");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("voter", id);
    }
    setVoter(id);
  }, []);
  return voter;
}

export default function Board() {
  const voter = useVoter();
  const suggestions = useQuery(api.suggestions.list, voter ? { voter } : "skip");
  const add = useMutation(api.suggestions.add);
  const vote = useMutation(api.suggestions.vote);
  const setPlanned = useMutation(api.suggestions.setPlanned);
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
                aria-label={`Vote for ${suggestion.title}`}
                onClick={() => voter && vote({ suggestionId: suggestion._id, voter })}
              >
                <span aria-hidden>▲</span>
                {suggestion.votes}
              </button>
              <span className="title">{suggestion.title}</span>
              {suggestion.planned && <span className="badge">Planned</span>}
              <button
                type="button"
                className="plan"
                aria-pressed={suggestion.planned}
                onClick={() =>
                  setPlanned({ suggestionId: suggestion._id, planned: !suggestion.planned })
                }
              >
                {suggestion.planned ? "Unplan" : "Mark planned"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
