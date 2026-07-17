import { useRouter } from "expo-router";
import { FlatList, StyleSheet, View } from "react-native";

import { FakeDoor } from "@/components/fake-door";
import { SectionMiniCard } from "@/components/acts/section-mini-card";
import { AppText } from "@/components/ui/app-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { useBookmarks } from "@/lib/local-library";
import { sp } from "@/theme";

export default function SavedScreen() {
  const router = useRouter();
  const { bookmarks, loading } = useBookmarks();

  return (
    <Screen scroll={false}>
      <AppText variant="h1">Saved</AppText>
      <AppText variant="small" tone="muted">
        Sections you’ve saved on this device. No account, no sync yet.
      </AppText>

      {loading ? null : bookmarks.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState
            icon="bookmark-outline"
            headline="Nothing saved yet"
            guidance="Open any section and tap Save to keep it here — it stays on this device."
          />
          <FakeDoor
            feature="offline"
            icon="cloud-download-outline"
            title="Download for offline"
            description="Read the whole library with no signal — on the train, in court"
          />
        </View>
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => `${item.slug}-${item.number}`}
          contentContainerStyle={styles.list}
          ListFooterComponent={
            <View style={styles.footer}>
              <FakeDoor
                feature="offline"
                icon="cloud-download-outline"
                title="Download for offline"
                description="Read the whole library with no signal"
              />
            </View>
          }
          renderItem={({ item }) => (
            <SectionMiniCard
              item={item}
              onPress={() => router.push(`/acts/${item.slug}/${encodeURIComponent(item.number)}`)}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, gap: sp(4), justifyContent: "center" },
  list: { gap: sp(2), paddingBottom: sp(6) },
  footer: { paddingTop: sp(4) },
});
