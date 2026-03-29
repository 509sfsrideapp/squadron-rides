"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppLoadingState from "../../components/AppLoadingState";
import HomeIconLink from "../../components/HomeIconLink";
import { auth, db } from "../../../lib/firebase";
import { ADMIN_EMAIL, isAdminEmail } from "../../../lib/admin";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";

type AppUser = {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  phone?: string;
  available?: boolean;
  accountFrozen?: boolean;
  homeAddress?: string;
  homeStreet?: string;
  homeCity?: string;
  homeState?: string;
  homeZip?: string;
  rank?: string;
  flight?: string;
  riderPhotoUrl?: string;
  carYear?: string;
  carMake?: string;
  carModel?: string;
  carColor?: string;
  carPlate?: string;
  driverPhotoUrl?: string;
  locationServicesEnabled?: boolean;
};

const rankOrder = [
  "Gen",
  "Lt Gen",
  "Maj Gen",
  "Brig Gen",
  "Col",
  "Lt Col",
  "Maj",
  "Capt",
  "1st Lt",
  "2d Lt",
  "CMSgt",
  "SMSgt",
  "MSgt",
  "TSgt",
  "SSgt",
  "SrA",
  "A1C",
  "Amn",
  "AB",
  "CIV",
] as const;

function getRankPriority(rank?: string | null) {
  const normalizedRank = rank?.trim().toLowerCase() || "";
  const index = rankOrder.findIndex((value) => value.toLowerCase() === normalizedRank);
  return index === -1 ? rankOrder.length : index;
}

