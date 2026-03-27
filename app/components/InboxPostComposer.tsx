"use client";

import { useState } from "react";
import ImageCropField from "./ImageCropField";

type InboxPostComposerProps = {
  endpoint: string;
  threadId: "admin" | "dev";
  heading: string;
  description: string;
  submitLabel: string;
};

export default function InboxPostComposer({
  endpoint,
  threadId,
  heading,
  description,
  submitLabel,
}: InboxPostComposerProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const submitPost = async () => {
    if (!title.trim() || !body.trim()) {
      setStatusMessage("Title and message text are both required.");
      return;
    }

    try {
      setSubmitting(true);
      setStatusMessage("Sending post...");
      const authModule = await import("../../lib/firebase");
      const idToken = await authModule.auth.currentUser?.getIdToken();

      if (!idToken) {
        setStatusMessage("Your session expired. Please sign in again.");
        return;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          threadId,
          title: title.trim(),
          body: body.trim(),
          imageUrl: photoDataUrl || null,
        }),
      });

      const details = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setStatusMessage(details?.error || "Could not send the post.");
        return;
      }

      setTitle("");
      setBody("");
      setPhotoDataUrl("");
      setStatusMessage("Post sent.");
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : "Could not send the post.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 16,
        border: "1px solid rgba(148, 163, 184, 0.18)",
        backgroundColor: "rgba(9, 15, 25, 0.88)",
        boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
      }}
    >
      <h2 style={{ marginTop: 0 }}>{heading}</h2>
      <p style={{ maxWidth: 620, color: "#94a3b8" }}>{description}</p>

      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Post title"
        style={{ marginBottom: 12, maxWidth: "100%" }}
      />
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Post message"
        rows={5}
        style={{ marginBottom: 12, maxWidth: "100%", minHeight: 132 }}
      />
      <ImageCropField
        value={photoDataUrl}
        onChange={setPhotoDataUrl}
        cropShape="square"
        previewSize={120}
        outputSize={720}
        maxEncodedLength={350000}
        helperText="Optional photo. You can zoom and move it so it appears exactly how you want in the post."
        statusMessage={statusMessage}
        onStatusMessageChange={setStatusMessage}
        disabled={submitting}
      />
      <div style={{ marginTop: 14 }}>
        <button type="button" onClick={() => void submitPost()} disabled={submitting}>
          {submitting ? "Sending..." : submitLabel}
        </button>
      </div>
    </div>
  );
}
