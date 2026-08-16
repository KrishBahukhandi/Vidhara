"use client";

import { useEffect, useState } from "react";

import { getBrowserClient } from "@/lib/supabase-browser";

/**
 * The reader's session, as the UI needs to see it.
 *
 * "loading" is a real state and not a synonym for signed-out. The session
 * lives in localStorage, so the server renders every page with no session at
 * all; starting at signed-out would render a "Sign in" link on the server and
 * swap it for the account link on hydration — a flash on every page load for
 * signed-in readers, and the same hydration-mismatch class that local-library
 * is written to avoid. Consumers render nothing until the answer is known.
 */
export type SessionState =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; email: string };

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    const client = getBrowserClient();
    if (!client) {
      setState({ status: "signed-out" });
      return;
    }

    let active = true;
    const apply = (email: string | undefined) => {
      if (!active) return;
      setState(email ? { status: "signed-in", email } : { status: "signed-out" });
    };

    void client.auth.getSession().then(({ data }) => apply(data.session?.user.email));

    // Keeps every surface honest at once: signing out in one tab must not
    // leave another tab still showing an account link.
    const { data: sub } = client.auth.onAuthStateChange((_event, session) => {
      apply(session?.user.email);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
