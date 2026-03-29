"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import AppLoadingState from "../../components/AppLoadingState";
import HomeIconLink from "../../components/HomeIconLink";
import ImageCropField from "../../components/ImageCropField";
import { auth, db } from "../../../lib/firebase";
import { formatAddressPart, formatStructuredText } from "../../../lib/text-format";
import {
  ISO_CATEGORY_OPTIONS,
  ISO_STATUS_OPTIONS,
  ISO_URGENCY_OPTIONS,
  type IsoCategory,
  type IsoStatus,
  type IsoUrgency,
} from "../../../lib/iso";

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

export default function NewISORequestPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [photoStatusMessage, setPhotoStatusMessage] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<IsoCategory>("gear");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [quantityText, setQuantityText] = useState("");
  const [neededByDate, setNeededByDate] = useState("");
  const [urgency, setUrgency] = useState<IsoUrgency>("routine");
  const [status, setStatus] = useState<IsoStatus>("open");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const submitRequest = async () => {
    if (!user) {
      setStatusMessage("You need to log in before creating an ISO request.");
      return;
    }

    if (!title.trim()) {
      setStatusMessage("Request title is required.");
      return;
    }

    if (!location.trim()) {
      setStatusMessage("Location is required.");
      return;
    }

    if (!description.trim()) {
      setStatusMessage("Description is required.");
      return;
    }

    try {
      setSaving(true);
      setStatusMessage("Saving ISO request...");

      const createdRef = await addDoc(collection(db, "isoRequests"), {
        title: formatStructuredText(title),
        category,
        location: formatStructuredText(location),
        address: formatAddressPart(address) || null,
        description: description.trim(),
        photoUrl: photoUrl.trim() || null,
        quantityText: quantityText.trim() || null,
        neededByDate: neededByDate.trim() || null,
        urgency,
        status,
        createdByUid: user.uid,
        createdByEmail: user.email || null,
        createdAt: new Date(),
      });

      router.push(`/iso/${createdRef.id}`);
    } catch (error) {
      console.error(error);
      setStatusMessage(error instanceof Error ? error.message : "Could not create the ISO request.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <main style={{ padding: 20 }}><AppLoadingState title="Loading ISO Form" caption="Preparing the new item search request workspace." /></main>;
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <HomeIconLink />
        <h1>New ISO Request</h1>
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
                Request intake
              </p>
              <h1 style={{ margin: "4px 0 0" }}>Add ISO Request</h1>
            </div>
          </div>

          <Link href="/iso" style={primaryButtonStyle}>Back to ISO</Link>
        </div>

        <section style={{ ...sectionStyle, display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gap: 4 }}>
            <strong style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
              Request Basics
            </strong>
            <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.55 }}>
              Build the first-pass ISO request with the item wanted, location, urgency, and enough detail for follow-up.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Request Title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Looking for ABU belt, couch, bike rack..." />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value as IsoCategory)}>
                {ISO_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Urgency</span>
              <select value={urgency} onChange={(event) => setUrgency(event.target.value as IsoUrgency)}>
                {ISO_URGENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as IsoStatus)}>
                {ISO_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Quantity / Count</span>
              <input value={quantityText} onChange={(event) => setQuantityText(event.target.value)} placeholder="1 needed, 3 chairs, full set..." />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Location</span>
              <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Squadron, dorms, base housing..." />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Need-By Date (Optional)</span>
              <input type="date" value={neededByDate} onChange={(event) => setNeededByDate(event.target.value)} />
            </label>

            <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
              <span>Address (Optional)</span>
              <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="123 Main St, Whiteman AFB, MO 65305" />
            </label>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <span>Reference Photo</span>
            <ImageCropField
              value={photoUrl}
              onChange={setPhotoUrl}
              cropShape="square"
              cropAspectRatio={2}
              previewSize={120}
              outputSize={960}
              maxEncodedLength={220000}
              helperText="Optional reference photo for the request card and detail page. Crop uses a 2:1 landscape frame for consistency."
              statusMessage={photoStatusMessage}
              onStatusMessageChange={setPhotoStatusMessage}
            />
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe what you need, any acceptable variants, condition expectations, and how to reach you."
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
          <button type="button" onClick={() => void submitRequest()} disabled={saving} style={primaryButtonStyle}>
            {saving ? "Saving Request..." : "Create ISO Request"}
          </button>
          <Link href="/iso" style={secondaryButtonStyle}>Cancel</Link>
        </div>
      </div>
    </main>
  );
}
