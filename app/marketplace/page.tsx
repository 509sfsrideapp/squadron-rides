"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import AppLoadingState from "../components/AppLoadingState";
import HomeIconLink from "../components/HomeIconLink";
import { ReportableTarget } from "../components/MisconductReporting";
import { auth } from "../../lib/firebase";
import { buildMisconductPreviewText } from "../../lib/misconduct";
import {
  formatMarketplaceCategoryLabel,
  formatMarketplaceConditionLabel,
  formatMarketplaceFulfillmentLabel,
  formatMarketplaceStatusLabel,
  formatMarketplacePriceLabel,
  getMarketplacePreviewText,
  MARKETPLACE_CATEGORY_OPTIONS,
  marketplaceMatchesCategory,
  marketplaceMatchesPriceRange,
  marketplaceMatchesSearch,
  sortMarketplaceListings,
  type MarketplaceListingRecord,
} from "../../lib/marketplace";

type MarketplaceCreatorProfile = {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  rank?: string | null;
};

const pageShellStyle: React.CSSProperties = {
  maxWidth: 1040,
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

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 40,
  padding: "9px 14px",
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

const infoPillStyle: React.CSSProperties = {
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

export default function MarketplacePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [boardLoading, setBoardLoading] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [listings, setListings] = useState<MarketplaceListingRecord[]>([]);
  const [creatorDirectory, setCreatorDirectory] = useState<Record<string, MarketplaceCreatorProfile>>({});
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setListings([]);
      setCreatorDirectory({});
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setBoardLoading(true);
        setStatusMessage("");
        const idToken = await user.getIdToken();
        const response = await fetch("/api/marketplace", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => ({}))) as {
          listings?: MarketplaceListingRecord[];
          creatorDirectory?: Record<string, MarketplaceCreatorProfile>;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Could not load marketplace listings.");
        }

        if (cancelled) {
          return;
        }

        setListings(sortMarketplaceListings(payload.listings || []));
        setCreatorDirectory(payload.creatorDirectory || {});
      } catch (error) {
        if (cancelled) {
          return;
        }

        setListings([]);
        setCreatorDirectory({});
        setStatusMessage(error instanceof Error ? error.message : "Could not load marketplace listings.");
      } finally {
        if (!cancelled) {
          setBoardLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const filteredListings = useMemo(() => {
    return sortMarketplaceListings(
      listings.filter((listing) => {
        return (
          marketplaceMatchesCategory(listing, selectedCategory) &&
          marketplaceMatchesSearch(listing, searchQuery) &&
          marketplaceMatchesPriceRange(listing, minPrice, maxPrice)
        );
      })
    );
  }, [listings, maxPrice, minPrice, searchQuery, selectedCategory]);

  const getSellerLabel = (listing: MarketplaceListingRecord) => {
    const creator = listing.createdByUid ? creatorDirectory[listing.createdByUid] : null;
    const rank = creator?.rank?.trim() || "";
    const lastName = creator?.lastName?.trim() || "";
    const firstInitial = creator?.firstName?.trim()?.charAt(0).toUpperCase() || "";

    if (rank && lastName && firstInitial) {
      return `Seller: ${rank} ${lastName}, ${firstInitial}`;
    }

    if (rank && lastName) {
      return `Seller: ${rank} ${lastName}`;
    }

    if (creator?.name?.trim()) {
      return `Seller: ${creator.name.trim()}`;
    }

    return "Seller: Not listed";
  };

  const hasActiveFilters =
    selectedCategory !== "all" ||
    Boolean(searchQuery.trim()) ||
    Boolean(minPrice.trim()) ||
    Boolean(maxPrice.trim());

  if (loading || (user && boardLoading)) {
    return <main style={{ padding: 20 }}><AppLoadingState title="Loading Marketplace" caption="Opening the live listings board." /></main>;
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <HomeIconLink />
        <h1>Marketplace</h1>
        <p>You need to log in first.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <div style={pageShellStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <HomeIconLink style={{ marginBottom: 0 }} />
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
                Exchange board for gear and local listings
              </p>
              <h1 style={{ margin: "4px 0 0" }}>Marketplace</h1>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={infoPillStyle}>{filteredListings.length} listings shown</span>
              </div>
            </div>
          </div>

          <Link href="/marketplace/new" style={{ ...primaryButtonStyle, gap: 8 }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            <span>Add Listing</span>
          </Link>
        </div>

        <section style={{ ...cardStyle, padding: "1rem 1rem 1.05rem", display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <strong style={{ fontSize: 15, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
              Filter
            </strong>

            <button
              type="button"
              onClick={() => setFiltersExpanded((current) => !current)}
              aria-expanded={filtersExpanded}
              style={{
                width: 40,
                minWidth: 40,
                height: 40,
                borderRadius: 12,
                border: "1px solid rgba(126, 142, 160, 0.2)",
                background: "linear-gradient(180deg, rgba(24, 31, 40, 0.98) 0%, rgba(11, 16, 22, 0.99) 100%)",
                color: "#dbe7f5",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 20px rgba(0, 0, 0, 0.22)",
                fontFamily: "var(--font-display)",
                fontSize: 20,
                lineHeight: 1,
                padding: 0,
              }}
            >
              {filtersExpanded ? "−" : "+"}
            </button>
          </div>

          <div
            className={`app-collapsible-panel${filtersExpanded ? " app-collapsible-panel-open" : ""}`}
            style={{ display: "grid", gap: 12, maxHeight: filtersExpanded ? 360 : 0 }}
            aria-hidden={!filtersExpanded}
          >
            <div style={{ display: "grid", gap: 12, paddingTop: 2 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>Search</span>
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search listing names and descriptions..."
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>Category</span>
                  <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
                    <option value="all">All categories</option>
                    {MARKETPLACE_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>Min Price</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={minPrice}
                    onChange={(event) => setMinPrice(event.target.value)}
                    placeholder="Blank"
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>Max Price</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={maxPrice}
                    onChange={(event) => setMaxPrice(event.target.value)}
                    placeholder="Blank"
                  />
                </label>
              </div>

              {hasActiveFilters ? (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory("all");
                      setSearchQuery("");
                      setMinPrice("");
                      setMaxPrice("");
                    }}
                    style={secondaryButtonStyle}
                  >
                    Clear Filters
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {statusMessage ? (
          <section style={{ ...cardStyle, padding: "0.95rem 1rem" }}>
            <p style={{ margin: 0, color: "#fca5a5", lineHeight: 1.55 }}>{statusMessage}</p>
          </section>
        ) : null}

        <section style={{ display: "grid", gap: 14 }}>
          {filteredListings.length > 0 ? filteredListings.map((listing) => (
            <ReportableTarget
              key={listing.id}
              target={{
                targetType: "marketplace_listing",
                targetId: listing.id,
                targetLabel: listing.title,
                targetPreview: buildMisconductPreviewText(listing.description),
                targetPath: `/marketplace/${listing.id}`,
                targetOwnerUid: listing.createdByUid || null,
              }}
            >
            <Link
              href={`/marketplace/${listing.id}`}
              style={{
                ...cardStyle,
                display: "grid",
                gap: 14,
                padding: 16,
                textDecoration: "none",
                color: "#e5edf7",
              }}
            >
              {listing.photoUrl ? (
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "2 / 1",
                    borderRadius: 14,
                    backgroundImage: `url(${listing.photoUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    border: "1px solid rgba(126, 142, 160, 0.16)",
                  }}
                />
              ) : null}

              <div style={{ minWidth: 0, display: "grid", gap: 10, position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    color: "#9cc2ee",
                    fontSize: 12,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  View Listing
                </span>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "start", paddingRight: 112 }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        justifySelf: "start",
                        padding: "5px 10px",
                        borderRadius: 999,
                        backgroundColor: "rgba(37, 99, 235, 0.18)",
                        color: "#bfdbfe",
                        fontSize: 11,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      {formatMarketplaceCategoryLabel(listing.category)}
                    </span>
                    <h2 style={{ margin: 0, fontSize: "1.3rem" }}>{listing.title}</h2>
                    <p style={{ margin: 0, color: "#9fb1c7", fontSize: 13, letterSpacing: "0.03em" }}>
                      {getSellerLabel(listing)}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <span style={infoPillStyle}>{formatMarketplaceStatusLabel(listing.status)}</span>
                  <span style={infoPillStyle}>{formatMarketplaceConditionLabel(listing.condition)}</span>
                  <span style={infoPillStyle}>{formatMarketplaceFulfillmentLabel(listing)}</span>
                  <span style={infoPillStyle}>{formatMarketplacePriceLabel(listing)}</span>
                </div>

                <p
                  style={{
                    margin: 0,
                    color: "#94a3b8",
                    lineHeight: 1.55,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {getMarketplacePreviewText(listing.description)}
                </p>
              </div>
            </Link>
            </ReportableTarget>
          )) : (
            <div style={{ ...cardStyle, padding: "1rem 1rem 1.1rem" }}>
              <strong style={{ display: "block", marginBottom: 8 }}>No listings match this filter set</strong>
              <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.55 }}>
                Try widening the search, category, or price range filter, or post the first listing from the button above.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
