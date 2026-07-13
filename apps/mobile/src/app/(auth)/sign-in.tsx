import { useRouter } from "expo-router";
import { useState } from "react";
import { View, StyleSheet } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { requestOtp } from "@/features/auth/api";
import { sp } from "@/theme";

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    const result = await requestOtp(email);
    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    router.push({ pathname: "/(auth)/verify", params: { email: result.data.email } });
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <AppText variant="display" serif>
          NexLex
        </AppText>
        <AppText tone="muted">Bare acts, new criminal law mapping, and an AI tutor — built for Indian law.</AppText>
      </View>

      <View style={styles.form}>
        <Field
          label="Email"
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={onSubmit}
          error={error}
        />
        <Button label="Send sign-in code" loading={loading} onPress={onSubmit} />
        <AppText variant="micro" tone="faint" style={styles.disclaimer}>
          NexLex explains law for learning — it isn't legal advice.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", paddingHorizontal: sp(5), gap: sp(10) },
  header: { gap: sp(2) },
  form: { gap: sp(4) },
  disclaimer: { textAlign: "center" },
});
