import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Screen } from "@/components/ui/screen";
import { completeOnboarding } from "@/features/profile/api";
import { EXAM_TARGETS, USER_ROLES, type UserRole } from "@nexlex/shared";
import { radius, sp, useTheme } from "@/theme";

const ROLE_LABELS: Record<UserRole, string> = {
  student: "Law student",
  aspirant: "Judiciary aspirant",
  advocate: "Advocate",
  professor: "Faculty",
  other: "Other",
};

const TARGET_LABELS: Record<string, string> = {
  "judiciary-pcsj": "Judiciary (PCS-J)",
  "clat-pg": "CLAT PG",
  aibe: "AIBE",
  "net-jrf-law": "NET/JRF Law",
  "semester-exams": "Semester exams",
  "moot-court": "Moot court",
  none: "Just exploring",
};

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.brand : colors.surface,
          borderColor: selected ? colors.brand : colors.border,
        },
      ]}>
      <AppText variant="small" tone={selected ? "onBrand" : "default"}>
        {label}
      </AppText>
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<UserRole | null>(null);
  const [targets, setTargets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleTarget = (target: string) =>
    setTargets((current) =>
      current.includes(target) ? current.filter((t) => t !== target) : [...current, target],
    );

  const onSubmit = async () => {
    if (!role) {
      setError("Choose the option that fits you best");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await completeOnboarding({ displayName, role, examTargets: targets });
    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    router.replace("/(tabs)/library");
  };

  return (
    <Screen padBottom>
      <AppText variant="h1">Welcome to Vidhara</AppText>
      <AppText tone="muted">A minute of setup so we can tailor things for you.</AppText>

      <Field
        label="Your name"
        placeholder="How should we address you?"
        value={displayName}
        onChangeText={setDisplayName}
        error={error}
      />

      <AppText variant="small" tone="muted">
        I am a…
      </AppText>
      <View style={styles.chipRow}>
        {USER_ROLES.map((r) => (
          <Chip key={r} label={ROLE_LABELS[r]} selected={role === r} onPress={() => setRole(r)} />
        ))}
      </View>

      <AppText variant="small" tone="muted">
        Preparing for (optional)
      </AppText>
      <View style={styles.chipRow}>
        {EXAM_TARGETS.map((t) => (
          <Chip
            key={t}
            label={TARGET_LABELS[t] ?? t}
            selected={targets.includes(t)}
            onPress={() => toggleTarget(t)}
          />
        ))}
      </View>

      <Button label="Start learning" loading={loading} onPress={onSubmit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: sp(2) },
  chip: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: sp(3),
    paddingVertical: sp(2),
    minHeight: 40,
    justifyContent: "center",
  },
});
