"use client";

import { useState } from "react";

type QAPostComposerProps = {
  onSubmit: (input: { title: string; body: string; anonymous: boolean }) => Promise<void>;
  submittingLabel?: string;
  submitLabel?: string;
  cancelHref?: string;
};

const inputStyle: React.CSSProperties = {
  width: "100%",
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

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 42,
  padding: "10px 15px",
  borderRadius: 12,
  textDecoration: "none",
  background: "linear-gradient(180deg, rgba(24, 31, 40, 0.98) 0%, rgba(11, 16, 22, 0.99) 100%)",
  color: "#dbe7f5",
  border: "1px solid rgba(126, 142, 160, 0.2)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 20px rgba(0, 0, 0, 0.22)",
  fontFamily: "var(--font-display)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontSize: 11,
};

export default function QAPostComposer({
  onSubmit,
  submitLabel = "Submit Post",
  submittingLabel = "Submitting...",
  cancelHref = "/q-and-a",
}: QAPostComposerProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const submitPost = async () => {
    if (!title.trim()) {
      setStatusMessage("Post title is required.");
      return;
    }

    try {
      setSubmitting(true);
      setStatusMessage("");
      await onSubmit({
        title: title.trim(),
        body: body.trim(),
        anonymous,
      });
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : "Could not submit the post.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      style={{
        borderRadius: 18,
        border: "1px solid rgba(126, 142, 160, 0.18)",
        background: "linear-gradient(180deg, rgba(18, 23, 29, 0.96) 0%, rgba(9, 12, 17, 0.985) 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 22px 44px rgba(0, 0, 0, 0.3)",
        padding: "1rem 1rem 1.1rem",
        display: "grid",
        gap: 14,
      }}
    >
      <div style={{ display: "grid", gap: 6 }}>
        <p
          style={{
            margin: 0,
            color: "#94a3b8",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontFamily: "var(--font-display)",
          }}
        >
          New forum post
        </p>
        <h1 style={{ margin: 0 }}>Create Post</h1>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span>Title</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ask a question or start a discussion..."
          style={inputStyle}
          disabled={submitting}
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>Body</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Add details, context, or extra information if needed."
          rows={9}
          style={{ ...inputStyle, minHeight: 220 }}
          disabled={submitting}
        />
      </label>

      <label
        style={{
          display: "flex",
          alignItems: "start",
          gap: 10,
          padding: "12px 14px",
          borderRadius: 14,
          border: "1px solid rgba(126, 142, 160, 0.16)",
          background: "rgba(12, 18, 26, 0.72)",
          color: "#dbe7f5",
        }}
      >
        <input
          type="checkbox"
          checked={anonymous}
          onChange={(event) => setAnonymous(event.target.checked)}
          disabled={submitting}
          style={{ marginTop: 2 }}
        />
        <span style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
            Post Anonymously
          </span>
        </span>
      </label>

      {statusMessage ? (
        <p style={{ margin: 0, color: "#fca5a5" }}>{statusMessage}</p>
      ) : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => void submitPost()} disabled={submitting} style={primaryButtonStyle}>
          {submitting ? submittingLabel : submitLabel}
        </button>
        <a href={cancelHref} style={secondaryButtonStyle}>
          Cancel
        </a>
      </div>
    </section>
  );
}
