"use client";

import { useState } from "react";

type QACommentComposerProps = {
  onSubmit: (body: string) => Promise<void>;
  submitLabel: string;
  placeholder: string;
  initialValue?: string;
  onCancel?: () => void;
  compact?: boolean;
};

export default function QACommentComposer({
  onSubmit,
  submitLabel,
  placeholder,
  initialValue = "",
  onCancel,
  compact = false,
}: QACommentComposerProps) {
  const [body, setBody] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const submitComment = async () => {
    if (!body.trim()) {
      setErrorMessage("Comment text is required.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");
      await onSubmit(body.trim());
      setBody("");
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Could not submit comment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gap: 10,
        padding: compact ? "0.85rem" : "1rem",
        borderRadius: 14,
        border: "1px solid rgba(126, 142, 160, 0.14)",
        background: "rgba(12, 18, 26, 0.78)",
      }}
    >
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={placeholder}
        rows={compact ? 4 : 6}
        disabled={submitting}
        style={{ minHeight: compact ? 100 : 148 }}
      />

      {errorMessage ? <p style={{ margin: 0, color: "#fca5a5" }}>{errorMessage}</p> : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => void submitComment()}
          disabled={submitting}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 38,
            padding: "8px 13px",
            borderRadius: 10,
            textDecoration: "none",
            background: "linear-gradient(180deg, rgba(71, 104, 145, 0.96) 0%, rgba(34, 54, 84, 0.98) 100%)",
            color: "#ffffff",
            border: "1px solid rgba(126, 142, 160, 0.24)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 28px rgba(17, 24, 39, 0.26)",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            fontSize: 10.5,
          }}
        >
          {submitting ? "Submitting..." : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 38,
              padding: "8px 13px",
              borderRadius: 10,
              textDecoration: "none",
              background: "linear-gradient(180deg, rgba(24, 31, 40, 0.98) 0%, rgba(11, 16, 22, 0.99) 100%)",
              color: "#dbe7f5",
              border: "1px solid rgba(126, 142, 160, 0.2)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 20px rgba(0, 0, 0, 0.22)",
              fontFamily: "var(--font-display)",
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              fontSize: 10.5,
            }}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}
