"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import FullscreenImageViewer from "./FullscreenImageViewer";
import ImageCropField from "./ImageCropField";

type ManagedThreadId = "admin" | "dev";

type InboxPost = {
  id: string;
  threadId: ManagedThreadId;
  title: string;
  body: string;
  imageUrl?: string | null;
  senderLabel: string;
  createdAt?: { seconds?: number; nanoseconds?: number } | null;
};

type InboxPostManagerProps = {
  threadId: ManagedThreadId;
  endpointBase: string;
  heading: string;
  description: string;
};

function formatTimestamp(createdAt?: { seconds?: number; nanoseconds?: number } | null) {
  if (!createdAt?.seconds) return "Just now";
  return new Date(createdAt.seconds * 1000).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function InboxPostManager({
  threadId,
  endpointBase,
  heading,
  description,
}: InboxPostManagerProps) {
  const [posts, setPosts] = useState<InboxPost[]>([]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftImage, setDraftImage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [viewerImage, setViewerImage] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    const postsQuery = query(collection(db, "inboxPosts"), where("threadId", "==", threadId));
    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      setPosts(
        snapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as Omit<InboxPost, "id">) }))
          .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      );
    });

    return () => unsubscribe();
  }, [threadId]);

  const startEditing = (post: InboxPost) => {
    setEditingPostId(post.id);
    setDraftTitle(post.title);
    setDraftBody(post.body);
    setDraftImage(post.imageUrl || "");
    setStatusMessage("");
  };

  const cancelEditing = () => {
    setEditingPostId(null);
    setDraftTitle("");
    setDraftBody("");
    setDraftImage("");
    setStatusMessage("");
  };

  const saveEdit = async (postId: string) => {
    if (!draftTitle.trim() || !draftBody.trim()) {
      setStatusMessage("Title and message text are both required.");
      return;
    }

    try {
      setBusyPostId(postId);
      setStatusMessage("Saving post...");
      const authModule = await import("../../lib/firebase");
      const idToken = await authModule.auth.currentUser?.getIdToken();

      if (!idToken) {
        setStatusMessage("Your session expired. Please sign in again.");
        return;
      }

      const response = await fetch(`${endpointBase}/${postId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: draftTitle.trim(),
          body: draftBody.trim(),
          imageUrl: draftImage || null,
        }),
      });
      const details = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setStatusMessage(details?.error || "Could not update the post.");
        return;
      }

      cancelEditing();
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : "Could not update the post.");
    } finally {
      setBusyPostId(null);
    }
  };

  const deletePost = async (postId: string) => {
    if (!window.confirm("Delete this post?")) {
      return;
    }

    try {
      setBusyPostId(postId);
      const authModule = await import("../../lib/firebase");
      const idToken = await authModule.auth.currentUser?.getIdToken();

      if (!idToken) {
        setStatusMessage("Your session expired. Please sign in again.");
        return;
      }

      const response = await fetch(`${endpointBase}/${postId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      const details = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setStatusMessage(details?.error || "Could not delete the post.");
      }
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : "Could not delete the post.");
    } finally {
      setBusyPostId(null);
    }
  };

  return (
    <section
      style={{
        marginTop: 18,
        padding: 18,
        borderRadius: 16,
        border: "1px solid rgba(148, 163, 184, 0.18)",
        backgroundColor: "rgba(9, 15, 25, 0.88)",
        boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
      }}
    >
      <h2 style={{ marginTop: 0 }}>{heading}</h2>
      <p style={{ color: "#94a3b8", maxWidth: 680 }}>{description}</p>
      {statusMessage ? <p style={{ color: "#cbd5e1" }}>{statusMessage}</p> : null}

      <div style={{ display: "grid", gap: 12 }}>
        {posts.length === 0 ? (
          <p style={{ marginBottom: 0, color: "#94a3b8" }}>No posts in this thread yet.</p>
        ) : (
          posts.map((post) => {
            const editing = editingPostId === post.id;

            return (
              <div
                key={post.id}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid rgba(148, 163, 184, 0.14)",
                  backgroundColor: "rgba(15, 23, 42, 0.72)",
                }}
              >
                {editing ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="Post title" />
                    <textarea value={draftBody} onChange={(event) => setDraftBody(event.target.value)} rows={5} placeholder="Post message" />
                    <ImageCropField
                      value={draftImage}
                      onChange={setDraftImage}
                      cropShape="square"
                      previewSize={120}
                      outputSize={720}
                      maxEncodedLength={350000}
                      helperText="Adjust the image exactly how you want it to appear in the inbox post."
                      statusMessage={busyPostId === post.id ? "Saving..." : statusMessage}
                      onStatusMessageChange={setStatusMessage}
                    />
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => void saveEdit(post.id)} disabled={busyPostId === post.id}>
                        Save Changes
                      </button>
                      <button type="button" onClick={cancelEditing} disabled={busyPostId === post.id}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                      <div>
                        <strong>{post.title}</strong>
                        <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: 13 }}>
                          {post.senderLabel} • {formatTimestamp(post.createdAt)}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button type="button" onClick={() => startEditing(post)} disabled={busyPostId === post.id}>
                          Edit
                        </button>
                        <button type="button" onClick={() => void deletePost(post.id)} disabled={busyPostId === post.id}>
                          Delete
                        </button>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: post.imageUrl ? "120px minmax(0, 1fr)" : "minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
                      {post.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => setViewerImage({ src: post.imageUrl || "", alt: post.title })}
                          style={{ padding: 0, background: "transparent", border: "none", cursor: "zoom-in" }}
                        >
                          <Image
                            src={post.imageUrl}
                            alt={post.title}
                            width={120}
                            height={120}
                            unoptimized
                            style={{
                              width: 120,
                              height: 120,
                              objectFit: "cover",
                              borderRadius: 12,
                              border: "1px solid rgba(148, 163, 184, 0.14)",
                            }}
                          />
                        </button>
                      ) : null}
                      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{post.body}</p>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      <FullscreenImageViewer
        src={viewerImage?.src || ""}
        alt={viewerImage?.alt || "Inbox image"}
        open={Boolean(viewerImage)}
        onClose={() => setViewerImage(null)}
      />
    </section>
  );
}
