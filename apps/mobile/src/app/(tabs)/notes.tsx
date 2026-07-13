import { AppText } from "@/components/ui/app-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";

export default function NotesScreen() {
  return (
    <Screen scroll={false}>
      <AppText variant="h1">Notes</AppText>
      <EmptyState
        icon="create-outline"
        headline="Your notebook is empty"
        guidance="From Phase 2 you'll save notes anchored to any section you're reading."
      />
    </Screen>
  );
}
