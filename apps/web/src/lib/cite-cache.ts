"use client";

/**
 * Quick-cite offline cache (advocate track).
 *
 * Court basements and district-court corridors have terrible signal — the one
 * thing an advocate cannot tolerate is a lookup that spins. Every section
 * fetched in quick-cite is written to localStorage, so anything looked up once
 * is available instantly and offline afterwards. Deliberately NOT the full
 * corpus: that's the separate "Offline" bet, which needs a service worker and
 * a bundled snapshot. This is the cheap 80% — your own recent sections, which
 * is what you actually re-cite in a hearing.
 */
import { useEffect, useState } from "react";

export interface CitedSection {
  slug: string;
  number: string;
  act: string;
  note: string;
  body: string;
  /** e.g. "now BNS §103" / "was IPC §302" — the wedge, inline. */
  counterpart: string | null;
  /** Last looked-up epoch ms. */
  ts: number;
}

const KEY = "vidhara_cite_cache";
const CAP = 200;
const SYNC_EVENT = "vidhara:cite-change";

function read(): CitedSection[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as CitedSection[]) : [];
  } catch {
    return [];
  }
}

const same = (a: CitedSection, slug: string, number: string) =>
  a.slug === slug && a.number === number;

/** Cache a fetched section (most-recent-first, deduped, capped). */
export function remember(item: Omit<CitedSection, "ts">): void {
  try {
    const rest = read().filter((i) => !same(i, item.slug, item.number));
    const next = [{ ...item, ts: Date.now() }, ...rest].slice(0, CAP);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
  } catch {
    // storage full/disabled — quick-cite still works online
  }
}

/** Look a section up in the cache (the offline path). */
export function recall(slug: string, number: string): CitedSection | null {
  return read().find((i) => same(i, slug, number)) ?? null;
}

/** Recently cited sections, most recent first. */
export function useRecentCites(): CitedSection[] {
  const [items, setItems] = useState<CitedSection[]>([]);
  useEffect(() => {
    // Populates after hydration so the first client render matches the server.
    setItems(read());
    const refresh = () => setItems(read());
    window.addEventListener(SYNC_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SYNC_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return items;
}

/** Live online/offline state, so the UI can say why it's serving from cache. */
export function useIsOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

/** Clear the cache (privacy: it's on a shared/court device sometimes). */
export function clearCache(): void {
  try {
    window.localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
  } catch {
    /* nothing to do */
  }
}
