"use client";

import { useMutation, useQuery } from "convex/react";
import { type FormEvent, useState } from "react";
import { api } from "../convex/_generated/api";

export default function Board() {
  const suggestions = useQuery(api.suggestions.list);
  const add = useMutation(api.suggestions.add);
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
              <span>{suggestion.title}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
