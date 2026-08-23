/**
 * ESLint for the Expo app. Narrow, for the same reason as the web config: strict
 * TypeScript already carries most of the load, and Prettier owns formatting.
 */
import expo from "eslint-config-expo/flat.js";

export default [
  {
    ignores: ["android/**", "ios/**", ".expo/**", "node_modules/**", "expo-env.d.ts"],
  },
  ...expo,
  {
    rules: {
      // console.log in the analytics module is the dev-only event trace, which
      // is the point of it — it is how you see events without sending any.
      "no-console": ["warn", { allow: ["warn", "error", "debug", "log"] }],

      // Same decision as the web config, for the same pattern: reading
      // AsyncStorage after mount is what makes recents, bookmarks, the diary
      // and the quiz streak work at all, since none of it is available
      // synchronously. useSyncExternalStore is the real fix and is a backlog
      // item, not something to rush behind a linter turning green.
      "react-hooks/set-state-in-effect": "off",

      /**
       * OFF because it is a WEB rule and this is React Native.
       *
       * It exists so an apostrophe in JSX cannot be mis-parsed as HTML. React
       * Native does not parse HTML: `<AppText>it&apos;s</AppText>` renders the
       * literal characters "&apos;" on screen. Obeying this rule here would
       * put mojibake in front of a user — the disclaimer it flags reads "it
       * isn't legal advice", which is exactly the line that must be readable.
       */
      "react/no-unescaped-entities": "off",
    },
  },
];