export default function AdminAccountsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [accountSearch, setAccountSearch] = useState("");
  const [accountStatusFilter, setAccountStatusFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [flightFilter, setFlightFilter] = useState("all");
  const [rankFilter, setRankFilter] = useState("all");
  const [actingOnUserId, setActingOnUserId] = useState("");
  const [accountActionMessage, setAccountActionMessage] = useState("");
  const [expandedUserIds, setExpandedUserIds] = useState<Record<string, boolean>>({});
  const [messageDraftUserId, setMessageDraftUserId] = useState("");
  const [messageTitle, setMessageTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthorized(isAdminEmail(currentUser?.email));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authorized) {
      return;
    }

    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      const nextUsers: AppUser[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<AppUser, "id">),
      }));
      setUsers(nextUsers);
    });

    return () => unsubscribe();
  }, [authorized]);

  const uniqueFlights = useMemo(
    () => Array.from(new Set(users.map((appUser) => appUser.flight).filter(Boolean))).sort(),
    [users]
  );
  const uniqueRanks = useMemo(
    () =>
      Array.from(new Set(users.map((appUser) => appUser.rank).filter(Boolean))).sort((left, right) => {
        const rankDifference = getRankPriority(left) - getRankPriority(right);
        if (rankDifference !== 0) {
          return rankDifference;
        }

        return String(left).localeCompare(String(right));
      }),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const normalizedAccountSearch = accountSearch.trim().toLowerCase();

    return users
      .filter((appUser) => {
        if (accountStatusFilter === "frozen" && !appUser.accountFrozen) return false;
        if (accountStatusFilter === "active" && appUser.accountFrozen) return false;
        if (availabilityFilter === "available" && !appUser.available) return false;
        if (availabilityFilter === "unavailable" && appUser.available) return false;
        if (flightFilter !== "all" && (appUser.flight || "") !== flightFilter) return false;
        if (rankFilter !== "all" && (appUser.rank || "") !== rankFilter) return false;

        if (!normalizedAccountSearch) {
          return true;
        }

        const searchableFields = [
          appUser.name,
          appUser.firstName,
          appUser.lastName,
          appUser.username,
          appUser.email,
          appUser.phone,
          appUser.rank,
          appUser.flight,
          appUser.homeAddress,
          appUser.homeStreet,
          appUser.homeCity,
          appUser.homeState,
          appUser.homeZip,
          appUser.carYear,
          appUser.carMake,
          appUser.carModel,
          appUser.carColor,
          appUser.carPlate,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableFields.includes(normalizedAccountSearch);
      })
      .sort((left, right) => {
        const rankDifference = getRankPriority(left.rank) - getRankPriority(right.rank);
        if (rankDifference !== 0) {
          return rankDifference;
        }

        const leftName = (left.name || left.email || left.id).toLowerCase();
        const rightName = (right.name || right.email || right.id).toLowerCase();
        return leftName.localeCompare(rightName);
      });
  }, [accountSearch, accountStatusFilter, availabilityFilter, flightFilter, rankFilter, users]);

  const toggleExpanded = (userId: string) => {
    setExpandedUserIds((current) => ({
      ...current,
      [userId]: !current[userId],
    }));
  };

  const handleAccountAction = async (action: "freeze" | "unfreeze" | "delete", appUser: AppUser) => {
    if (!auth.currentUser) {
      setAccountActionMessage("Admin session expired. Please log in again.");
      return;
    }

    if (isAdminEmail(appUser.email)) {
      setAccountActionMessage("The admin account cannot be managed from this panel.");
      return;
    }

    const confirmed = window.confirm(
      action === "delete"
        ? `Delete ${appUser.name || appUser.email || appUser.id}? This removes the account entirely.`
        : action === "freeze"
          ? `Freeze ${appUser.name || appUser.email || appUser.id}? They will be signed out and blocked from login.`
          : `Unfreeze ${appUser.name || appUser.email || appUser.id}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActingOnUserId(appUser.id);
      setAccountActionMessage(
        action === "delete"
          ? "Deleting account..."
          : action === "freeze"
            ? "Freezing account..."
            : "Unfreezing account..."
      );

      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action,
          userId: appUser.id,
          username: appUser.username || "",
          email: appUser.email || "",
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "The account action failed.");
      }

      setAccountActionMessage(
        action === "delete"
          ? "Account deleted."
          : action === "freeze"
            ? "Account frozen."
            : "Account unfrozen."
      );
    } catch (error) {
      console.error(error);
      setAccountActionMessage(error instanceof Error ? error.message : "The account action failed.");
    } finally {
      setActingOnUserId("");
    }
  };

  const openMessageComposer = (appUser: AppUser) => {
    setMessageDraftUserId(appUser.id);
    setMessageTitle("");
    setMessageBody("");
    setAccountActionMessage("");
  };

  const closeMessageComposer = () => {
    setMessageDraftUserId("");
    setMessageTitle("");
    setMessageBody("");
  };

  const sendAccountMessage = async (appUser: AppUser) => {
    if (!auth.currentUser) {
      setAccountActionMessage("Admin session expired. Please log in again.");
      return;
    }

    if (!messageTitle.trim() || !messageBody.trim()) {
      setAccountActionMessage("Message title and body are both required.");
      return;
    }

    try {
      setActingOnUserId(appUser.id);
      setAccountActionMessage("Sending admin message...");
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch("/api/admin/user-inbox-posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId: appUser.id,
          title: messageTitle.trim(),
          body: messageBody.trim(),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Could not send the admin message.");
      }

      setAccountActionMessage(`Message sent to ${appUser.name || appUser.email || appUser.id}.`);
      closeMessageComposer();
    } catch (error) {
      console.error(error);
      setAccountActionMessage(error instanceof Error ? error.message : "Could not send the admin message.");
    } finally {
      setActingOnUserId("");
    }
  };

  if (loading) {
    return (
      <main style={{ padding: 20 }}>
        <AppLoadingState title="Loading Admin Accounts" caption="Preparing account filters and management controls." />
      </main>
    );
  }

  if (!user) {
    return (
      <main style={{ padding: 20 }}>
        <Link
          href="/admin/login"
          style={{
            display: "inline-block",
            marginBottom: 20,
            padding: "8px 14px",
            backgroundColor: "#1f2937",
            color: "white",
            textDecoration: "none",
            borderRadius: 8,
          }}
        >
          Admin Login
        </Link>
        <p>You must sign in to view the admin accounts page.</p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main style={{ padding: 20 }}>
        <HomeIconLink />
        <p>This account does not have admin access.</p>
        <p>Authorized admin email: {ADMIN_EMAIL}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
        <HomeIconLink style={{ marginBottom: 0 }} />
        <Link
          href="/admin"
          style={{
            display: "inline-block",
            padding: "8px 14px",
            backgroundColor: "#1f2937",
            color: "white",
            textDecoration: "none",
            borderRadius: 8,
          }}
        >
          Admin Dashboard
        </Link>
      </div>

      <h1>Admin Accounts</h1>
      <p style={{ maxWidth: 760 }}>
        Search and manage all accounts here. Cards stay compact until you expand them for the full profile and account controls.
      </p>
      {accountActionMessage ? (
        <p style={{ marginTop: 12, color: accountActionMessage.toLowerCase().includes("failed") || accountActionMessage.toLowerCase().includes("cannot") ? "#fca5a5" : "#bfdbfe" }}>
          {accountActionMessage}
        </p>
      ) : null}

      <div
        style={{
          marginTop: 20,
          marginBottom: 18,
          padding: 16,
          borderRadius: 12,
          border: "1px solid rgba(148, 163, 184, 0.18)",
          backgroundColor: "rgba(9, 15, 25, 0.88)",
          display: "grid",
          gap: 10,
        }}
      >
        <input
          value={accountSearch}
          onChange={(event) => setAccountSearch(event.target.value)}
          placeholder="Search by name, username, phone, rank, flight, vehicle, or address"
          style={{ width: "100%" }}
        />
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
          <select value={accountStatusFilter} onChange={(event) => setAccountStatusFilter(event.target.value)}>
            <option value="all">All Account States</option>
            <option value="active">Active Accounts</option>
            <option value="frozen">Frozen Accounts</option>
          </select>
          <select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)}>
            <option value="all">All Availability</option>
            <option value="available">Clocked In Drivers</option>
            <option value="unavailable">Not Clocked In</option>
          </select>
          <select value={flightFilter} onChange={(event) => setFlightFilter(event.target.value)}>
            <option value="all">All Flights</option>
            {uniqueFlights.map((flight) => (
              <option key={flight} value={flight}>
                {flight}
              </option>
            ))}
          </select>
          <select value={rankFilter} onChange={(event) => setRankFilter(event.target.value)}>
            <option value="all">All Ranks</option>
            {uniqueRanks.map((rank) => (
              <option key={rank} value={rank}>
                {rank}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section>
        {filteredUsers.length === 0 ? (
          <p>No accounts match the current filters.</p>
        ) : (
          filteredUsers.map((appUser) => {
            const vehicleSummary = [appUser.carColor, appUser.carYear, appUser.carMake, appUser.carModel].filter(Boolean).join(" ").trim();
            const addressSummary =
              appUser.homeAddress ||
              [appUser.homeStreet, appUser.homeCity, appUser.homeState, appUser.homeZip].filter(Boolean).join(", ");
            const photoUrl = appUser.driverPhotoUrl || appUser.riderPhotoUrl || "";
            const busy = actingOnUserId === appUser.id;
            const expanded = Boolean(expandedUserIds[appUser.id]);
            const messageComposerOpen = messageDraftUserId === appUser.id;

            return (
              <div
                key={appUser.id}
                style={{
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  backgroundColor: "rgba(9, 15, 25, 0.88)",
                  color: "#e5edf7",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 14,
                  boxShadow: "0 12px 32px rgba(2, 6, 23, 0.18)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    {photoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={photoUrl}
                        alt={`${appUser.name || appUser.email || "User"} profile`}
                        style={{ width: 64, height: 64, borderRadius: 999, objectFit: "cover", border: "1px solid rgba(148, 163, 184, 0.22)" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 999,
                          display: "grid",
                          placeItems: "center",
                          backgroundColor: "rgba(18, 37, 63, 0.72)",
                          color: "#dbeafe",
                          border: "1px solid rgba(96, 165, 250, 0.2)",
                          fontFamily: "var(--font-display)",
                          fontSize: "1.3rem",
                        }}
                      >
                        {(appUser.firstName || appUser.name || appUser.email || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 style={{ margin: 0 }}>{appUser.name || "Unnamed Account"}</h3>
                      <p style={{ margin: "6px 0 0", color: "#cbd5e1" }}>
                        {appUser.rank || "No rank"} {appUser.flight ? `• ${appUser.flight}` : ""}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleExpanded(appUser.id)}
                    style={{
                      minWidth: 46,
                      width: 46,
                      height: 46,
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      padding: 0,
                      backgroundColor: "rgba(15, 23, 42, 0.78)",
                      textTransform: "none",
                      letterSpacing: "normal",
                    }}
                    aria-label={expanded ? "Collapse user details" : "Expand user details"}
                    aria-expanded={expanded}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 160ms ease" }}
                    >
                      <path
                        d="M6 9L12 15L18 9"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>

                <div
                  className={`app-collapsible-panel${expanded ? " app-collapsible-panel-open" : ""}`}
                  style={{ marginTop: expanded ? 16 : 0, maxHeight: expanded ? 760 : 0 }}
                  aria-hidden={!expanded}
                >
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                      <span style={{ padding: "4px 10px", borderRadius: 999, backgroundColor: appUser.accountFrozen ? "rgba(127, 29, 29, 0.92)" : "rgba(10, 51, 44, 0.88)", color: "white", fontSize: 12 }}>
                        {appUser.accountFrozen ? "Frozen" : "Active"}
                      </span>
                      <span style={{ padding: "4px 10px", borderRadius: 999, backgroundColor: appUser.available ? "rgba(15, 118, 110, 0.9)" : "rgba(30, 41, 59, 0.92)", color: "white", fontSize: 12 }}>
                        {appUser.available ? "Clocked In" : "Not Clocked In"}
                      </span>
                      {isAdminEmail(appUser.email) ? (
                        <span style={{ padding: "4px 10px", borderRadius: 999, backgroundColor: "rgba(91, 33, 182, 0.92)", color: "white", fontSize: 12 }}>
                          Admin
                        </span>
                      ) : null}
                    </div>

                    <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 14 }}>
                      <div><strong>Email:</strong> {appUser.email || "N/A"}</div>
                      <div><strong>Username:</strong> {appUser.username || "N/A"}</div>
                      <div><strong>Phone:</strong> {appUser.phone || "N/A"}</div>
                      <div><strong>User ID:</strong> {appUser.id}</div>
                      <div><strong>Flight:</strong> {appUser.flight || "N/A"}</div>
                      <div><strong>Rank:</strong> {appUser.rank || "N/A"}</div>
                      <div><strong>Location Services:</strong> {appUser.locationServicesEnabled === false ? "Off" : "On"}</div>
                      <div><strong>Vehicle:</strong> {vehicleSummary || "N/A"}</div>
                      <div><strong>Plate:</strong> {appUser.carPlate || "N/A"}</div>
                      <div><strong>Address:</strong> {addressSummary || "N/A"}</div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => (messageComposerOpen ? closeMessageComposer() : openMessageComposer(appUser))}
                        disabled={busy}
                        style={{
                          padding: "8px 12px",
                          backgroundColor: "#1d4ed8",
                          color: "white",
                          border: "none",
                          borderRadius: 8,
                          cursor: "pointer",
                        }}
                      >
                        {busy && messageComposerOpen ? "Working..." : messageComposerOpen ? "Close Message" : "Message User"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAccountAction(appUser.accountFrozen ? "unfreeze" : "freeze", appUser)}
                        disabled={busy || isAdminEmail(appUser.email)}
                        style={{
                          padding: "8px 12px",
                          backgroundColor: appUser.accountFrozen ? "#0f766e" : "#7f1d1d",
                          color: "white",
                          border: "none",
                          borderRadius: 8,
                          cursor: "pointer",
                        }}
                      >
                        {busy ? "Working..." : appUser.accountFrozen ? "Unfreeze" : "Freeze"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAccountAction("delete", appUser)}
                        disabled={busy || isAdminEmail(appUser.email)}
                        style={{
                          padding: "8px 12px",
                          backgroundColor: "#b91c1c",
                          color: "white",
                          border: "none",
                          borderRadius: 8,
                          cursor: "pointer",
                        }}
                      >
                        {busy ? "Working..." : "Delete"}
                      </button>
                    </div>

                    <div
                      className={`app-collapsible-panel${messageComposerOpen ? " app-collapsible-panel-open" : ""}`}
                      style={{ marginTop: messageComposerOpen ? 14 : 0, maxHeight: messageComposerOpen ? 320 : 0 }}
                      aria-hidden={!messageComposerOpen}
                    >
                      <div
                        style={{
                          display: "grid",
                          gap: 10,
                          padding: 14,
                          borderRadius: 12,
                          border: "1px solid rgba(96, 165, 250, 0.18)",
                          backgroundColor: "rgba(12, 20, 32, 0.8)",
                        }}
                      >
                        <strong>Send Admin Inbox Message</strong>
                        <input
                          value={messageTitle}
                          onChange={(event) => setMessageTitle(event.target.value)}
                          placeholder="Message title"
                          disabled={busy}
                        />
                        <textarea
                          value={messageBody}
                          onChange={(event) => setMessageBody(event.target.value)}
                          placeholder="Message text"
                          rows={5}
                          disabled={busy}
                          style={{ minHeight: 132 }}
                        />
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => void sendAccountMessage(appUser)}
                            disabled={busy}
                            style={{
                              padding: "8px 12px",
                              backgroundColor: "#1d4ed8",
                              color: "white",
                              border: "none",
                              borderRadius: 8,
                              cursor: "pointer",
                            }}
                          >
                            {busy ? "Sending..." : "Send to Admin Inbox"}
                          </button>
                          <button
                            type="button"
                            onClick={closeMessageComposer}
                            disabled={busy}
                            style={{
                              padding: "8px 12px",
                              backgroundColor: "#1f2937",
                              color: "white",
                              border: "none",
                              borderRadius: 8,
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
