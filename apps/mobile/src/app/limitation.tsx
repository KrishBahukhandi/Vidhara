import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import {
  computeLimitation,
  LIMITATION_FACTORS,
  parseLimitationPeriod,
  type LimitationPeriod,
} from "@nexlex/shared";

import { AppText } from "@/components/ui/app-text";
import { Screen } from "@/components/ui/screen";
import { listScheduleArticles, type ScheduleArticle } from "@/features/acts/api";
import { useCaseDiary } from "@/features/diary/store";
import { track } from "@/lib/analytics";
import { radius, sp, useTheme } from "@/theme";

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A limitation worksheet, deliberately not a calculator — the app twin of the
 * web page (D-042). The arithmetic is the easy part; what costs advocates cases
 * is picking the wrong Article, or missing that s.14, 18 or 19 moved the date.
 * So every step shows its working and it ends on what would change the answer,
 * never on a bare number.
 *
 * The date is typed as YYYY-MM-DD rather than picked, matching the diary's own
 * date fields — one convention, and no new dependency for a picker.
 */
export default function LimitationScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const diary = useCaseDiary();

  const [articles, setArticles] = useState<ScheduleArticle[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [limbIndex, setLimbIndex] = useState(0);
  const [startOn, setStartOn] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    void listScheduleArticles("lim", "schedule").then((result) => {
      if (result.ok) setArticles(result.data);
      else setFailed(true);
    });
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !articles) return [];
    return articles
      .filter(
        (a) =>
          a.number === q ||
          a.rows.some((r) => `${r.description} ${r.commencement}`.toLowerCase().includes(q)),
      )
      .slice(0, 12);
  }, [articles, query]);

  const selected = articles?.find((a) => a.id === selectedId) ?? null;
  const limbs = selected?.rows.filter((r) => parseLimitationPeriod(r.period)) ?? [];
  const limb = limbs[limbIndex] ?? limbs[0] ?? null;
  const period: LimitationPeriod | null = limb ? parseLimitationPeriod(limb.period) : null;
  const result = period && ISO.test(startOn) ? computeLimitation(startOn, period) : null;

  const field = [
    styles.input,
    { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text },
  ];

  return (
    <Screen padBottom>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        style={styles.back}>
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </Pressable>

      <AppText variant="h1" serif>
        Limitation worksheet
      </AppText>

      {/* Before the tool, not after it: someone who reads one screen should
          still know what this is. */}
      <View style={[styles.caveat, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <AppText style={styles.caveatTitle}>This is a worksheet, not advice.</AppText>
        <AppText variant="small" tone="muted">
          It applies one rule — s.12(1), excluding the day the period runs from. It cannot know
          whether an acknowledgment, a stay, a wrong-forum proceeding or a disability has moved your
          date, and it does not know your court&rsquo;s calendar. Verify against the bare act and
          your file.
        </AppText>
      </View>

      {failed ? (
        <AppText tone="muted">
          Couldn&rsquo;t load the Schedule. Check your connection and try again.
        </AppText>
      ) : null}

      <Step n={1} title="Find the Article" />
      <TextInput
        placeholder={articles ? "e.g. promissory note, possession, 137" : "Loading the Schedule…"}
        placeholderTextColor={colors.textFaint}
        editable={Boolean(articles)}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        style={field}
      />
      {query.trim() && matches.length === 0 && articles ? (
        <AppText variant="small" tone="muted">
          Nothing matches “{query}”. Try the kind of suit rather than the statute — the Schedule
          describes proceedings, not sections.
        </AppText>
      ) : null}
      {matches.map((a) => (
        <Pressable
          key={a.id}
          accessibilityRole="button"
          onPress={() => {
            setSelectedId(a.id);
            setLimbIndex(0);
            setQuery("");
            setSaved(null);
          }}
          style={({ pressed }) => [
            styles.match,
            { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 },
          ]}>
          <AppText tone="brand" style={styles.matchNo}>
            {a.number}
          </AppText>
          <AppText style={styles.grow} numberOfLines={3}>
            {a.rows[0]?.description}
          </AppText>
        </Pressable>
      ))}

      {selected ? (
        <>
          <Step n={2} title="What the Schedule says" />
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <AppText tone="brand" style={styles.matchNo}>
              Article {selected.number}
              {selected.division ? (
                <AppText variant="small" tone="faint">
                  {"  "}
                  {selected.division}
                </AppText>
              ) : null}
            </AppText>

            {limbs.length > 1 ? (
              <>
                <AppText variant="small" tone="muted">
                  This Article has more than one limb. Pick the one you are on:
                </AppText>
                {limbs.map((row, index) => (
                  <Pressable
                    key={index}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: limbIndex === index }}
                    onPress={() => setLimbIndex(index)}
                    style={styles.limb}>
                    <Ionicons
                      name={limbIndex === index ? "radio-button-on" : "radio-button-off"}
                      size={18}
                      color={limbIndex === index ? colors.brand : colors.textFaint}
                    />
                    <AppText style={styles.grow}>
                      {row.description}{" "}
                      <AppText tone="muted">— {row.period}</AppText>
                    </AppText>
                  </Pressable>
                ))}
              </>
            ) : null}

            {limb ? (
              <>
                {limbs.length === 1 ? (
                  <Labelled label="Description of suit" value={limb.description} />
                ) : null}
                <Labelled label="Period of limitation" value={limb.period} strong />
                <Labelled label="Time from which period begins to run" value={limb.commencement} />
              </>
            ) : (
              <AppText tone="muted">
                The Schedule prescribes no period on this limb, so there is nothing to compute from
                it. Read the Article in full.
              </AppText>
            )}
          </View>

          {limb && period ? (
            <>
              <Step n={3} title="When did that happen?" />
              <AppText variant="small" tone="muted">
                {limb.commencement}
              </AppText>
              <TextInput
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textFaint}
                value={startOn}
                onChangeText={(v) => {
                  setStartOn(v);
                  setSaved(null);
                  if (ISO.test(v)) track("limitation_computed", { article: selected.number });
                }}
                autoCapitalize="none"
                style={field}
              />
            </>
          ) : null}

          {result && limb ? (
            <>
              <Step n={4} title="Working" />
              <View style={[styles.card, { borderColor: colors.brand, backgroundColor: colors.surface }]}>
                <AppText variant="small">Period begins to run: {longDate(startOn)}</AppText>
                <AppText variant="small">
                  Prescribed period: {limb.period} (Article {selected.number})
                </AppText>
                <AppText variant="small" tone="muted">
                  s.12(1) — the day it runs from is excluded, so the period is counted from the day
                  after.
                </AppText>
                {result.clamped ? (
                  <AppText variant="small" tone="muted">
                    The corresponding day does not exist in that month, so the period ends on its
                    last day.
                  </AppText>
                ) : null}
                <AppText style={styles.answer}>
                  On these facts alone, the period ends on {longDate(result.expiresOn)}.
                </AppText>
                {result.weekday === "Sunday" || result.weekday === "Saturday" ? (
                  <AppText variant="small" tone="muted">
                    That is a {result.weekday}. If the court is closed that day, s.4 lets you file on
                    the day it reopens — check the court calendar rather than assuming.
                  </AppText>
                ) : null}
              </View>

              <Step n={5} title="Keep it on the file" />
              {saved ? (
                <AppText variant="small" tone="brand">
                  Saved to {saved}.
                </AppText>
              ) : diary.cases.length === 0 ? (
                <AppText variant="small" tone="muted">
                  Add a matter to your diary and you can save this computation against it.
                </AppText>
              ) : (
                <>
                  <AppText variant="small" tone="muted">
                    Saves the Article, the period and what it ran from — not just the date, so the
                    working is still there when you come back to it.
                  </AppText>
                  {diary.cases.map((c) => (
                    <Pressable
                      key={c.id}
                      accessibilityRole="button"
                      onPress={() => {
                        void diary.update(c.id, {
                          limitation: {
                            article: selected.number,
                            description: limb.description,
                            period: limb.period,
                            runsFrom: limb.commencement,
                            startOn,
                            expiresOn: result.expiresOn,
                            savedAt: Date.now(),
                          },
                        });
                        track("limitation_saved_to_case", { article: selected.number });
                        setSaved(c.title);
                      }}
                      style={({ pressed }) => [
                        styles.match,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.surface,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}>
                      <Ionicons name="briefcase-outline" size={18} color={colors.brand} />
                      <AppText style={styles.grow} numberOfLines={1}>
                        {c.title}
                      </AppText>
                    </Pressable>
                  ))}
                </>
              )}
            </>
          ) : null}

          <Step n={result ? 6 : 5} title="What would move that date" />
          <AppText variant="small" tone="muted">
            The date above is only right if none of these apply. Whether they do is a question of
            fact on your file, not something this screen can know.
          </AppText>
          {LIMITATION_FACTORS.map((f) => (
            <Pressable
              key={f.section}
              accessibilityRole="button"
              onPress={() => router.push(`/acts/lim/${f.section}`)}
              style={({ pressed }) => [
                styles.card,
                { borderColor: colors.border, backgroundColor: colors.surface, opacity: pressed ? 0.85 : 1 },
              ]}>
              <AppText tone="brand" style={styles.matchNo}>
                s.{f.section} <AppText style={styles.factorTitle}>{f.title}</AppText>
              </AppText>
              <AppText variant="small" tone="muted">
                {f.effect}
              </AppText>
            </Pressable>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function Step({ n, title }: { n: number; title: string }) {
  return (
    <AppText variant="micro" tone="muted" style={styles.step}>
      {n} · {title.toUpperCase()}
    </AppText>
  );
}

function Labelled({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.labelled}>
      <AppText variant="micro" tone="muted">
        {label}
      </AppText>
      <AppText style={strong ? styles.strong : undefined}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { minHeight: 44, minWidth: 44, justifyContent: "center" },
  caveat: { borderWidth: 1, borderRadius: radius.md, padding: sp(3), gap: sp(1) },
  caveatTitle: { fontWeight: "700" },
  step: { fontWeight: "700", letterSpacing: 0.5, marginTop: sp(2) },
  input: { minHeight: 44, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: sp(3), fontSize: 16 },
  match: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp(2),
    borderWidth: 1,
    borderRadius: radius.md,
    padding: sp(3),
  },
  matchNo: { fontWeight: "700" },
  grow: { flex: 1 },
  card: { borderWidth: 1, borderRadius: radius.md, padding: sp(3), gap: sp(2) },
  limb: { flexDirection: "row", alignItems: "flex-start", gap: sp(2) },
  labelled: { gap: sp(1) },
  strong: { fontWeight: "700" },
  answer: { fontWeight: "700", fontSize: 16 },
  factorTitle: { fontWeight: "600" },
});
