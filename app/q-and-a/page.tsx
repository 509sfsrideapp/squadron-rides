import Link from "next/link";
import HomeIconLink from "../components/HomeIconLink";

const pageShellStyle: React.CSSProperties = {
  maxWidth: 920,
  margin: "0 auto",
  display: "grid",
  gap: 18,
};

const cardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(126, 142, 160, 0.18)",
  background: "linear-gradient(180deg, rgba(18, 23, 29, 0.96) 0%, rgba(9, 12, 17, 0.985) 100%)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 22px 44px rgba(0, 0, 0, 0.3)",
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  padding: "10px 16px",
  borderRadius: 12,
  textDecoration: "none",
  background: "linear-gradient(180deg, rgba(71, 104, 145, 0.96) 0%, rgba(34, 54, 84, 0.98) 100%)",
  color: "#ffffff",
  border: "1px solid rgba(126, 142, 160, 0.24)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 28px rgba(17, 24, 39, 0.26)",
  fontFamily: "var(--font-display)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontSize: 12,
};

export default function QAndAPage() {
  return (
    <main style={{ padding: 20 }}>
      <div style={pageShellStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <HomeIconLink style={{ marginBottom: 0 }} />
          <span
            style={{
              color: "#94a3b8",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontFamily: "var(--font-display)",
            }}
          >
            Q&A Module // Placeholder
          </span>
        </div>

        <section style={{ ...cardStyle, padding: "1.25rem 1.15rem 1.35rem", display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <span
              style={{
                color: "#7dd3fc",
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontFamily: "var(--font-display)",
              }}
            >
              Question Exchange Board
            </span>
            <h1 style={{ margin: 0 }}>Q&amp;A</h1>
            <p style={{ margin: 0, maxWidth: 640, color: "#cbd5e1", lineHeight: 1.65 }}>
              This placeholder is ready for us to build a question-and-answer board with post threads, responses, filters, and moderation tools.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            }}
          >
            {[
              "Question board with topic filters",
              "Post creation and response flow",
              "Thread detail pages and sorting",
              "Moderation and archive controls",
            ].map((item) => (
              <div
                key={item}
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(126, 142, 160, 0.14)",
                  background: "rgba(15, 23, 33, 0.72)",
                  padding: "0.95rem 0.9rem",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: "#dbe7f5",
                    fontFamily: "var(--font-display)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  {item}
                </p>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/" style={primaryButtonStyle}>
              Return Home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
