"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import AppLoadingState from "../../components/AppLoadingState";
import FullscreenImageViewer from "../../components/FullscreenImageViewer";
import HomeIconLink from "../../components/HomeIconLink";
import { ReportableTarget } from "../../components/MisconductReporting";
import UserPreviewTrigger from "../../components/UserPreviewTrigger";
import { isAdminEmail } from "../../../lib/admin";
import { auth } from "../../../lib/firebase";
import { openMarketplaceConversation } from "../../../lib/direct-message-launch";
import { buildMisconductPreviewText } from "../../../lib/misconduct";
import {
  formatMarketplaceCategoryLabel,
  formatMarketplaceConditionLabel,
  formatMarketplaceFulfillmentLabel,
  getMarketplacePhotoUrls,
  formatMarketplacePriceLabel,
  formatMarketplaceStatusLabel,
  type MarketplaceListingRecord,
} from "../../../lib/marketplace";

type MarketplaceCreatorProfile = {
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

export default function MarketplaceDetailPage() {
  const params = useParams<{ listingId: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [listingRecord, setListingRecord] = useState<MarketplaceListingRecord | null>(null);
  const [creatorProfile, setCreatorProfile] = useState<MarketplaceCreatorProfile | null>(null);
  const [photoExpanded, setPhotoExpanded] = useState(false);
  const [deletingListing, setDeletingListing] = useState(false);
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
    if (!user || !params.listingId) {
      setListingRecord(null);
      setCreatorProfile(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setDetailLoading(true);
        setStatusMessage("");
        const idToken = await user.getIdToken();
        const response = await fetch(`/api/marketplace/${params.listingId}`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => ({}))) as {
          listing?: MarketplaceListingRecord;
          creatorProfile?: MarketplaceCreatorProfile | null;
          error?: string;
        };

        if (response.status === 404) {
          if (!cancelled) {
            setListingRecord(null);
            setCreatorProfile(null);
          }
          return;
        }

        if (!response.ok || !payload.listing) {
          throw new Error(payload.error || "Could not load marketplace listing.");
        }

        if (cancelled) {
          return;
        }

        setListingRecord(payload.listing);
        setCreatorProfile(payload.creatorProfile || null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setListingRecord(null);
        setCreatorProfile(null);
        setStatusMessage(error instanceof Error ? error.message : "Could not load marketplace listing.");
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params.listingId, user]);

  const isAdminViewer = isAdminEmail(user?.email);

  const sellerLabel = useMemo(() => {
    const rank = creatorProfile?.rank?.trim() || "";
    const lastName = creatorProfile?.lastName?.trim() || "";
    const firstInitial = creatorProfile?.firstName?.trim()?.charAt(0).toUpperCase() || "";

    if (rank && lastName && firstInitial) {
      return `Seller: ${rank} ${lastName}, ${firstInitial}`;
    }

    if (rank && lastName) {
      return `Seller: ${rank} ${lastName}`;
    }

    if (creatorProfile?.name?.trim()) {
      return `Seller: ${creatorProfile.name.trim()}`;
    }

    return "Seller: Not listed";
  }, [creatorProfile]);
  const listingPhotoUrls = useMemo(
    () => (listingRecord ? getMarketplacePhotoUrls(listingRecord) : []),
    [listingRecord]
  );

  const handleDeleteListing = async () => {
    if (!isAdminViewer || !params.listingId || deletingListing || !user) {
      return;
    }

    const adminMessage = window.prompt(
      "Optional admin reason for deleting this marketplace listing. Leave blank to delete without a reason."
    );
    if (adminMessage === null) {
      return;
    }

    try {
      setDeletingListing(true);
      setStatusMessage("");
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/marketplace/${params.listingId}`, {
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
        throw new Error(payload.error || "Could not delete listing.");
      }

      router.replace("/marketplace");
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : "Could not delete listing.");
      setDeletingListing(false);
    }
  };

  if (loading || (user && detailLoading && !listingRecord)) {
    return <main style={{ padding: 20 }}><AppLoadingState title="Loading Listing" caption="Opening marketplace listing details." /></main>;
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <HomeIconLink />
        <h1>Marketplace Listing</h1>
        <p>You need to log in first.</p>
      </main>
    );
  }

  if (!listingRecord) {
    return (
      <main style={{ padding: 20 }}>
        <div style={{ maxWidth: 940, margin: "0 auto", display: "grid", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <HomeIconLink style={{ marginBottom: 0 }} />
            <Link href="/marketplace" style={primaryButtonStyle}>Back to Marketplace</Link>
          </div>
          <section style={sectionStyle}>
            <h1 style={{ marginTop: 0 }}>Listing Unavailable</h1>
            <p style={{ marginBottom: 0, color: "#94a3b8" }}>
              {statusMessage || "That listing could not be found."}
            </p>
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
            <Link href="/marketplace" style={primaryButtonStyle}>Back to Marketplace</Link>
            {isAdminViewer ? (
              <button
                type="button"
                onClick={() => void handleDeleteListing()}
                disabled={deletingListing}
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
                  cursor: deletingListing ? "wait" : "pointer",
                  opacity: deletingListing ? 0.7 : 1,
                }}
              >
                {deletingListing ? "Deleting..." : "Admin Delete"}
              </button>
            ) : null}
          </div>

          <span style={metaPillStyle}>{formatMarketplaceCategoryLabel(listingRecord.category)}</span>
        </div>

        <ReportableTarget
          target={{
            targetType: "marketplace_listing",
            targetId: listingRecord.id,
            targetLabel: listingRecord.title,
            targetPreview: buildMisconductPreviewText(listingRecord.description),
            targetPath: `/marketplace/${listingRecord.id}`,
            targetOwnerUid: listingRecord.createdByUid || null,
          }}
        >
        <section style={{ ...sectionStyle, display: "grid", gap: 18 }}>
          {listingPhotoUrls[0] ? (
            <>
              <button
                type="button"
                onClick={() => setPhotoExpanded(true)}
                style={{ padding: 0, border: "none", background: "transparent", boxShadow: "none", cursor: "zoom-in", borderRadius: 16 }}
                aria-label="Expand listing image"
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    borderRadius: 16,
                    backgroundImage: `url(${listingPhotoUrls[0]})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    border: "1px solid rgba(126, 142, 160, 0.16)",
                  }}
                />
              </button>

              <FullscreenImageViewer
                src={listingPhotoUrls[0]}
                alt={listingRecord.title}
                open={photoExpanded}
                onClose={() => setPhotoExpanded(false)}
              />

              {listingPhotoUrls.length > 1 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: 10 }}>
                  {listingPhotoUrls.slice(1).map((photoUrl, index) => (
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
              <span style={metaPillStyle}>{formatMarketplaceStatusLabel(listingRecord.status)}</span>
              <span style={metaPillStyle}>{formatMarketplaceConditionLabel(listingRecord.condition)}</span>
              <span style={metaPillStyle}>{formatMarketplacePriceLabel(listingRecord)}</span>
            </div>
            <h1 style={{ margin: 0 }}>{listingRecord.title}</h1>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <UserPreviewTrigger
                userId={listingRecord.createdByUid}
                displayLabel={sellerLabel.replace(/^Seller:\s*/, "")}
                triggerStyle={{
                  color: "#dbe7f5",
                  fontFamily: "var(--font-display)",
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                <span>{sellerLabel}</span>
              </UserPreviewTrigger>
              {listingRecord.createdByUid && listingRecord.createdByUid !== user.uid ? (
                <button
                  type="button"
                  disabled={messageOpening}
                  onClick={async () => {
                    try {
                      setMessageOpening(true);
                      setStatusMessage("");
                      await openMarketplaceConversation(router, listingRecord.id);
                    } catch (error) {
                      setStatusMessage(error instanceof Error ? error.message : "Could not open the seller thread.");
                    } finally {
                      setMessageOpening(false);
                    }
                  }}
                  style={primaryButtonStyle}
                >
                  {messageOpening ? "Opening..." : "Message Seller"}
                </button>
              ) : null}
            </div>
            <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.55 }}>
              {formatMarketplaceFulfillmentLabel(listingRecord)}
            </p>
            {listingRecord.location?.trim() ? (
              <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.55 }}>{listingRecord.location.trim()}</p>
            ) : null}
            {listingRecord.address ? <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.55 }}>{listingRecord.address}</p> : null}
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
            <strong style={{ display: "block", marginBottom: 6 }}>Listing Details</strong>
            <p style={{ margin: 0, color: "#cbd5e1" }}>Status: {formatMarketplaceStatusLabel(listingRecord.status)}</p>
            <p style={{ margin: 0, color: "#cbd5e1" }}>Condition: {formatMarketplaceConditionLabel(listingRecord.condition)}</p>
            <p style={{ margin: 0, color: "#cbd5e1" }}>Exchange: {formatMarketplaceFulfillmentLabel(listingRecord)}</p>
            <p style={{ margin: 0, color: "#cbd5e1" }}>{listingRecord.isTrade ? "Trade: " : "Price: "}{formatMarketplacePriceLabel(listingRecord)}</p>
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
              {listingRecord.description}
            </p>
          </div>

          {statusMessage ? <p style={{ margin: 0, color: "#fca5a5" }}>{statusMessage}</p> : null}
        </section>
        </ReportableTarget>
      </div>
    </main>
  );
}
