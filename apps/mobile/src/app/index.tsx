import { Redirect } from "expo-router";

import { useSession } from "@/providers/session-provider";

/** Entry gate: authenticated users land in the tab shell, others at sign-in. */
export default function Index() {
  const { session } = useSession();
  return <Redirect href={session ? "/(tabs)/library" : "/(auth)/sign-in"} />;
}
