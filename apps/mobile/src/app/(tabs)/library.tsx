import { AppText } from "@/components/ui/app-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";

export default function LibraryScreen() {
  return (
    <Screen scroll={false}>
      <AppText variant="h1">Library</AppText>
      <EmptyState
        icon="book-outline"
        headline="Bare acts arrive in Phase 1"
        guidance="BNS, BNSS, BSA, IPC, CrPC, the Evidence Act and more — structured, searchable, and mapped."
      />
    </Screen>
  );
}
