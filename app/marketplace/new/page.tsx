"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import AppLoadingState from "../../components/AppLoadingState";
import HomeIconLink from "../../components/HomeIconLink";
import ImageCropField from "../../components/ImageCropField";
import { auth } from "../../../lib/firebase";
import { formatStructuredText } from "../../../lib/text-format";
import {
  MARKETPLACE_CATEGORY_OPTIONS,
  MARKETPLACE_CONDITION_OPTIONS,
  MARKETPLACE_EXCHANGE_METHOD_OPTIONS,
  MARKETPLACE_STATUS_OPTIONS,
  type MarketplaceCategory,
  type MarketplaceCondition,
  type MarketplaceExchangeMethod,
  type MarketplaceStatus,
} from "../../../lib/marketplace";

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

export default function NewMarketplaceListingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [photoStatusMessage, setPhotoStatusMessage] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<MarketplaceCategory>("gear");
  const [exchangeMethod, setExchangeMethod] = useState<MarketplaceExchangeMethod>("buyer_pickup");
  const [priceText, setPriceText] = useState("");
  const [condition, setCondition] = useState<MarketplaceCondition>("good");
  const [status, setStatus] = useState<MarketplaceStatus>("available");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const submitListing = async () => {
    if (!user) {
      setStatusMessage("You need to log in before creating a listing.");
      return;
    }

    if (!title.trim()) {
      setStatusMessage("Listing title is required.");
      return;
    }

    if (!description.trim()) {
      setStatusMessage("Description is required.");
      return;
    }

    try {
      setSaving(true);
      setStatusMessage("Saving listing...");
      const idToken = await user.getIdToken();
      const response = await fetch("/api/marketplace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title: formatStructuredText(title),
          category,
          exchangeMethod,
          description: description.trim(),
          photoUrl: photoUrl.trim() || null,
          priceText: priceText.trim() || null,
          condition,
          status,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        listingId?: string;
        error?: string;
      };

      if (!response.ok || !payload.listingId) {
        throw new Error(payload.error || "Could not create the listing.");
      }

      router.push(`/marketplace/${payload.listingId}`);
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : "Could not create the listing.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <main style={{ padding: 20 }}><AppLoadingState title="Loading Marketplace Form" caption="Preparing the new listing workspace." /></main>;
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <HomeIconLink />
        <h1>New Listing</h1>
        <p>You need to log in first.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <HomeIconLink style={{ marginBottom: 0 }} />
            <div>
              <p style={{ margin: 0, color: "#94a3b8", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
                Listing intake
              </p>
              <h1 style={{ margin: "4px 0 0" }}>Add Listing</h1>
            </div>
          </div>

          <Link href="/marketplace" style={primaryButtonStyle}>Back to Marketplace</Link>
        </div>

        <section style={{ ...sectionStyle, display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gap: 4 }}>
            <strong style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
              Listing Basics
            </strong>
            <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.55 }}>
              Build the first-pass marketplace card with the item identity, status, and seller-facing detail.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Listing Title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Oak desk, ABUs, floor lamp..." />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value as MarketplaceCategory)}>
                {MARKETPLACE_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Condition</span>
              <select value={condition} onChange={(event) => setCondition(event.target.value as MarketplaceCondition)}>
                {MARKETPLACE_CONDITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as MarketplaceStatus)}>
                {MARKETPLACE_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Price / Trade Text</span>
              <input value={priceText} onChange={(event) => setPriceText(event.target.value)} placeholder="$40, Free, Trade only..." />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Exchange Method</span>
              <select value={exchangeMethod} onChange={(event) => setExchangeMethod(event.target.value as MarketplaceExchangeMethod)}>
                {MARKETPLACE_EXCHANGE_METHOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <span>Photo</span>
            <ImageCropField
              value={photoUrl}
              onChange={setPhotoUrl}
              cropShape="square"
              cropAspectRatio={1}
              previewSize={120}
              outputSize={960}
              maxEncodedLength={220000}
              helperText="Optional listing photo for the card and detail page. Crop uses a square frame for consistency."
              statusMessage={photoStatusMessage}
              onStatusMessageChange={setPhotoStatusMessage}
            />
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe condition, what is included, and any trade notes. Final handoff details can be worked out in chat."
              rows={7}
            />
          </label>
        </section>

        {statusMessage ? (
          <section
            style={{
              ...sectionStyle,
              padding: "0.9rem 1rem",
              borderColor: "rgba(126, 142, 160, 0.24)",
              background: "linear-gradient(180deg, rgba(26, 31, 38, 0.98) 0%, rgba(12, 16, 21, 0.99) 100%)",
            }}
          >
            <p style={{ margin: 0, color: "#dbe7f5", lineHeight: 1.55 }}>{statusMessage}</p>
          </section>
        ) : null}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" onClick={() => void submitListing()} disabled={saving} style={primaryButtonStyle}>
            {saving ? "Saving Listing..." : "Create Listing"}
          </button>
          <Link href="/marketplace" style={secondaryButtonStyle}>Cancel</Link>
        </div>
      </div>
    </main>
  );
}
