import { ImageResponse } from "next/og";

import { getMappingsForSection, getSectionWithAct } from "@/features/acts/queries";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Section card";

/**
 * OG card per section — the unit that travels in WhatsApp/Telegram groups.
 * Leads with the number + marginal note, shows the old⇄new counterpart when
 * one exists. Colors are the brand tokens' light values (tokens.cjs).
 */
export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string; number: string }>;
}) {
  const { slug, number } = await params;
  const section = await getSectionWithAct(slug, decodeURIComponent(number));

  const title = section
    ? `${section.acts.abbreviation} §${section.number}`
    : "Vidhara — Bare Acts";
  const note = section?.marginal_note ?? "Indian bare acts, structured and free";

  let counterpart = "";
  if (section) {
    const mappings = await getMappingsForSection(section.id);
    const m = mappings[0];
    if (m) {
      counterpart =
        m.source_section_id === section.id
          ? m.target_act
            ? `now ${m.target_act} §${m.target_number}`
            : "no counterpart in the new code"
          : m.source_act
            ? `was ${m.source_act} §${m.source_number}`
            : "";
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          backgroundColor: "#1E3A5F",
          color: "#FFFFFF",
          fontFamily: "Georgia, serif",
        }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.05 }}>{title}</div>
          <div style={{ fontSize: 44, lineHeight: 1.25, opacity: 0.92, maxWidth: 1000 }}>
            {note.length > 120 ? `${note.slice(0, 117)}…` : note}
          </div>
          {counterpart ? (
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                fontSize: 36,
                padding: "12px 28px",
                borderRadius: 12,
                backgroundColor: "#FFFFFF",
                color: "#1E3A5F",
                fontWeight: 600,
              }}>
              {counterpart}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 32, opacity: 0.85 }}>
          <div>Vidhara — bare acts + old⇄new mapping</div>
          <div>free · no sign-up</div>
        </div>
      </div>
    ),
    size,
  );
}
