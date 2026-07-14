import { Redirect } from "expo-router";

/**
 * Entry: everyone lands in the Library — content is browsable without an
 * account (architecture.md §6); sign-in is prompted on save/AI actions.
 */
export default function Index() {
  return <Redirect href="/(tabs)/library" />;
}
