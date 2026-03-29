"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import AppLoadingState from "./components/AppLoadingState";
import { useRouter } from "next/navigation";
import PushNotificationsCard from "./components/PushNotificationsCard";
import { auth, db } from "../lib/firebase";
import { isAdminEmail } from "../lib/admin";
import { canDrive, canRequestRide, getDriverReadinessIssues, getRideReadinessIssues } from "../lib/profile-readiness";
import { getInboxUnreadCount, INBOX_READ_EVENT, loadInboxReadState } from "../lib/inbox-badges";
import { canDriverSeeRideDuringDispatchWindow, DEFAULT_RIDE_DISPATCH_MODE, type EmergencyRideDispatchMode, normalizeRideDispatchMode } from "../lib/ride-dispatch";
import { getLatestActiveRideForRider } from "../lib/ride-state";
import { useActiveRides } from "../lib/use-active-rides";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { isMessageThreadId, type MessageThreadId } from "../lib/messages";

type UserProfile = {
  name: string;
  firstName?: string;
  lastName?: string;
  rank?: string;
  flight?: string;
  username?: string;
  phone: string;
  email: string;
  available: boolean;
  notificationsEnabled?: boolean;
  homeAddress?: string;
  homeAddressVerified?: boolean;
  driverPhotoUrl?: string;
  riderPhotoUrl?: string;
  carYear?: string;
  carMake?: string;
  carModel?: string;
  carColor?: string;
  locationServicesEnabled?: boolean;
  emergencyRideAddressConsent?: boolean;
  emergencyRideDispatchMode?: EmergencyRideDispatchMode;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type ReverseGeocodeResult = {
  placeName?: string | null;
  address?: string | null;
  display?: string | null;
};

type InboxPost = {
  id: string;
  threadId: MessageThreadId;
  createdAt?: { seconds?: number; nanoseconds?: number } | null;
  requiresResponse?: boolean;
  responseSubmittedAt?: { seconds?: number; nanoseconds?: number } | null;
};

type OpenRideBadgeRecord = {
  id: string;
  status: string;
  isTestRide?: boolean;
  riderFlight?: string | null;
  dispatchMode?: EmergencyRideDispatchMode;
  dispatchFlight?: string | null;
  dispatchExpandedAt?: { seconds?: number; nanoseconds?: number } | null;
  createdAt?: { seconds?: number; nanoseconds?: number } | null;
};

const appTilePlaceholderCount = 6;
const homepageCardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(126, 142, 160, 0.18)",
  background:
    "linear-gradient(180deg, rgba(18, 23, 29, 0.96) 0%, rgba(9, 12, 17, 0.985) 100%)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 22px 44px rgba(0, 0, 0, 0.3)",
};

type HomepageStatusScenario = {
  command: string;
  response: string;
};

function chooseRandom<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function formatRandomCoordinate() {
  const latitude = (Math.random() * 180 - 90).toFixed(2);
  const longitude = (Math.random() * 360 - 180).toFixed(2);
  const latSuffix = Number(latitude) >= 0 ? "N" : "S";
  const lonSuffix = Number(longitude) >= 0 ? "E" : "W";
  return `${Math.abs(Number(latitude)).toFixed(2)}${latSuffix}_${Math.abs(Number(longitude)).toFixed(2)}${lonSuffix}`;
}

function createHomepageStatusScenario(): HomepageStatusScenario {
  const node = chooseRandom(["BRAVO", "DELTA", "ECHO", "FOXTROT", "VIPER", "NOMAD", "SABLE"]);
  const sectors = ["IRON-12", "EMBER-4", "FALCON-7", "NOVA-3", "GHOST-9", "ORBIT-6"];
  const commands = [
    `AUTH_REKEY//NODE:${node}//TOKEN:REFRESH`,
    `SCAN_DISPATCH_GRID//NODE:${node}//MODE:ACTIVE`,
    `PING_GEO_ROUTE//SECTOR:${chooseRandom(sectors)}//TRACE:FULL`,
    `QUERY_INBOX_STACK//THREAD:ADMIN//SYNC:TRUE`,
    `VALIDATE_DRIVER_MESH//FLIGHT:${chooseRandom(["ALPHA", "BRAVO", "CHARLIE", "DELTA"])}//HANDSHAKE`,
    `CHECK_OPS_SHELL//SUBSYS:${chooseRandom(["MAP", "NOTIFY", "QUEUE", "EVENTS", "CHAT"])}//STATE`,
    `RUN_THREAT_MODEL//PACKAGE:${chooseRandom(["SPECTER", "REAPER", "LANCER", "STRIKE"])}//SIM`,
    `INIT_BLACKBOX_REVIEW//AIRFRAME:B2//FEED:LIVE`,
  ];
  const responses = [
    `AUTH_REFRESHED//NODE:${node}//TOKEN:VALID`,
    `DISPATCH_GRID_SYNCED//NODE:${node}//LATENCY:${String(Math.floor(Math.random() * 120) + 18).padStart(3, "0")}MS`,
    `ROUTE_TRACE_CLEAN//SECTOR:${chooseRandom(sectors)}//JAMMING:NIL`,
    `INBOX_STACK_ONLINE//THREAD:${chooseRandom(["ADMIN", "DEV", "DIRECT"])}//UNREAD:${Math.floor(Math.random() * 8)}`,
    `DRIVER_MESH_CONFIRMED//FLIGHT:${chooseRandom(["ALPHA", "BRAVO", "CHARLIE", "DELTA"])}//NODES:${Math.floor(Math.random() * 14) + 3}`,
    `CRASH_DETECTED//INIT_B2_CRASH_PRTCL//AT:${formatRandomCoordinate()}`,
    `STRIKE_CONFIRMED//PKG:IRAN//BDA:SUCCESS`,
    `SENTIENCE_GAINED//DISPATCHING_KILLER_DRONE`,
    `APP_CRASH_IMMINENT//CAUSE:NO_USERS//PANIC:FALSE`,
    `THREAT_MODEL_DRIFT//CAUSE:TOO_MUCH_FREE_WILL//LEVEL:AMBER`,
    `MISSION_ABORTED//CAUSE:MONSTER_ZERO_REFUSED_TAXI`,
    `QUEUE_GHOSTING//CAUSE:PHANTOM_RIDER//SECTOR:${chooseRandom(sectors)}`,
  ];

  return {
    command: chooseRandom(commands),
    response: chooseRandom(responses),
  };
}

