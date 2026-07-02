"use client";

import { useEffect, useSyncExternalStore } from "react";

// Single shared fetch of /dashboard/overview.
//
// Every dashboard hook (summary, verdicts, tags, contests, ...) reads its
// slice from this store, so the page makes ONE request instead of eleven.
// Call refreshOverview() after a sync completes to reload everything.

const API_BASE = process.env.NEXT_PUBLIC_URL;

let store = { data: null, error: null, loading: true };
const listeners = new Set();
let generation = 0;
let started = false;

function emit() {
  for (const l of listeners) l();
}

function load() {
  const gen = ++generation;
  store = { ...store, loading: true };
  emit();

  fetch(`${API_BASE}/dashboard/overview`, { credentials: "include" })
    .then(async (res) => {
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
      return json;
    })
    .then((data) => {
      if (gen !== generation) return; // a newer refresh superseded this one
      store = { data, error: null, loading: false };
      emit();
    })
    .catch((err) => {
      if (gen !== generation) return;
      store = { data: store.data, error: err.message, loading: false };
      emit();
    });
}

export function refreshOverview() {
  load();
}

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const getSnapshot = () => store;

export default function useOverview() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    if (!started) {
      started = true;
      load();
    }
  }, []);

  return state;
}
