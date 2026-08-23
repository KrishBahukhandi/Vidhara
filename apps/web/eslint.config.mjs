/**
 * ESLint for the web app.
 *
 * The `lint` script was `tsc --noEmit` from the scaffold until D-070 — accepted
 * then for velocity, recorded as debt ever since. Deliberately narrow: strict
 * TypeScript already catches most of what matters and Prettier owns formatting,
 * so this adds only the checks a type-checker cannot make.
 */
import next from "eslint-config-next";

const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },

  // v16 exports a flat-config ARRAY, not a factory.
  ...next,

  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error", "debug"] }],

      /**
       * The React Compiler's rule against setState inside an effect.
       *
       * OFF, and this is a decision rather than an oversight. Every one of the
       * nine occurrences is the same deliberate pattern: read localStorage
       * AFTER hydration so the server render (which has no localStorage) and
       * the client's first render agree. That is what makes recents,
       * bookmarks, the diary, the quiz streak and the session state SSR-safe,
       * and it is documented in each of those files.
       *
       * The rule is not wrong — `useSyncExternalStore` is the right answer for
       * "subscribe to an external store with SSR safety", and converting
       * local-library, case-diary, cite-cache and useSession to it is the real
       * fix. That is a refactor across seven files with genuine regression
       * risk, so it is a backlog item (§6) rather than something to rush
       * behind a linter turning green.
       */
      "react-hooks/set-state-in-effect": "off",

      /**
       * Same family, same reason: cite-cache passes named functions to
       * useCallback where the rule wants inline expressions. Turning it on
       * would demand the same refactor.
       */
      "react-hooks/incompatible-library": "off",
    },
  },

  {
    /**
     * Server-only secrets must never be referenced from code that can ship to
     * the browser. Scoped to where client components actually live: the first
     * version fired on the revalidate ROUTE HANDLER, which is server-only by
     * definition — a rule that cries wolf on correct code is one people
     * disable.
     */
    files: ["src/components/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.object.name='process'][object.property.name='env'][property.name=/^(SUPABASE_SERVICE_ROLE_KEY|REVALIDATE_SECRET|SENTRY_AUTH_TOKEN|GROQ_API_KEY)$/]",
          message:
            "Server-only secret. It must not be referenced from a component that can ship to the browser.",
        },
      ],
    },
  },
];

export default config;
