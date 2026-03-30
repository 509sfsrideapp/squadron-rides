"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import AppLoadingState from "../../components/AppLoadingState";
import FullscreenImageViewer from "../../components/FullscreenImageViewer";
import HomeIconLink from "../../components/HomeIconLink";
import { ReportableTarget } from "../../components/MisconductReporting";
import UserPreviewTrigger from "../../components/UserPreviewTrigger";
import { isAdminEmail } from "../../../lib/admin";
import { auth, db } from "../../../lib/firebase";
import { openIsoConversation } from "../../../lib/direct-message-launch";
import { buildMisconductPreviewText } from "../../../lib/misconduct";
import {
  formatIsoCategoryLabel,
  formatIsoLocationLabel,
  formatIsoNeedByLabel,
  formatIsoPostTypeLabel,
  getIsoPhotoUrls,
  formatIsoStatusLabel,
  formatIsoUrgencyLabel,
  type IsoRequestRecord,
} from "../../../lib/iso";

type IsoCreatorProfile = {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  rank?: string | null;
};

const sectionStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(126, 142, 160, 0.18)",
  background: "linear-gradient(180deg, rgba(18, 23, 29, 0.96) 0%, rgba(9, 12, 17, 0.985) 100%)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 22px 44px rgba(0, 0, 0, 0.3)",
  padding: "1rem 1rem 1.1rem",
};

const primaryButtonStyle: React.CSSProperties = {
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
};

const metaPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "7px 11px",
  borderRadius: 999,
  border: "1px solid rgba(126, 142, 160, 0.16)",
  background: "rgba(17, 24, 39, 0.62)",
  color: "#dbe7f5",
  fontSize: 11,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontFamily: "var(--font-display)",
};

