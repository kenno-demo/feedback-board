"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "feedback-board:voter";

// A random id this browser keeps so its votes can be marked and not doubled.
// Browser storage is unavailable during server rendering and in some private
// windows, so the id is read after mount and may stay undefined.
export function useVoterId(): string | undefined {
  const [voterId, setVoterId] = useState<string>();

  useEffect(() => {
    try {
      let id = window.localStorage.getItem(STORAGE_KEY);
      if (!id) {
        id = crypto.randomUUID();
        window.localStorage.setItem(STORAGE_KEY, id);
      }
      setVoterId(id);
    } catch {
      // Storage is blocked; voting stays disabled for this visit.
    }
  }, []);

  return voterId;
}
