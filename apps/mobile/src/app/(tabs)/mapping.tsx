import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { MappingCard } from "@/components/acts/mapping-card";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Screen } from "@/components/ui/screen";
import { lookupMappingsByRef, type MappingRow } from "@/features/acts/api";
import { sp } from "@/theme";

export default function MappingScreen() {
  const [query, setQuery] = useState("");
  const [mappings, setMappings] = useState<MappingRow[] | null>(null);
  const [perspectiveId, setPerspectiveId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<{ error?: string; hint?: string; loading?: boolean }>({});

  const onLookup = async () => {
    setStatus({ loading: true });
    const result = await lookupMappingsByRef(query);

    if (!result.ok) {
      setStatus({ error: result.error.message });
      return;
    }
    if (result.data.kind === "not-a-ref") {
      setMappings(null);
      setStatus({
        hint: 'Enter a section reference with its act — e.g. "302 IPC", "BNS 103", "CrPC 154".',
      });
      return;
    }
    if (result.data.kind === "not-found") {
      setMappings(null);
      setStatus({
        error: `${result.data.act} §${result.data.section} isn't in the library yet.`,
      });
      return;
    }
    setPerspectiveId(result.data.sectionId);
    setMappings(result.data.mappings);
    setStatus({});
  };

  return (
    <Screen scroll={false}>
      <AppText variant="h1">Mapping</AppText>
      <AppText variant="small" tone="muted">
        IPC ⇄ BNS · CrPC ⇄ BNSS · Evidence Act ⇄ BSA
      </AppText>

      <Field
        label="Section reference"
        placeholder='e.g. "302 IPC" or "BNSS 173"'
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={onLookup}
        returnKeyType="search"
        autoCapitalize="none"
        error={status.error ?? null}
      />
      <Button label="Find counterpart" loading={status.loading} onPress={onLookup} />
      {status.hint ? (
        <AppText variant="small" tone="muted">
          {status.hint}
        </AppText>
      ) : null}

      {mappings === null ? (
        <EmptyState
          icon="swap-horizontal-outline"
          headline="Old law ⇄ new law, instantly"
          guidance='Look up any section to see its counterpart and exactly what changed. Try "302 IPC".'
        />
      ) : mappings.length === 0 ? (
        <EmptyState
          icon="swap-horizontal-outline"
          headline="No mapping recorded yet"
          guidance="This section's mapping is pending review — it will appear once verified."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.results}>
          {mappings.map((mapping) => (
            <MappingCard
              key={mapping.mapping_id}
              mapping={mapping}
              perspectiveSectionId={perspectiveId}
            />
          ))}
          <View style={styles.footer}>
            <AppText variant="micro" tone="faint">
              Mappings are human-reviewed. Report an error from the section page.
            </AppText>
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  results: { gap: sp(3), paddingBottom: sp(6), paddingTop: sp(2) },
  footer: { alignItems: "center", paddingTop: sp(2) },
});
