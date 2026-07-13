import { AppText } from "@/components/ui/app-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";

export default function TutorScreen() {
  return (
    <Screen scroll={false}>
      <AppText variant="h1">Tutor</AppText>
      <EmptyState
        icon="school-outline"
        headline="Your AI legal tutor is coming"
        guidance="Grounded explanations with real section citations — every claim verifiable in the Library. Phase 3."
      />
    </Screen>
  );
}