export default function ISORequestDetailPage() {
  const params = useParams<{ requestId: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestRecord, setRequestRecord] = useState<IsoRequestRecord | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<IsoCreatorProfile | null>(null);
  const [photoExpanded, setPhotoExpanded] = useState(false);
  const [deletingRequest, setDeletingRequest] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [messageOpening, setMessageOpening] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !params.requestId) {
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "isoRequests", params.requestId), (snapshot) => {
      if (!snapshot.exists()) {
        setRequestRecord(null);
        return;
      }

      setRequestRecord({
        id: snapshot.id,
        ...(snapshot.data() as Omit<IsoRequestRecord, "id">),
      });
    });

    return () => unsubscribe();
  }, [params.requestId, user]);

  useEffect(() => {
    if (!user || !requestRecord?.createdByUid) {
      return;
    }

    const unsubscribe = onSnapshot(doc(db, "users", requestRecord.createdByUid), (snapshot) => {
      if (!snapshot.exists()) {
        setCreatorProfile(null);
        return;
      }

      setCreatorProfile(snapshot.data() as IsoCreatorProfile);
    });

    return () => unsubscribe();
  }, [requestRecord?.createdByUid, user]);

  const isAdminViewer = isAdminEmail(user?.email);

  const requesterLabel = useMemo(() => {
    const rank = creatorProfile?.rank?.trim() || "";
    const lastName = creatorProfile?.lastName?.trim() || "";
    const firstInitial = creatorProfile?.firstName?.trim()?.charAt(0).toUpperCase() || "";

    if (rank && lastName && firstInitial) {
      return `Requester: ${rank} ${lastName}, ${firstInitial}`;
    }

    if (rank && lastName) {
      return `Requester: ${rank} ${lastName}`;
    }

    if (creatorProfile?.name?.trim()) {
      return `Requester: ${creatorProfile.name.trim()}`;
    }

    return "Requester: Not listed";
  }, [creatorProfile]);
  const requestPhotoUrls = useMemo(
    () => (requestRecord ? getIsoPhotoUrls(requestRecord) : []),
    [requestRecord]
  );

  const handleDeleteRequest = async () => {
    if (!isAdminViewer || !params.requestId || deletingRequest) {
      return;
    }

    const adminMessage = window.prompt(
      "Optional admin reason for deleting this ISO post. Leave blank to delete without a reason."
    );
    if (adminMessage === null) {
      return;
    }

    try {
      setDeletingRequest(true);
      setStatusMessage("");
      const idToken = await user?.getIdToken();

      if (!idToken) {
        throw new Error("You need to sign in again before deleting this ISO post.");
      }

      const response = await fetch(`/api/iso/${params.requestId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          message: adminMessage.trim(),
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Could not delete ISO request.");
      }

      router.replace("/iso");
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : "Could not delete ISO request.");
      setDeletingRequest(false);
    }
  };

  if (loading) {
    return <main style={{ padding: 20 }}><AppLoadingState title="Loading ISO Request" caption="Opening the full request details." /></main>;
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <HomeIconLink />
        <h1>ISO Request</h1>
        <p>You need to log in first.</p>
      </main>
    );
  }

  if (!requestRecord) {
    return (
      <main style={{ padding: 20 }}>
        <div style={{ maxWidth: 940, margin: "0 auto", display: "grid", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <HomeIconLink style={{ marginBottom: 0 }} />
            <Link href="/iso" style={primaryButtonStyle}>Back to ISO</Link>
          </div>
          <section style={sectionStyle}>
            <h1 style={{ marginTop: 0 }}>ISO Request Unavailable</h1>
            <p style={{ marginBottom: 0, color: "#94a3b8" }}>That request could not be found.</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <div style={{ maxWidth: 940, margin: "0 auto", display: "grid", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <HomeIconLink style={{ marginBottom: 0 }} />
            <Link href="/iso" style={primaryButtonStyle}>Back to ISO</Link>
            {isAdminViewer ? (
              <button
                type="button"
                onClick={() => void handleDeleteRequest()}
                disabled={deletingRequest}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 38,
                  padding: "8px 13px",
                  borderRadius: 10,
                  border: "1px solid rgba(248, 113, 113, 0.34)",
                  background: "linear-gradient(180deg, rgba(95, 28, 38, 0.9) 0%, rgba(59, 17, 25, 0.96) 100%)",
                  color: "#fecaca",
                  fontFamily: "var(--font-display)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontSize: 10.5,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 14px 28px rgba(41, 10, 16, 0.3)",
                  cursor: deletingRequest ? "wait" : "pointer",
                  opacity: deletingRequest ? 0.7 : 1,
                }}
              >
                {deletingRequest ? "Deleting..." : "Admin Delete"}
              </button>
            ) : null}
          </div>

          <span style={metaPillStyle}>{formatIsoCategoryLabel(requestRecord.category)}</span>
        </div>

        <ReportableTarget
          target={{
            targetType: "iso_request",
            targetId: requestRecord.id,
            targetLabel: requestRecord.title,
            targetPreview: buildMisconductPreviewText(requestRecord.description),
            targetPath: `/iso/${requestRecord.id}`,
            targetOwnerUid: requestRecord.createdByUid || null,
          }}
        >
        <section style={{ ...sectionStyle, display: "grid", gap: 18 }}>
          {requestPhotoUrls[0] ? (
            <>
              <button
                type="button"
                onClick={() => setPhotoExpanded(true)}
                style={{ padding: 0, border: "none", background: "transparent", boxShadow: "none", cursor: "zoom-in", borderRadius: 16 }}
                aria-label="Expand ISO reference image"
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "2 / 1",
                    borderRadius: 16,
                    backgroundImage: `url(${requestPhotoUrls[0]})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    border: "1px solid rgba(126, 142, 160, 0.16)",
                  }}
                />
              </button>

              <FullscreenImageViewer
                src={requestPhotoUrls[0]}
                alt={requestRecord.title}
                open={photoExpanded}
                onClose={() => setPhotoExpanded(false)}
              />

              {requestPhotoUrls.length > 1 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: 10 }}>
                  {requestPhotoUrls.slice(1).map((photoUrl, index) => (
                    <div
                      key={`${photoUrl}-${index}`}
                      style={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        borderRadius: 12,
                        backgroundImage: `url(${photoUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        border: "1px solid rgba(126, 142, 160, 0.16)",
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </>
          ) : null}

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={metaPillStyle}>{formatIsoPostTypeLabel(requestRecord.postType)}</span>
              <span style={metaPillStyle}>{formatIsoStatusLabel(requestRecord.status)}</span>
              <span style={metaPillStyle}>{formatIsoUrgencyLabel(requestRecord.urgency)}</span>
              {requestRecord.quantityText?.trim() ? <span style={metaPillStyle}>{requestRecord.quantityText.trim()}</span> : null}
              {requestRecord.neededByDate?.trim() ? <span style={metaPillStyle}>Need by {formatIsoNeedByLabel(requestRecord.neededByDate)}</span> : null}
            </div>
            <h1 style={{ margin: 0 }}>{requestRecord.title}</h1>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <UserPreviewTrigger
                userId={requestRecord.createdByUid}
                displayLabel={requesterLabel.replace(/^Requester:\s*/, "")}
                triggerStyle={{
                  color: "#dbe7f5",
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                <span>{requesterLabel}</span>
              </UserPreviewTrigger>
              {requestRecord.createdByUid && requestRecord.createdByUid !== user.uid ? (
                <button
                  type="button"
                  disabled={messageOpening}
                  onClick={async () => {
                    try {
                      setMessageOpening(true);
                      setStatusMessage("");
                      await openIsoConversation(router, requestRecord.id);
                    } catch (error) {
                      setStatusMessage(error instanceof Error ? error.message : "Could not open the requester thread.");
                    } finally {
                      setMessageOpening(false);
                    }
                  }}
                  style={primaryButtonStyle}
                >
                  {messageOpening ? "Opening..." : "Message Requester"}
                </button>
              ) : null}
            </div>
            <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.55 }}>{formatIsoLocationLabel(requestRecord.location)}</p>
            {requestRecord.address ? <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.55 }}>{requestRecord.address}</p> : null}
          </div>

          <div
            style={{
              borderRadius: 14,
              border: "1px solid rgba(126, 142, 160, 0.14)",
              background: "linear-gradient(180deg, rgba(13, 18, 24, 0.96) 0%, rgba(7, 10, 14, 0.98) 100%)",
              padding: 14,
              display: "grid",
              gap: 8,
            }}
          >
            <strong style={{ display: "block", marginBottom: 6 }}>Request Details</strong>
            <p style={{ margin: 0, color: "#cbd5e1" }}>Type: {formatIsoPostTypeLabel(requestRecord.postType)}</p>
            <p style={{ margin: 0, color: "#cbd5e1" }}>Status: {formatIsoStatusLabel(requestRecord.status)}</p>
            <p style={{ margin: 0, color: "#cbd5e1" }}>Urgency: {formatIsoUrgencyLabel(requestRecord.urgency)}</p>
            {requestRecord.quantityText?.trim() ? <p style={{ margin: 0, color: "#cbd5e1" }}>Quantity / Count: {requestRecord.quantityText.trim()}</p> : null}
            {requestRecord.neededByDate?.trim() ? <p style={{ margin: 0, color: "#cbd5e1" }}>Need by: {formatIsoNeedByLabel(requestRecord.neededByDate)}</p> : null}
          </div>

          <div
            style={{
              borderRadius: 14,
              border: "1px solid rgba(126, 142, 160, 0.14)",
              background: "linear-gradient(180deg, rgba(13, 18, 24, 0.96) 0%, rgba(7, 10, 14, 0.98) 100%)",
              padding: 14,
            }}
          >
            <strong style={{ display: "block", marginBottom: 8 }}>Description</strong>
            <p style={{ margin: 0, color: "#cbd5e1", whiteSpace: "pre-wrap", lineHeight: 1.65 }}>
              {requestRecord.description}
            </p>
          </div>

          {statusMessage ? <p style={{ margin: 0, color: "#fca5a5" }}>{statusMessage}</p> : null}
        </section>
        </ReportableTarget>
      </div>
    </main>
  );
}
