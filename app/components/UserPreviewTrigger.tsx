"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { buildQAAuthorLabel } from "../../lib/q-and-a";
import { openDirectMessage } from "../../lib/direct-message-launch";

type UserPreviewProfile = {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  rank?: string | null;
  flight?: string | null;
  username?: string | null;
  jobDescription?: string | null;
  bio?: string | null;
  riderPhotoUrl?: string | null;
  driverPhotoUrl?: string | null;
};

type UserPreviewTriggerProps = {
  userId?: string | null;
  displayLabel?: string | null;
  children: ReactNode;
  disabled?: boolean;
  triggerStyle?: React.CSSProperties;
};

const infoLabelStyle: React.CSSProperties = {
  margin: 0,
  color: "#94a3b8",
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  fontFamily: "var(--font-display)",
};

const infoPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "7px 10px",
  borderRadius: 999,
  border: "1px solid rgba(126, 142, 160, 0.16)",
  background: "rgba(17, 24, 39, 0.62)",
  color: "#dbe7f5",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontFamily: "var(--font-display)",
};

export default function UserPreviewTrigger({
  userId,
  displayLabel,
  children,
  disabled = false,
  triggerStyle,
}: UserPreviewTriggerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [profile, setProfile] = useState<UserPreviewProfile | null>(null);
  const canOpen = Boolean(userId && !disabled);
  const canMessage = false;

  useEffect(() => {
    if (!open || !userId) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErrorMessage("");
        const snapshot = await getDoc(doc(db, "users", userId));

        if (cancelled) {
          return;
        }

        if (!snapshot.exists()) {
          throw new Error("That user profile is unavailable.");
        }

        setProfile(snapshot.data() as UserPreviewProfile);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setProfile(null);
        setErrorMessage(error instanceof Error ? error.message : "Could not load this user.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      const animationFrame = window.requestAnimationFrame(() => setVisible(true));
      return () => window.cancelAnimationFrame(animationFrame);
    }

    setVisible(false);
    const timeout = window.setTimeout(() => setShouldRender(false), 220);
    return () => window.clearTimeout(timeout);
  }, [open]);

  const displayName = useMemo(() => {
    if (profile) {
      const nextLabel = buildQAAuthorLabel(profile, null);
      if (nextLabel !== "Unknown User") {
        return nextLabel;
      }
    }

    return displayLabel?.trim() || "Unknown User";
  }, [displayLabel, profile]);

  const previewPhotoUrl = profile?.riderPhotoUrl?.trim() || profile?.driverPhotoUrl?.trim() || "";

  return (
    <>
      <button
        type="button"
        disabled={!canOpen}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (canOpen) {
            setOpen(true);
          }
        }}
        style={{
          padding: 0,
          border: "none",
          background: "transparent",
          color: "inherit",
          textAlign: "inherit",
          cursor: canOpen ? "pointer" : "default",
          ...triggerStyle,
        }}
      >
        {children}
      </button>

      {shouldRender ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            background: visible ? "rgba(2, 6, 23, 0.68)" : "rgba(2, 6, 23, 0)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "1rem",
            transition: "background-color 220ms ease",
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(100%, 420px)",
              borderRadius: 22,
              border: "1px solid rgba(126, 142, 160, 0.18)",
              background:
                "linear-gradient(180deg, rgba(18, 23, 29, 0.98) 0%, rgba(8, 11, 16, 0.995) 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 28px 56px rgba(0, 0, 0, 0.42)",
              padding: "1rem",
              display: "grid",
              gap: 14,
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(22px)",
              transition: "opacity 220ms ease, transform 220ms ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 16,
                    background: previewPhotoUrl
                      ? `center / cover no-repeat url(${previewPhotoUrl})`
                      : "linear-gradient(180deg, rgba(47, 60, 79, 0.82) 0%, rgba(24, 33, 45, 0.95) 100%)",
                    border: "1px solid rgba(126, 142, 160, 0.18)",
                    display: "grid",
                    placeItems: "center",
                    color: "#dbe7f5",
                    fontFamily: "var(--font-display)",
                    letterSpacing: "0.04em",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {!previewPhotoUrl ? displayName.charAt(0).toUpperCase() : null}
                </div>
                <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
                  <p style={infoLabelStyle}>User Preview</p>
                  <h2 style={{ margin: 0, fontSize: "1.05rem", lineHeight: 1.3 }}>{displayName}</h2>
                  {profile?.username?.trim() ? (
                    <p style={{ margin: 0, color: "#9fb1c7", fontSize: 13 }}>@{profile.username.trim()}</p>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  minWidth: 34,
                  height: 34,
                  borderRadius: 10,
                  border: "1px solid rgba(126, 142, 160, 0.16)",
                  background: "rgba(15, 23, 42, 0.78)",
                  color: "#cbd5e1",
                  fontSize: 18,
                  lineHeight: 1,
                  padding: 0,
                }}
                aria-label="Close user preview"
              >
                ×
              </button>
            </div>

            {loading ? <p style={{ margin: 0, color: "#94a3b8" }}>Loading user details...</p> : null}

            {!loading ? (
              <>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {profile?.rank?.trim() ? <span style={infoPillStyle}>{profile.rank.trim()}</span> : null}
                  {profile?.flight?.trim() ? <span style={infoPillStyle}>{profile.flight.trim()}</span> : null}
                </div>

                {profile?.jobDescription?.trim() ? (
                  <div style={{ display: "grid", gap: 4 }}>
                    <p style={infoLabelStyle}>Job Description</p>
                    <p style={{ margin: 0, color: "#dbe7f5", lineHeight: 1.55 }}>{profile.jobDescription.trim()}</p>
                  </div>
                ) : null}

                {profile?.bio?.trim() ? (
                  <div style={{ display: "grid", gap: 4 }}>
                    <p style={infoLabelStyle}>Bio</p>
                    <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.6 }}>{profile.bio.trim()}</p>
                  </div>
                ) : null}
              </>
            ) : null}

            {errorMessage ? <p style={{ margin: 0, color: "#fca5a5" }}>{errorMessage}</p> : null}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {canMessage ? (
                <button
                  type="button"
                  disabled={messageLoading}
                  onClick={async () => {
                    if (!userId) {
                      return;
                    }

                    try {
                      setMessageLoading(true);
                      setErrorMessage("");
                      await openDirectMessage(router, userId);
                      setOpen(false);
                    } catch (error) {
                      setErrorMessage(error instanceof Error ? error.message : "Could not open the direct thread.");
                    } finally {
                      setMessageLoading(false);
                    }
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 40,
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(126, 142, 160, 0.24)",
                    background:
                      "linear-gradient(180deg, rgba(71, 104, 145, 0.96) 0%, rgba(34, 54, 84, 0.98) 100%)",
                    color: "#ffffff",
                    fontFamily: "var(--font-display)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontSize: 11,
                    opacity: messageLoading ? 0.7 : 1,
                  }}
                >
                  {messageLoading ? "Opening..." : "Message"}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 40,
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(126, 142, 160, 0.18)",
                  background: "rgba(15, 23, 42, 0.78)",
                  color: "#dbe7f5",
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontSize: 11,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
