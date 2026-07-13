import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View, StyleSheet } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { verifyOtp } from "@/features/auth/api";
import { sp } from "@/theme";

export default function VerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email) {
      router.replace("/(auth)/sign-in");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await verifyOtp(email, code);
    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    // Session listener flips state; the (auth) layout redirects into the app.
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <AppText variant="h1">Check your email</AppText>
        <AppText tone="muted">
          We sent a 6-digit code to {email ?? "your email"}. It expires in 10 minutes.
        </AppText>
      </View>

      <View style={styles.form}>
        <Field
          label="Sign-in code"
          placeholder="000000"
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={setCode}
          onSubmitEditing={onSubmit}
          error={error}
        />
        <Button label="Verify and continue" loading={loading} onPress={onSubmit} />
        <Button label="Use a different email" variant="ghost" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", paddingHorizontal: sp(5), gap: sp(8) },
  header: { gap: sp(2) },
  form: { gap: sp(3) },
});
