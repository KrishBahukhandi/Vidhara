import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Vidhara — bare acts and the old⇄new law mapping";

/**
 * Default OG card, inherited by every page that doesn't define its own (home,
 * /acts, /mapping, /daily, /practice). Section pages override it with their own
 * per-section card. Shares into WhatsApp/Telegram groups are the CAC=₹0
 * channel, so no link should ever preview blank. Colors are the brand tokens'
 * light values (tokens.cjs), matching the section card.
 */
export default function OgImage() {
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
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1.05 }}>Vidhara</div>
          <div style={{ fontSize: 46, lineHeight: 1.3, opacity: 0.92, maxWidth: 1000 }}>
            Every IPC, CrPC and Evidence Act section — mapped to its new BNS, BNSS and BSA
            counterpart, with the full text.
          </div>
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
            IPC 302 is now BNS 103
          </div>
        </div>
        <div
          style={{ display: "flex", justifyContent: "space-between", fontSize: 32, opacity: 0.85 }}>
          <div>Bare acts · old-to-new mapping · daily quiz</div>
          <div>free · no sign-up</div>
        </div>
      </div>
    ),
    size,
  );
}
