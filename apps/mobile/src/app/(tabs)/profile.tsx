import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";

import { SuggestionForm } from "@/components/suggestion-form";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Screen } from "@/components/ui/screen";
import { getMyProfile, updateMyProfile, type Profile } from "@/features/profile/api";
import { isSupabaseConfigured } from "@/lib/env";
import { useSession } from "@/providers/session-provider";
import { sp } from "@/theme";

export default function ProfileScreen() {
  const { session, signOut } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<{ kind: "idle" | "saving" | "saved" | "error"; message?: string }>({
    kind: "idle",
  });

  useEffect(() => {
    if (!isSupabaseConfigured || !session) return;
    getMyProfile().then((result) => {
      if (result.ok) {
        setProfile(result.data);
        setDisplayName(result.data.display_name ?? "");
      }
    });
  }, [session]);

  // Signed-out state: content stays browsable; profile is where sign-in lives.
  if (!session) {
    return <SignedOutProfile />;
  }

  const onSave = async () => {
    setStatus({ kind: "saving" });
    const result = await updateMyProfile({ displayName });
    if (!result.ok) {
      setStatus({ kind: "error", message: result.error.message });
      return;
    }
    setProfile(result.data);
    setStatus({ kind: "saved" });
  };

  return (
    <Screen>
      <AppText variant="h1">Profile</AppText>

      {!isSupabaseConfigured ? (
        <AppText tone="muted">
          Backend not configured yet — profile editing activates once Supabase keys are set.
        </AppText>
      ) : (
        <View style={styles.section}>
          <AppText tone="muted">{session?.user.email}</AppText>
          <Field
            label="Display name"
            placeholder="Your name"
            value={displayName}
            onChangeText={setDisplayName}
            error={status.kind === "error" ? (status.message ?? null) : null}
          />
          <Button
            label={status.kind === "saved" ? "Saved" : "Save changes"}
            loading={status.kind === "saving"}
            onPress={onSave}
          />
          {profile?.plan ? (
            <AppText variant="small" tone="faint">
              Plan: {profile.plan}
            </AppText>
          ) : null}
        </View>
      )}

      <SuggestionForm />

      <View style={styles.footer}>
        <Button label="Sign out" variant="secondary" onPress={signOut} />
        <AppText variant="micro" tone="faint" style={styles.legal}>
          Vidhara explains law for learning — it isn't legal advice.
        </AppText>
      </View>
    </Screen>
  );
}

function SignedOutProfile() {
  const router = useRouter();
  return (
    <Screen>
      <AppText variant="h1">Profile</AppText>
      <View style={styles.signedOut}>
        <AppText variant="h3" style={styles.legal}>
          Save your study, everywhere
        </AppText>
        <AppText tone="muted" style={styles.legal}>
          Sign in to bookmark sections, keep notes, and sync progress across devices. Browsing the
          library needs no account.
        </AppText>
        <Button label="Sign in" onPress={() => router.push("/(auth)/sign-in")} />
      </View>
      <SuggestionForm />
      <View style={styles.footer}>
        <AppText variant="micro" tone="faint" style={styles.legal}>
          Vidhara explains law for learning — it isn't legal advice.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: sp(3) },
  signedOut: { gap: sp(3), paddingTop: sp(6) },
  footer: { marginTop: "auto", gap: sp(3) },
  legal: { textAlign: "center" },
});