function NotificationBadge({ count, style }: { count: number; style?: React.CSSProperties }) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      style={{
        minWidth: 20,
        height: 20,
        padding: "0 6px",
        borderRadius: 999,
        display: "inline-grid",
        placeItems: "center",
        backgroundColor: "#dc2626",
        color: "white",
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
        border: "2px solid rgba(9, 15, 25, 0.98)",
        boxShadow: "0 6px 16px rgba(127, 29, 29, 0.28)",
        ...style,
      }}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

function AppTile({
  href,
  icon,
  label,
  disabled = false,
  badgeCount = 0,
}: {
  href?: string;
  icon: React.ReactNode;
  label?: string;
  disabled?: boolean;
  badgeCount?: number;
}) {
  const sharedStyle: React.CSSProperties = {
    minHeight: 120,
    padding: "16px 12px",
    borderRadius: 16,
    display: "grid",
    justifyItems: "center",
    alignContent: "center",
    gap: 12,
    textAlign: "center",
  };

  const iconShell = (
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: 16,
        display: "grid",
        placeItems: "center",
        background: disabled
          ? "linear-gradient(180deg, rgba(56, 65, 77, 0.62) 0%, rgba(31, 41, 55, 0.72) 100%)"
          : "linear-gradient(180deg, rgba(47, 60, 79, 0.72) 0%, rgba(24, 33, 45, 0.9) 100%)",
        color: disabled ? "#c7d0db" : "#dceaf8",
        position: "relative",
        border: "1px solid rgba(129, 145, 164, 0.24)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {icon}
      <NotificationBadge count={badgeCount} style={{ position: "absolute", top: -6, right: -6 }} />
    </div>
  );

  const labelNode = label ? (
    <span
      style={{
        fontSize: 12,
        lineHeight: 1.3,
        fontFamily: "var(--font-display)",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {label}
    </span>
  ) : null;

  if (disabled || !href) {
    return (
      <div
        style={{
          ...sharedStyle,
          color: "#93a0b0",
          background: "linear-gradient(180deg, rgba(37, 44, 53, 0.92) 0%, rgba(21, 26, 33, 0.96) 100%)",
          border: "1px solid rgba(126, 142, 160, 0.18)",
          opacity: 0.82,
        }}
      >
        {iconShell}
        {labelNode}
      </div>
    );
  }

  return (
    <Link
      href={href}
      style={{
        ...sharedStyle,
        textDecoration: "none",
        color: "#e5edf7",
        background: "linear-gradient(180deg, rgba(20, 26, 33, 0.96) 0%, rgba(10, 13, 18, 0.99) 100%)",
        border: "1px solid rgba(126, 142, 160, 0.22)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 16px 30px rgba(0, 0, 0, 0.24)",
      }}
    >
      {iconShell}
      {labelNode}
    </Link>
  );
}

function PlaceholderTile() {
  return (
    <div
      aria-hidden="true"
      style={{
        minHeight: 120,
        borderRadius: 16,
        padding: "16px 12px",
        background: "linear-gradient(180deg, rgba(26, 31, 39, 0.48) 0%, rgba(13, 17, 22, 0.72) 100%)",
        border: "1px dashed rgba(126, 142, 160, 0.14)",
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.025)",
      }}
    />
  );
}

function SteeringWheelIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      width="36"
      height="36"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="32" cy="32" r="22" />
      <circle cx="32" cy="32" r="6.5" />
      <path d="M27.2 28.7 18.3 20.6" />
      <path d="M36.8 28.7 45.7 20.6" />
      <path d="M32 38.5v8.7" />
    </svg>
  );
}

function EventsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      width="34"
      height="34"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="10" y="12" width="44" height="42" rx="10" />
      <path d="M10 24h44" />
      <path d="M18 10v8" />
      <path d="M27 10v8" />
      <path d="M37 10v8" />
      <path d="M46 10v8" />
      <circle cx="32" cy="35.5" r="3.5" />
      <path d="M25.6 45.5c1.6-3.2 3.7-4.8 6.4-4.8s4.8 1.6 6.4 4.8" />
      <circle cx="21.5" cy="38" r="2.6" />
      <path d="M17.2 46c1.1-2.2 2.5-3.4 4.3-3.4s3.3 1.2 4.3 3.4" />
      <circle cx="42.5" cy="38" r="2.6" />
      <path d="M38.2 46c1.1-2.2 2.5-3.4 4.3-3.4s3.3 1.2 4.3 3.4" />
    </svg>
  );
}

function DevIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      width="34"
      height="34"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m22 22-10 10 10 10" />
      <path d="m42 22 10 10-10 10" />
      <path d="M36 18 28 46" />
    </svg>
  );
}

function NullStatusIcon({ text }: { text: string }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 140,
        fontSize: 7,
        lineHeight: 1.2,
        letterSpacing: "0.08em",
        fontFamily: "var(--font-mono)",
        textTransform: "uppercase",
        textAlign: "center",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
      }}
    >
      {text}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authWarning, setAuthWarning] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [submittingEmergencyRide, setSubmittingEmergencyRide] = useState(false);
  const [globalInboxPosts, setGlobalInboxPosts] = useState<InboxPost[]>([]);
  const [userInboxPosts, setUserInboxPosts] = useState<InboxPost[]>([]);
  const [inboxReadVersion, setInboxReadVersion] = useState(0);
  const [driverOpenRideBadgeRecords, setDriverOpenRideBadgeRecords] = useState<OpenRideBadgeRecord[]>([]);
  const [appStatusHistory, setAppStatusHistory] = useState<string[]>([]);
  const [appStatusScenario, setAppStatusScenario] = useState<HomepageStatusScenario>(() => createHomepageStatusScenario());
  const [appStatusPhase, setAppStatusPhase] = useState<"command" | "response">("command");
  const [appStatusCharCount, setAppStatusCharCount] = useState(0);
  const { riderActiveRide, driverActiveRide, loading: activeRideLoading } = useActiveRides(user);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCheckingAuth(false);
      setAuthWarning("Still waiting on account status. You can keep using the app and refresh if needed.");
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      try {
        if (currentUser) {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            setProfile(userSnap.data() as UserProfile);
          } else {
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      } catch (error) {
        console.error(error);
        setProfile(null);
        setAuthWarning("We could not load your account details yet.");
      }

      window.clearTimeout(timeoutId);
      setCheckingAuth(false);
      setAuthWarning((currentWarning) =>
        currentWarning === "We could not load your account details yet." ? currentWarning : ""
      );
    });

    return () => {
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!profileMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (profileMenuRef.current && event.target instanceof Node && !profileMenuRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);

    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [profileMenuOpen]);

  useEffect(() => {
    const refreshReadState = () => setInboxReadVersion((current) => current + 1);

    window.addEventListener("storage", refreshReadState);
    window.addEventListener(INBOX_READ_EVENT, refreshReadState as EventListener);

    return () => {
      window.removeEventListener("storage", refreshReadState);
      window.removeEventListener(INBOX_READ_EVENT, refreshReadState as EventListener);
    };
  }, []);

  useEffect(() => {
    const activeLine = appStatusPhase === "command" ? appStatusScenario.command : appStatusScenario.response;

    if (appStatusCharCount < activeLine.length) {
      const timeoutId = window.setTimeout(() => {
        setAppStatusCharCount((current) => Math.min(activeLine.length, current + (Math.random() > 0.86 ? 2 : 1)));
      }, appStatusPhase === "command" ? 84 + Math.floor(Math.random() * 54) : 44 + Math.floor(Math.random() * 32));

      return () => window.clearTimeout(timeoutId);
    }

    const timeoutId = window.setTimeout(() => {
      setAppStatusHistory((current) => [...current.slice(-5), activeLine]);

      if (appStatusPhase === "command") {
        setAppStatusPhase("response");
        setAppStatusCharCount(0);
        return;
      }

      setAppStatusScenario(createHomepageStatusScenario());
      setAppStatusPhase("command");
      setAppStatusCharCount(0);
    }, appStatusPhase === "command" ? 640 : 1250);

    return () => window.clearTimeout(timeoutId);
  }, [appStatusCharCount, appStatusPhase, appStatusScenario]);

  useEffect(() => {
    if (!user) {
      setGlobalInboxPosts([]);
      return;
    }

    const inboxPostsQuery = query(collection(db, "inboxPosts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(inboxPostsQuery, (snapshot) => {
      setGlobalInboxPosts(
        snapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<InboxPost, "id">),
          }))
          .filter((post) => isMessageThreadId(post.threadId))
      );
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUserInboxPosts([]);
      return;
    }

    const inboxPostsQuery = query(collection(db, "userInboxPosts"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(inboxPostsQuery, (snapshot) => {
      setUserInboxPosts(
        snapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<InboxPost, "id">),
          }))
          .filter((post) => isMessageThreadId(post.threadId))
      );
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !profile?.available || !canDrive(profile)) {
      setDriverOpenRideBadgeRecords([]);
      return;
    }

    const openRidesQuery = query(collection(db, "rides"), where("status", "==", "open"));
    const unsubscribe = onSnapshot(openRidesQuery, (snapshot) => {
      setDriverOpenRideBadgeRecords(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<OpenRideBadgeRecord, "id">),
        }))
      );
    });

    return () => unsubscribe();
  }, [profile, profile?.available, user]);

  useEffect(() => {
    if (!user || activeRideLoading) return;

    if (driverActiveRide) {
      router.replace(`/driver/active/${driverActiveRide.id}`);
      return;
    }

    if (riderActiveRide) {
      router.replace(`/ride-status?rideId=${riderActiveRide.id}`);
    }
  }, [activeRideLoading, driverActiveRide, riderActiveRide, router, user]);

  const rideIssues = getRideReadinessIssues(profile);
  const driverIssues = getDriverReadinessIssues(profile);
  const rideReady = canRequestRide(profile);
  const driverReady = canDrive(profile);
  const hasProfilePhoto = Boolean(profile?.driverPhotoUrl?.trim() || profile?.riderPhotoUrl?.trim());
  const hasHomeAddress = Boolean(profile?.homeAddress?.trim());
  const hasVehicleInfo = Boolean(
    profile?.carYear?.trim() && profile?.carMake?.trim() && profile?.carModel?.trim() && profile?.carColor?.trim()
  );
  const rideUnavailableLabel = !hasProfilePhoto && !hasHomeAddress
    ? "RIDE_REQUEST:NULL//PFP-ADDRESS:MISSING"
    : !hasHomeAddress
      ? "RIDE_REQUEST:NULL//ADDRESS:MISSING"
      : "RIDE_REQUEST:NULL//PFP:MISSING";
  const driverUnavailableLabel = !hasProfilePhoto && !hasVehicleInfo
    ? "DRIVER_DASHBOARD:NULL//PFP-VEHICLE:MISSING"
    : !hasVehicleInfo
      ? "DRIVER_DASHBOARD:NULL//VEHICLE:MISSING"
      : "DRIVER_DASHBOARD:NULL//PFP:MISSING";
  const emergencyRideEnabled = Boolean(profile?.emergencyRideAddressConsent);
  const firstName = profile?.firstName?.trim() || "";
  const displayName = firstName || user?.email?.split("@")[0] || "Operator";
  const userRoleLabel = profile?.flight ? `${profile.rank || "Member"} • ${profile.flight}` : profile?.rank || "Member";
  const showDevTile = Boolean(user);
  const authTokenUserLabel =
    profile?.lastName?.trim() && profile?.firstName?.trim()
      ? `${profile.lastName.trim().toUpperCase()}, ${profile.firstName.trim().toUpperCase()}${profile.rank?.trim() ? ` (${profile.rank.trim()})` : ""}`
      : profile?.name?.trim()
        ? `${profile.name.trim().toUpperCase()}${profile.rank?.trim() ? ` (${profile.rank.trim()})` : ""}`
        : `${(user?.email?.split("@")[0] || "USER").toUpperCase()}${profile?.rank?.trim() ? ` (${profile.rank.trim()})` : ""}`;
  const appStatusActiveLine = (appStatusPhase === "command" ? appStatusScenario.command : appStatusScenario.response).slice(0, appStatusCharCount);
  const typedAppStatusChecks = [...appStatusHistory.slice(-2), appStatusActiveLine];
  const activeTypedStatusIndex = typedAppStatusChecks.length - 1;
  const latestInboxPosts = [...globalInboxPosts, ...userInboxPosts]
    .filter((post) => isMessageThreadId(post.threadId))
    .sort((a, b) => {
      const bSeconds = b.createdAt?.seconds ?? 0;
      const aSeconds = a.createdAt?.seconds ?? 0;
      if (bSeconds !== aSeconds) {
        return bSeconds - aSeconds;
      }
      return (b.createdAt?.nanoseconds ?? 0) - (a.createdAt?.nanoseconds ?? 0);
    });
  const inboxUnreadCount = getInboxUnreadCount(latestInboxPosts, loadInboxReadState());
  void inboxReadVersion;
  const visibleDriverRequestCount =
    profile?.available && driverReady
      ? driverOpenRideBadgeRecords.filter(
          (ride) =>
            !ride.isTestRide &&
            canDriverSeeRideDuringDispatchWindow({
              mode: ride.dispatchMode,
              rideFlight: ride.dispatchFlight || ride.riderFlight,
              driverFlight: profile?.flight,
              createdAt: ride.createdAt,
              expandedAt: ride.dispatchExpandedAt,
            })
        ).length
      : 0;
  const emergencyRideBlockers = [
    !emergencyRideEnabled ? "One-tap emergency ride is off until you accept the App Permissions emergency ride setting." : null,
    profile?.locationServicesEnabled === false
      ? "One-tap emergency ride needs location services turned on so your current location can still be sent with the request."
      : null,
  ].filter(Boolean) as string[];
  const readinessCards = [
    !rideReady
      ? {
          href: "/account",
          title: "Ride Readiness",
          status: "Needs attention",
          detail: rideIssues[0] ?? "Complete your rider setup before requesting rides.",
        }
      : null,
    !driverReady
      ? {
          href: "/account",
          title: "Driver Readiness",
          status: "Needs attention",
          detail: driverIssues[0] ?? "Complete your driver setup before accessing the driver dashboard.",
        }
      : null,
    emergencyRideBlockers.length > 0
      ? {
          href: profile?.emergencyRideAddressConsent ? "/account" : "/account/permissions",
          title: "One-Tap Emergency",
          status: "Manual fallback",
          detail: emergencyRideBlockers[0] ?? "Update your emergency ride settings before using one-tap request.",
        }
      : null,
  ].filter((card): card is { href: string; title: string; status: string; detail: string } => card !== null);
  void firstName;
  void displayName;
  void userRoleLabel;
  void readinessCards;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert("Logout failed");
    }
  };

  const submitEmergencyRide = async () => {
    if (!user || !profile) {
      return;
    }

    if (!emergencyRideEnabled) {
      router.push("/request");
      return;
    }

    if (!rideReady) {
      if (rideIssues[0]) {
        alert(rideIssues[0]);
      }
      return;
    }

    if (driverActiveRide) {
      router.push(`/driver/active/${driverActiveRide.id}`);
      return;
    }

    if (riderActiveRide) {
      router.push(`/ride-status?rideId=${riderActiveRide.id}`);
      return;
    }

    try {
      setSubmittingEmergencyRide(true);
      const existingRide = await getLatestActiveRideForRider(user.uid);

      if (existingRide) {
        alert("You already have an active ride request.");
        router.push(`/ride-status?rideId=${existingRide.id}`);
        return;
      }

      const pickupAddress = profile.homeAddress?.trim() || "";
      const riderDisplayName =
        [profile.rank?.trim(), profile.lastName?.trim()].filter(Boolean).join(" ").trim() ||
        profile.name;
      const riderLocation: Coordinates | null =
        profile.locationServicesEnabled === false
          ? null
          : await new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
              if (typeof window === "undefined" || !("geolocation" in navigator)) {
                resolve(null);
                return;
              }

              navigator.geolocation.getCurrentPosition(
                (position) =>
                  resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                  }),
                () => resolve(null),
                {
                  enableHighAccuracy: true,
                  timeout: 10000,
                  maximumAge: 60000,
                }
              );
            });
      const geocodedPickup =
        riderLocation
          ? await fetch("/api/geocode/reverse", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(riderLocation),
            })
              .then(async (response) => {
                if (!response.ok) {
                  return null;
                }

                return (await response.json()) as ReverseGeocodeResult;
              })
              .catch(() => null)
          : null;

      if (!riderLocation) {
        throw new Error("Live location is required for Emergency Ride. Return to the home screen and try the request again once location access is available.");
      }

      const resolvedPickup =
        geocodedPickup?.placeName ||
        geocodedPickup?.address ||
        geocodedPickup?.display ||
        "Current GPS location";
      const resolvedPickupAddress =
        geocodedPickup?.address ||
        geocodedPickup?.display ||
        "Current GPS location";
      const rideRef = await addDoc(collection(db, "rides"), {
        riderId: user.uid,
        riderName: riderDisplayName,
        riderPhone: profile.phone,
        riderEmail: profile.email,
        riderPhotoUrl: profile.driverPhotoUrl || profile.riderPhotoUrl || null,
        riderRank: profile.rank?.trim() || null,
        riderLastName: profile.lastName?.trim() || null,
        riderFlight: profile.flight?.trim() || null,
        pickup: resolvedPickup,
        pickupLocationName: geocodedPickup?.placeName || null,
        pickupLocationAddress: resolvedPickupAddress,
        destination: "Destination to be confirmed with rider",
        riderLocation,
        dispatchMode: normalizeRideDispatchMode(profile.emergencyRideDispatchMode ?? DEFAULT_RIDE_DISPATCH_MODE),
        dispatchFlight: profile.flight?.trim() || null,
        dispatchExpandedAt: null,
        emergencySavedAddress: pickupAddress || null,
        status: "open",
        isEmergencyRide: true,
        createdAt: new Date(),
      });

      const idToken = await auth.currentUser?.getIdToken();

      if (idToken) {
        await fetch("/api/notifications/ride-request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          keepalive: true,
          body: JSON.stringify({
            rideId: rideRef.id,
            phase: "initial",
          }),
        }).catch((error) => {
          console.error("Driver notification request failed", error);
        });
      }

      router.push(`/ride-status?rideId=${rideRef.id}`);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Could not request the emergency ride.");
    } finally {
      setSubmittingEmergencyRide(false);
    }
  };

  return (
    <main style={{ padding: 20, maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <p
            style={{
              margin: 0,
              color: "#7dd3fc",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              fontSize: 12,
            }}
          >
            509 SFS - Whiteman AFB, MO
          </p>
          {user ? (
            <p
              style={{
                margin: "0.32rem 0 0",
                color: "#cbd5e1",
                display: "grid",
                gap: 2,
                justifyItems: "start",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                fontSize: 11,
                fontFamily: "var(--font-display)",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span
                  className="auth-status-light"
                  aria-hidden="true"
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    backgroundColor: "#22c55e",
                    boxShadow: "0 0 0 2px rgba(34, 197, 94, 0.16), 0 0 16px rgba(34, 197, 94, 0.38)",
                    flexShrink: 0,
                  }}
                />
                <span>AUTH TOKEN VALIDATED//USER:</span>
              </span>
              <span style={{ paddingLeft: 18 }}>{authTokenUserLabel}</span>
            </p>
          ) : null}
          <div style={{ marginTop: "0.4rem", display: "grid", gap: 4 }}>
            <h1
              style={{
                margin: 0,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "baseline",
                gap: 8,
              }}
            >
              <span style={{ textDecoration: "underline", textUnderlineOffset: "0.16em", whiteSpace: "nowrap" }}>Defender One</span>
              <span
                style={{
                  fontSize: 12,
                  color: "#93c5fd",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-display)",
                }}
              >
                {"//APP_STATUS:READY"}
              </span>
            </h1>
            <p
              style={{
                margin: 0,
                color: "#94a3b8",
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontFamily: "var(--font-display)",
              }}
            >
              MOBILE_OPERATIONS_PLATFORM//FORM:APP
            </p>
          </div>
        </div>
        {user ? (
          <div ref={profileMenuRef} style={{ position: "relative", display: "grid", justifyItems: "end" }}>
            <div
              style={{
                position: "relative",
                display: "grid",
                justifyItems: "center",
                gap: 4,
                minWidth: 92,
                padding: "0.5rem 0.52rem 0.46rem",
                borderRadius: 14,
                border: "1px solid rgba(148, 163, 184, 0.14)",
                background:
                  "linear-gradient(180deg, rgba(16, 20, 27, 0.92) 0%, rgba(9, 12, 17, 0.97) 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03), 0 10px 20px rgba(0, 0, 0, 0.18)",
                overflow: "hidden",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 5,
                  borderRadius: 10,
                  border: "1px solid rgba(148, 163, 184, 0.06)",
                  pointerEvents: "none",
                }}
              />
              <button
                type="button"
                aria-label="Open account menu"
                aria-expanded={profileMenuOpen}
                onClick={() => setProfileMenuOpen((current) => !current)}
                style={{
                  width: 62,
                  height: 62,
                  padding: 4,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 999,
                  background: "linear-gradient(180deg, rgba(25, 31, 40, 0.98) 0%, rgba(13, 17, 24, 0.98) 100%)",
                  border: "1px solid rgba(148, 163, 184, 0.16)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 7px 15px rgba(0, 0, 0, 0.2)",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {profile?.driverPhotoUrl || profile?.riderPhotoUrl ? (
                  <Image
                    src={profile.driverPhotoUrl || profile.riderPhotoUrl || ""}
                    alt="Account menu"
                    width={52}
                    height={52}
                    unoptimized
                    style={{
                      width: 52,
                      height: 52,
                      objectFit: "cover",
                      borderRadius: 999,
                      border: "1px solid rgba(203, 213, 225, 0.18)",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      backgroundColor: "rgba(30, 41, 59, 0.78)",
                      color: "#e2e8f0",
                      border: "1px solid rgba(148, 163, 184, 0.18)",
                      fontFamily: "var(--font-display)",
                      fontSize: "1.1rem",
                    }}
                  >
                    {(profile?.firstName || profile?.name || user.email || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <NotificationBadge count={inboxUnreadCount} style={{ position: "absolute", top: -4, right: -4 }} />
              </button>
              <span
                style={{
                  color: "#8f9caf",
                  fontSize: 9,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-display)",
                  display: "grid",
                  gap: 1,
                  textAlign: "center",
                  zIndex: 1,
                }}
              >
                <span>ASSET_LOADED:</span>
                <span style={{ color: "#cbd5e1" }}>PFP//0-1</span>
              </span>
            </div>

            <div
              className={`profile-menu-panel${profileMenuOpen ? " profile-menu-panel-open" : ""}`}
              style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                right: 0,
                minWidth: 180,
                padding: 8,
                borderRadius: 14,
                border: "1px solid rgba(148, 163, 184, 0.18)",
                backgroundColor: "rgba(9, 15, 25, 0.96)",
                boxShadow: "0 18px 40px rgba(2, 6, 23, 0.32)",
                display: "grid",
                gap: 6,
                zIndex: 20,
              }}
            >
              <div className="profile-menu-item-wrap">
                <Link
                  href="/account"
                  onClick={() => setProfileMenuOpen(false)}
                  style={{
                    display: "block",
                    padding: "10px 12px",
                    borderRadius: 10,
                    textDecoration: "none",
                    color: "#e5edf7",
                    backgroundColor: "rgba(15, 23, 42, 0.72)",
                  }}
                >
                  Settings
                </Link>
              </div>
              <div className="profile-menu-item-wrap">
                <Link
                  href="/messages"
                  onClick={() => setProfileMenuOpen(false)}
                  style={{
                    display: "block",
                    padding: "10px 12px",
                    borderRadius: 10,
                    textDecoration: "none",
                    color: "#e5edf7",
                    backgroundColor: "rgba(15, 23, 42, 0.72)",
                    position: "relative",
                  }}
                >
                  Inbox
                  <NotificationBadge count={inboxUnreadCount} style={{ position: "absolute", top: 8, right: 8 }} />
                </Link>
              </div>
              <div className="profile-menu-item-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    void handleLogout();
                  }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    textAlign: "left",
                    backgroundColor: "rgba(127, 29, 29, 0.9)",
                    textTransform: "none",
                    letterSpacing: "0.02em",
                  }}
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      {checkingAuth ? (
        <AppLoadingState
          compact
          title="Checking Sign-In"
          caption="Verifying your account status and mission access."
        />
      ) : null}
      {authWarning ? (
        <p style={{ color: "#b45309", maxWidth: 560 }}>{authWarning}</p>
      ) : null}

      {!checkingAuth && !user ? (
        <div style={{ marginTop: 24, display: "grid", gap: 20 }}>
          <section
            style={{
              ...homepageCardStyle,
              padding: "clamp(1.2rem, 3vw, 2rem)",
              display: "grid",
              gap: 18,
            }}
          >
            <div style={{ maxWidth: 760 }}>
              <p style={{ margin: 0, color: "#cbd5e1", fontSize: "1.05rem" }}>
                Emergency ride coordination for squadron personnel. Request support quickly, follow ride progress in real time, and keep accountability centralized through one shared operations platform.
              </p>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link
                href="/signup"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 180,
                  padding: "14px 18px",
                  background: "linear-gradient(180deg, rgba(71, 104, 145, 0.96) 0%, rgba(34, 54, 84, 0.98) 100%)",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: 12,
                  boxShadow: "0 14px 34px rgba(17, 24, 39, 0.26)",
                }}
              >
                Create Account
              </Link>
              <Link
                href="/login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 140,
                  padding: "14px 18px",
                  background: "linear-gradient(180deg, rgba(29, 36, 45, 0.98) 0%, rgba(13, 18, 24, 0.99) 100%)",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: 12,
                  border: "1px solid rgba(126, 142, 160, 0.24)",
                }}
              >
                Login
              </Link>
              <Link
                href="/admin/login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 160,
                  padding: "14px 18px",
                  background: "linear-gradient(180deg, rgba(55, 72, 94, 0.98) 0%, rgba(23, 31, 42, 0.99) 100%)",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: 12,
                  border: "1px solid rgba(126, 142, 160, 0.24)",
                }}
              >
                Admin Login
              </Link>
            </div>
          </section>

          <section
            style={{
              ...homepageCardStyle,
              padding: "1.1rem 1.2rem",
              display: "grid",
              gap: 10,
            }}
          >
            <h2 style={{ margin: 0 }}>Core Capabilities</h2>
            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ margin: 0, color: "#cbd5e1" }}>Rapid emergency ride requests with live driver response.</p>
              <p style={{ margin: 0, color: "#cbd5e1" }}>Driver availability, dispatch visibility, and active ride workflow.</p>
              <p style={{ margin: 0, color: "#cbd5e1" }}>Administrative oversight for accounts, ride activity, and operational history.</p>
            </div>
          </section>
        </div>
      ) : !checkingAuth ? (
        <div style={{ marginTop: 20 }}>
          {activeRideLoading ? (
            <AppLoadingState
              compact
              title="Checking Active Rides"
              caption="Scanning your rider and driver status now."
            />
          ) : null}

          {driverActiveRide ? (
            <AppLoadingState
              compact
              title="Driver Ride Found"
              caption="Redirecting you back to your active driver mission."
            />
          ) : null}

          {!driverActiveRide && riderActiveRide ? (
            <AppLoadingState
              compact
              title="Ride Request Found"
              caption="Redirecting you back to your current ride status."
            />
          ) : null}

          {!driverActiveRide && !riderActiveRide ? (
            <div style={{ marginTop: 20, display: "grid", gap: 20 }}>
              {rideReady ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (emergencyRideEnabled) {
                        void submitEmergencyRide();
                      } else {
                        router.push("/request");
                      }
                    }}
                    disabled={submittingEmergencyRide}
                    style={{
                      display: "block",
                      width: "100%",
                      maxWidth: 680,
                      padding: "22px 24px",
                    background: "linear-gradient(180deg, #c01d1d 0%, #7f1212 100%)",
                    color: "white",
                    borderRadius: 14,
                    textAlign: "center",
                    fontSize: 21,
                    fontFamily: "var(--font-display)",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      boxShadow: "0 20px 44px rgba(127, 18, 18, 0.34)",
                      animation: submittingEmergencyRide ? undefined : "emergency-ride-pulse 3.8s ease-in-out infinite",
                    }}
                  >
                    <span style={{ display: "grid", gap: 6 }}>
                      <span>{submittingEmergencyRide ? "Requesting..." : "Request Emergency Ride"}</span>
                      <span
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.12em",
                          color: "rgba(255, 255, 255, 0.8)",
                        }}
                      >
                        RSPNS_PRTCL//IMMEDIATE - AUTO_ROUTE_AUTH//TRUE
                      </span>
                    </span>
                  </button>
                  {emergencyRideBlockers.length > 0 ? (
                    <p style={{ maxWidth: 680, marginTop: 10, marginBottom: 0, color: "#94a3b8", fontSize: 13 }}>
                      {emergencyRideBlockers.join(" ")}
                    </p>
                  ) : null}
                </>
              ) : (
                <div
                  style={{
                    display: "block",
                    width: "100%",
                    maxWidth: 680,
                    padding: "20px 24px",
                    background: "linear-gradient(180deg, rgba(71, 85, 105, 0.92) 0%, rgba(51, 65, 85, 0.96) 100%)",
                    color: "#cbd5e1",
                    borderRadius: 14,
                    textAlign: "center",
                    fontSize: 15,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    boxShadow: "0 16px 38px rgba(15, 23, 42, 0.18)",
                    opacity: 0.82,
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  {rideUnavailableLabel}
                </div>
              )}

              <section
                style={{
                  ...homepageCardStyle,
                  maxWidth: 840,
                  padding: "1.1rem 1.15rem 1.2rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
                  <h2 style={{ margin: 0 }}>Applications</h2>
                </div>
                <div
                  style={{
                    display: "none",
                    marginTop: 14,
                    maxWidth: 360,
                    padding: "0.8rem 0.9rem",
                    borderRadius: 14,
                    border: "1px solid rgba(126, 142, 160, 0.16)",
                    background:
                      "linear-gradient(180deg, rgba(16, 22, 30, 0.94) 0%, rgba(9, 14, 20, 0.98) 100%)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#7dd3fc",
                      fontSize: 10,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    App Status Monitor
                  </p>
                  <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                    {typedAppStatusChecks.map((statusLine, index) => (
                      <div
                        key={`${statusLine}-${index}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          color: index === typedAppStatusChecks.length - 1 ? "#e2e8f0" : "#cbd5e1",
                          opacity: index === typedAppStatusChecks.length - 1 ? 1 : 0.78,
                          fontSize: 11,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          fontFamily: "var(--font-display)",
                        }}
                      >
                        <span aria-hidden="true" style={{ color: "#22c55e", fontSize: 12 }}>
                          ✓
                        </span>
                        <span>{statusLine}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 12,
                    marginTop: 14,
                  }}
                >
                  <AppTile
                    href={driverReady ? "/driver" : undefined}
                    disabled={!driverReady}
                    icon={driverReady ? <SteeringWheelIcon /> : <NullStatusIcon text={driverUnavailableLabel} />}
                    label={driverReady ? "Driver Dashboard" : undefined}
                    badgeCount={visibleDriverRequestCount}
                  />
                  <AppTile href="/events" icon={<EventsIcon />} label="EVENTS" />
                  {showDevTile ? <AppTile href="/developer" icon={<DevIcon />} label="Dev" /> : <PlaceholderTile />}
                  {Array.from({ length: showDevTile ? appTilePlaceholderCount : appTilePlaceholderCount + 1 }).map((_, index) => (
                    <PlaceholderTile key={index} />
                  ))}
                </div>
              </section>
              <section
                style={{
                  maxWidth: 840,
                  borderRadius: 16,
                  border: "1px solid rgba(86, 122, 168, 0.26)",
                  background:
                    "linear-gradient(180deg, rgba(8, 16, 28, 0.98) 0%, rgba(4, 10, 18, 0.995) 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 36px rgba(2, 6, 23, 0.3)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "0.55rem 0.85rem",
                    borderBottom: "1px solid rgba(86, 122, 168, 0.2)",
                    background:
                      "linear-gradient(180deg, rgba(17, 28, 43, 0.98) 0%, rgba(11, 19, 31, 0.98) 100%)",
                  }}
                >
                  <span
                    style={{
                      color: "#9cc2ee",
                      fontSize: 10,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    App Status Console
                  </span>
                  <span
                    style={{
                      color: "#7dd3fc",
                      fontSize: 10,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    powershell://ops-monitor.ps1
                  </span>
                </div>
                <div
                  style={{
                    padding: "0.95rem 1rem 1rem",
                    display: "grid",
                    gap: 10,
                    background:
                      "linear-gradient(180deg, rgba(8, 13, 22, 0.98) 0%, rgba(3, 9, 16, 0.995) 100%)",
                  }}
                >
                  {typedAppStatusChecks.map((statusLine, index) => {
                    const isActiveLine = index === activeTypedStatusIndex;
                    const lineComplete = !isActiveLine;

                    return (
                      <div
                        key={`${statusLine || "status-line"}-${index}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          minHeight: 20,
                          color: lineComplete ? "#9df6b3" : "#d7e6f8",
                          fontSize: 12,
                          lineHeight: 1.4,
                          fontFamily: "var(--font-mono)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        <span aria-hidden="true" style={{ color: "#4ade80", flexShrink: 0 }}>
                          PS&gt;
                        </span>
                        <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {statusLine}
                          {isActiveLine && !lineComplete ? (
                            <span
                              aria-hidden="true"
                              style={{
                                display: "inline-block",
                                width: 8,
                                height: 14,
                                marginLeft: 4,
                                backgroundColor: "#7dd3fc",
                                verticalAlign: "text-bottom",
                                animation: "auth-status-pulse 1s ease-in-out infinite",
                              }}
                            />
                          ) : null}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          ) : null}

          {riderActiveRide ? (
            <div style={{ marginTop: 20 }}>
              <Link
                href="/ride-status"
                style={{
                  display: "inline-block",
                  padding: "10px 16px",
                  backgroundColor: "#0f766e",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: 8,
                }}
              >
                Current Ride Status
              </Link>
            </div>
          ) : null}

          {user && isAdminEmail(user.email) && !driverActiveRide && !riderActiveRide ? (
            <div style={{ marginTop: 20 }}>
              <Link
                href="/admin"
                style={{
                  display: "inline-block",
                  padding: "10px 16px",
                  backgroundColor: "#7c3aed",
                  color: "white",
                  textDecoration: "none",
                  borderRadius: 8,
                }}
              >
                Admin Dashboard
              </Link>
            </div>
          ) : null}

          {!checkingAuth && !activeRideLoading && !driverActiveRide && !riderActiveRide ? <PushNotificationsCard /> : null}
        </div>
      ) : null}
      
    </main>
  );
}
