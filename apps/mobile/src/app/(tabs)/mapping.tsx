import { AppText } from "@/components/ui/app-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";

export default function MappingScreen() {
  return (
    <Screen scroll={false}>
      <AppText variant="h1">Mapping</AppText>
      <EmptyState
        icon="swap-horizontal-outline"
        headline="IPC ⇄ BNS, CrPC ⇄ BNSS, Evidence ⇄ BSA"
        guidance="Instant bidirectional lookup between the old and new criminal laws lands in Phase 1."
      />
    </Screen>
  );
}
