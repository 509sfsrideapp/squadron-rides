"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DeveloperBackLink from "../../components/DeveloperBackLink";

type ObstacleType = "car" | "barrier" | "cone";
type GamePhase = "menu" | "playing" | "crashed";

type Obstacle = {
  id: number;
  lane: 0 | 1 | 2;
  y: number;
  type: ObstacleType;
  nearMissed?: boolean;
  color?: string;
};

type GameSnapshot = {
  phase: GamePhase;
  playerX: number;
  drift: number;
  speed: number;
  distance: number;
  score: number;
  elapsed: number;
  bac: number;
  reactionLag: number;
  controlRating: number;
  nearMisses: number;
  obstacles: Obstacle[];
  crashReason: string;
  bestScore: number;
};

type GameWorld = GameSnapshot & {
  input: number;
  brakeHeld: boolean;
  spawnIn: number;
  obstacleId: number;
  steeringVelocity: number;
};

type OrientationPermissionApi = {
  requestPermission?: () => Promise<"granted" | "denied">;
};

const STORAGE_KEY = "driving-sim-best-score";
const LANE_CENTERS = [20, 50, 80] as const;
const PLAYER_ZONE_TOP = 71;
const PLAYER_ZONE_BOTTOM = 92;
const OBSTACLE_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#a855f7"];

function loadBestScore() {
  if (typeof window === "undefined") {
    return 0;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function persistBestScore(value: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, String(Math.round(value)));
}

function createInitialWorld(bestScore = 0): GameWorld {
  return {
    phase: "menu",
    playerX: 50,
    drift: 0,
    speed: 54,
    distance: 0,
    score: 0,
    elapsed: 0,
    bac: 0.16,
    reactionLag: 420,
    controlRating: 18,
    nearMisses: 0,
    obstacles: [],
    crashReason: "",
    bestScore,
    input: 0,
    brakeHeld: false,
    spawnIn: 0.9,
    obstacleId: 1,
    steeringVelocity: 0,
  };
}

function getLaneCenter(lane: 0 | 1 | 2) {
  return LANE_CENTERS[lane];
}

function getCrashReason(type: ObstacleType) {
  if (type === "barrier") {
    return "You clipped the guardrail and lost the car.";
  }

  if (type === "cone") {
    return "You drifted off the lane and hit the shoulder markers.";
  }

  return "You collided with traffic ahead.";
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString();
}

function DrivingSimHud({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div
      style={{
        padding: "0.8rem 0.95rem",
        borderRadius: 18,
        border: "1px solid rgba(148, 163, 184, 0.18)",
        background: "rgba(6, 10, 18, 0.78)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 16px 30px rgba(2, 6, 23, 0.22)",
      }}
    >
      <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7dd3fc" }}>
        {label}
      </p>
      <p
        style={{
          margin: "0.28rem 0 0",
          fontFamily: "var(--font-display)",
          fontSize: "1.2rem",
          letterSpacing: "0.05em",
          color: accent || "#f8fbff",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function CarSprite({ color, player = false }: { color: string; player?: boolean }) {
  return (
    <svg viewBox="0 0 100 180" width="100%" height="100%" aria-hidden="true">
      <defs>
        <linearGradient id={`carBody-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.9" />
          <stop offset="12%" stopColor={color} />
          <stop offset="100%" stopColor={player ? "#020617" : "#111827"} />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="157" rx="28" ry="13" fill={player ? "rgba(96,165,250,0.34)" : "rgba(15,23,42,0.4)"} />
      <rect x="16" y="18" width="68" height="144" rx="24" fill={`url(#carBody-${color.replace("#", "")})`} stroke="rgba(255,255,255,0.18)" />
      <rect x="27" y="28" width="46" height="30" rx="14" fill="rgba(191,219,254,0.92)" />
      <rect x="24" y="70" width="52" height="55" rx="16" fill="rgba(15,23,42,0.92)" stroke="rgba(255,255,255,0.08)" />
      <rect x="8" y="36" width="12" height="30" rx="5" fill="rgba(30,41,59,0.95)" />
      <rect x="80" y="36" width="12" height="30" rx="5" fill="rgba(30,41,59,0.95)" />
      <rect x="10" y="115" width="12" height="30" rx="5" fill="rgba(30,41,59,0.95)" />
      <rect x="78" y="115" width="12" height="30" rx="5" fill="rgba(30,41,59,0.95)" />
      <rect x="20" y="150" width="15" height="6" rx="3" fill="#fca5a5" />
      <rect x="65" y="150" width="15" height="6" rx="3" fill="#fca5a5" />
    </svg>
  );
}

function BarrierSprite() {
  return (
    <svg viewBox="0 0 110 74" width="100%" height="100%" aria-hidden="true">
      <rect x="7" y="12" width="96" height="50" rx="12" fill="#f97316" stroke="rgba(255,255,255,0.18)" />
      <rect x="16" y="20" width="24" height="34" rx="4" fill="rgba(255,255,255,0.82)" />
      <rect x="44" y="20" width="22" height="34" rx="4" fill="#ea580c" />
      <rect x="70" y="20" width="24" height="34" rx="4" fill="rgba(255,255,255,0.82)" />
      <ellipse cx="55" cy="64" rx="40" ry="7" fill="rgba(124,45,18,0.35)" />
    </svg>
  );
}

function ConeSprite() {
  return (
    <svg viewBox="0 0 70 96" width="100%" height="100%" aria-hidden="true">
      <ellipse cx="35" cy="85" rx="24" ry="7" fill="rgba(124,45,18,0.3)" />
      <path d="M35 10 54 68H16L35 10Z" fill="#f97316" stroke="rgba(255,255,255,0.18)" />
      <path d="M28 34h14l5 12H23l5-12Z" fill="rgba(255,255,255,0.9)" />
      <rect x="15" y="68" width="40" height="10" rx="5" fill="#7c2d12" />
    </svg>
  );
}

function renderObstacle(obstacle: Obstacle) {
  const laneCenter = getLaneCenter(obstacle.lane);
  const scale = 0.68 + (obstacle.y / 100) * 0.62;
  const width = obstacle.type === "cone" ? 42 : obstacle.type === "barrier" ? 72 : 74;
  const height = obstacle.type === "cone" ? 56 : obstacle.type === "barrier" ? 46 : 122;
  const shadow =
    obstacle.type === "car"
      ? "rgba(15, 23, 42, 0.5)"
      : obstacle.type === "barrier"
        ? "rgba(249, 115, 22, 0.26)"
        : "rgba(217, 119, 6, 0.25)";

  return (
    <div
      key={obstacle.id}
      style={{
        position: "absolute",
        left: `${laneCenter}%`,
        top: `${obstacle.y}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        width,
        height,
        filter: `drop-shadow(0 14px 22px ${shadow})`,
      }}
    >
      {obstacle.type === "car" ? <CarSprite color={obstacle.color || "#ef4444"} /> : obstacle.type === "barrier" ? <BarrierSprite /> : <ConeSprite />}
    </div>
  );
}

export default function DrivingSimClient() {
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => createInitialWorld(loadBestScore()));
  const [isLandscape, setIsLandscape] = useState(false);
  const [tiltAvailable, setTiltAvailable] = useState(false);
  const [tiltGranted, setTiltGranted] = useState(false);
  const [tiltPrompt, setTiltPrompt] = useState("Tilt your phone to steer. Keyboard still works on desktop.");
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const worldRef = useRef<GameWorld>(createInitialWorld(loadBestScore()));
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const tiltBaselineRef = useRef<number | null>(null);
  const tiltAxisRef = useRef<"gamma" | "beta" | null>(null);

  const enterPlayMode = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell || typeof document === "undefined") {
      return;
    }

    try {
      if (!document.fullscreenElement) {
        await shell.requestFullscreen();
      }
    } catch {
      // Ignore unsupported fullscreen requests.
    }

    try {
      const orientationApi = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
      if (orientationApi.lock) {
        await orientationApi.lock("landscape");
      }
    } catch {
      // Ignore unsupported orientation locks.
    }
  }, []);

  const requestTiltAccess = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    const orientationCtor = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & OrientationPermissionApi;

    if (!orientationCtor) {
      setTiltPrompt("Tilt steering is not supported on this device. Keyboard fallback is still available.");
      return;
    }

    setTiltAvailable(true);

    if (typeof orientationCtor.requestPermission === "function") {
      try {
        const result = await orientationCtor.requestPermission();
        if (result === "granted") {
          tiltBaselineRef.current = null;
          tiltAxisRef.current = null;
          setTiltGranted(true);
          setTiltPrompt("Tilt steering armed. Hold the phone level for a second so it can calibrate.");
        } else {
          setTiltPrompt("Tilt permission was denied. Steering will fall back to keyboard only.");
        }
      } catch {
        setTiltPrompt("Tilt permission could not be enabled. Keyboard fallback is still available.");
      }
    } else {
      tiltBaselineRef.current = null;
      tiltAxisRef.current = null;
      setTiltGranted(true);
      setTiltPrompt("Tilt steering armed. Hold the phone level for a second so it can calibrate.");
    }
  }, []);

  const startGame = useCallback(async () => {
    const best = worldRef.current.bestScore || loadBestScore();
    const nextWorld = createInitialWorld(best);
    nextWorld.phase = "playing";
    worldRef.current = nextWorld;
    lastTimeRef.current = null;
    setSnapshot({ ...nextWorld });
    await requestTiltAccess();
    await enterPlayMode();
  }, [enterPlayMode, requestTiltAccess]);

  const syncViewportMode = () => {
    if (typeof window === "undefined") {
      return;
    }

    setIsLandscape(window.innerWidth > window.innerHeight);
    setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
  };

  const exitPlayMode = async () => {
    try {
      const orientationApi = screen.orientation as ScreenOrientation & { unlock?: () => void };
      orientationApi.unlock?.();
    } catch {
      // Ignore unsupported orientation unlocks.
    }

    if (typeof document !== "undefined" && document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Ignore unsupported fullscreen exits.
      }
    }
  };

  useEffect(() => {
    worldRef.current.bestScore = loadBestScore();
    setSnapshot({ ...worldRef.current });
    syncViewportMode();

    const handleResize = () => syncViewportMode();
    const handleFullscreen = () => setFullscreenActive(Boolean(document.fullscreenElement));

    window.addEventListener("resize", handleResize);
    document.addEventListener("fullscreenchange", handleFullscreen);

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("fullscreenchange", handleFullscreen);
    };
  }, [startGame]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const world = worldRef.current;

      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        world.input = -1;
      }

      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        world.input = 1;
      }

      if (event.key === "ArrowDown" || event.key === " ") {
        event.preventDefault();
        world.brakeHeld = true;
      }

      if (event.key === "Enter" && world.phase !== "playing") {
        void startGame();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const world = worldRef.current;

      if (
        (event.key === "ArrowLeft" || event.key.toLowerCase() === "a" || event.key === "ArrowRight" || event.key.toLowerCase() === "d") &&
        ((event.key === "ArrowLeft" || event.key.toLowerCase() === "a") ? world.input < 0 : world.input > 0)
      ) {
        world.input = 0;
      }

      if (event.key === "ArrowDown" || event.key === " ") {
        world.brakeHeld = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [startGame]);

  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (!tiltGranted) {
        return;
      }

      const gamma = event.gamma ?? 0;
      const beta = event.beta ?? 0;

      if (!tiltAxisRef.current) {
        tiltAxisRef.current = Math.abs(gamma) > Math.abs(beta) ? "gamma" : "beta";
      }

      const reading = tiltAxisRef.current === "gamma" ? gamma : beta;

      if (tiltBaselineRef.current == null) {
        tiltBaselineRef.current = reading;
        setTiltPrompt("Tilt calibrated. Keep the phone level to stay centered.");
      }

      const normalized = Math.max(-1, Math.min(1, (reading - tiltBaselineRef.current) / 16));
      worldRef.current.input = normalized;
    };

    if (tiltGranted) {
      window.addEventListener("deviceorientation", handleOrientation);
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, [tiltGranted]);

  useEffect(() => {
    if (snapshot.phase === "playing" && !isLandscape) {
      void exitPlayMode();
    }
  }, [isLandscape, snapshot.phase]);

  useEffect(() => {
    const tick = (now: number) => {
      if (lastTimeRef.current == null) {
        lastTimeRef.current = now;
      }

      const dt = Math.min(0.032, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;
      const world = worldRef.current;

      if (world.phase === "playing") {
        world.elapsed += dt;
        const distanceFactor = world.distance / 120;
        world.bac = Math.min(0.24, 0.16 + world.elapsed * 0.0026);
        world.reactionLag = Math.round(370 + world.bac * 820 + Math.sin(world.elapsed * 0.8) * 40);
        world.controlRating = Math.max(4, Math.round(30 - world.bac * 62 - world.elapsed * 0.45));

        const driftWave =
          Math.sin(world.elapsed * 1.45) * 4.2 +
          Math.sin(world.elapsed * 0.46 + 1.2) * 1.9 +
          Math.sin(world.elapsed * 3.6) * 0.85;
        world.drift = driftWave;

        const targetSteering = world.input * 24;
        world.steeringVelocity += (targetSteering - world.steeringVelocity) * dt * 2;
        world.playerX += (world.steeringVelocity + world.drift * 0.36) * dt;
        world.playerX = Math.max(13, Math.min(87, world.playerX));

        const targetSpeed = 56 + distanceFactor * 4.8;
        const brakePenalty = world.brakeHeld ? 32 : 0;
        world.speed += (targetSpeed - brakePenalty - world.speed) * dt * 2.1;
        world.distance += world.speed * dt * 0.92;
        world.score = world.distance + world.nearMisses * 70;

        world.spawnIn -= dt;
        if (world.spawnIn <= 0) {
          const pool: ObstacleType[] = ["car", "car", "barrier", "cone"];
          const type = pool[Math.floor(Math.random() * pool.length)];
          const lane = Math.floor(Math.random() * 3) as 0 | 1 | 2;
          world.obstacles.push({
            id: world.obstacleId,
            lane,
            y: -18,
            type,
            color: OBSTACLE_COLORS[Math.floor(Math.random() * OBSTACLE_COLORS.length)],
          });
          world.obstacleId += 1;
          world.spawnIn = Math.max(0.36, 1.02 - world.speed / 118 + Math.random() * 0.28);
        }

        world.obstacles = world.obstacles
          .map((obstacle) => {
            const nextY = obstacle.y + world.speed * dt * (obstacle.type === "cone" ? 1.04 : 0.86);
            const laneCenter = getLaneCenter(obstacle.lane);
            const laneDistance = Math.abs(world.playerX - laneCenter);

            if (!obstacle.nearMissed && nextY > PLAYER_ZONE_BOTTOM + 5 && laneDistance > 8 && laneDistance < 18) {
              obstacle.nearMissed = true;
              world.nearMisses += 1;
              world.score += 40;
            }

            if (nextY > PLAYER_ZONE_TOP && nextY < PLAYER_ZONE_BOTTOM && laneDistance < (obstacle.type === "cone" ? 8 : 11.5)) {
              world.phase = "crashed";
              world.crashReason = getCrashReason(obstacle.type);
              world.bestScore = Math.max(world.bestScore, world.score);
              persistBestScore(world.bestScore);

              if ("vibrate" in navigator) {
                navigator.vibrate?.([100, 35, 120]);
              }

              void exitPlayMode();
            }

            return { ...obstacle, y: nextY };
          })
          .filter((obstacle) => obstacle.y < 122);
      }

      setSnapshot({
        phase: world.phase,
        playerX: world.playerX,
        drift: world.drift,
        speed: world.speed,
        distance: world.distance,
        score: world.score,
        elapsed: world.elapsed,
        bac: world.bac,
        reactionLag: world.reactionLag,
        controlRating: world.controlRating,
        nearMisses: world.nearMisses,
        obstacles: world.obstacles,
        crashReason: world.crashReason,
        bestScore: world.bestScore,
      });

      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const impairmentBlur = Math.min(7, 1.2 + snapshot.bac * 18);
  const distortionRotation = Math.sin(snapshot.elapsed * 0.58) * 0.65;
  const shellStyle = fullscreenActive
    ? {
        position: "fixed" as const,
        inset: 0,
        zIndex: 120,
        padding: 0,
        maxWidth: "none",
        borderRadius: 0,
      }
    : {};

  const tiltText = useMemo(() => {
    if (!isTouchDevice) {
      return "Desktop fallback stays on keyboard steering.";
    }

    if (!tiltAvailable) {
      return "Phone tilt steering will activate after you start.";
    }

    return tiltPrompt;
  }, [isTouchDevice, tiltAvailable, tiltPrompt]);

  return (
    <main style={{ padding: fullscreenActive ? 0 : 20 }}>
      {!fullscreenActive ? <DeveloperBackLink /> : null}

      <section
        ref={shellRef}
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: fullscreenActive ? 0 : "clamp(1rem, 2vw, 1.4rem)",
          borderRadius: fullscreenActive ? 0 : 28,
          border: fullscreenActive ? "none" : "1px solid rgba(96, 165, 250, 0.18)",
          background:
            "radial-gradient(circle at top, rgba(37, 99, 235, 0.16), transparent 24%), linear-gradient(180deg, rgba(7, 12, 22, 0.98) 0%, rgba(2, 5, 10, 0.99) 100%)",
          boxShadow: fullscreenActive ? "none" : "0 28px 80px rgba(2, 6, 23, 0.42)",
          minHeight: fullscreenActive ? "100dvh" : undefined,
          ...shellStyle,
        }}
      >
        <div
          style={{
            display: fullscreenActive ? "none" : "flex",
            justifyContent: "space-between",
            gap: 18,
            flexWrap: "wrap",
            alignItems: "flex-start",
            marginBottom: 18,
          }}
        >
          <div style={{ maxWidth: 620 }}>
            <p style={{ margin: 0, color: "#7dd3fc", letterSpacing: "0.16em", textTransform: "uppercase", fontSize: 12 }}>
              Dev Prototype
            </p>
            <h1 style={{ margin: "0.45rem 0 0.65rem" }}>Impairment Driving Simulator</h1>
            <p style={{ margin: 0, color: "#cbd5e1", maxWidth: 620 }}>
              A dev-only awareness sim built to show how fast control, reaction, and judgment collapse under impairment. It should feel sharp, tense, and ugly in exactly the way it needs to.
            </p>
          </div>

          <div
            style={{
              minWidth: 280,
              padding: 16,
              borderRadius: 20,
              border: "1px solid rgba(148, 163, 184, 0.16)",
              background: "rgba(8, 14, 24, 0.78)",
            }}
          >
            <p style={{ margin: 0, color: "#7dd3fc", letterSpacing: "0.14em", textTransform: "uppercase", fontSize: 12 }}>
              Controls
            </p>
            <p style={{ margin: "0.55rem 0 0", color: "#e2e8f0" }}>Rotate phone horizontal for full-screen play.</p>
            <p style={{ margin: "0.2rem 0 0", color: "#e2e8f0" }}>{tiltText}</p>
            <p style={{ margin: "0.2rem 0 0", color: "#94a3b8", fontSize: 13 }}>
              Rotate back upright and the game releases fullscreen automatically.
            </p>
            <button
              type="button"
              onClick={() => void enterPlayMode()}
              style={{
                width: "100%",
                marginTop: 12,
                minHeight: 48,
                borderRadius: 16,
                background: "linear-gradient(180deg, rgba(37, 99, 235, 0.92) 0%, rgba(30, 64, 175, 0.98) 100%)",
              }}
            >
              Enter Full Screen
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: fullscreenActive ? "minmax(0, 1fr)" : "minmax(0, 1fr) 310px",
            gap: fullscreenActive ? 0 : 18,
            minHeight: fullscreenActive ? "100dvh" : undefined,
          }}
        >
          <div
            style={{
              position: "relative",
              minHeight: fullscreenActive ? "100dvh" : 720,
              overflow: "hidden",
              borderRadius: fullscreenActive ? 0 : 28,
              border: fullscreenActive ? "none" : "1px solid rgba(148, 163, 184, 0.16)",
              background:
                "linear-gradient(180deg, #58a6ff 0%, #7dd3fc 16%, #9fd6ff 28%, #1f2937 28%, #111827 100%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at 50% 12%, rgba(255,255,255,0.38), transparent 12%), linear-gradient(180deg, rgba(255,255,255,0.12), transparent 16%)",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                position: "absolute",
                inset: fullscreenActive ? "2% 2.5% 0" : "7% 8% 10%",
                borderRadius: fullscreenActive ? 0 : 28,
                overflow: "hidden",
                transform: `perspective(1100px) rotateX(${fullscreenActive ? 64 : 61}deg) rotateZ(${distortionRotation}deg)`,
                transformOrigin: "center bottom",
                background: "linear-gradient(180deg, #1f2937 0%, #0f172a 14%, #111827 100%)",
                boxShadow: `0 18px 42px rgba(2, 6, 23, 0.5), 0 0 0 1px rgba(148, 163, 184, 0.12) inset`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "-18%",
                  top: 0,
                  bottom: 0,
                  width: "18%",
                  background: "linear-gradient(180deg, #14532d 0%, #166534 100%)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: "-18%",
                  top: 0,
                  bottom: 0,
                  width: "18%",
                  background: "linear-gradient(180deg, #14532d 0%, #166534 100%)",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  left: "7.5%",
                  right: "7.5%",
                  top: 0,
                  bottom: 0,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.12), transparent 12%), linear-gradient(180deg, #334155 0%, #1f2937 12%, #111827 100%)",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  left: "9.5%",
                  width: 8,
                  top: "-12%",
                  bottom: "-12%",
                  background: "rgba(255,255,255,0.95)",
                  opacity: 0.85,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: "9.5%",
                  width: 8,
                  top: "-12%",
                  bottom: "-12%",
                  background: "rgba(255,255,255,0.95)",
                  opacity: 0.85,
                }}
              />

              {[33.33, 66.66].map((divider) => (
                <div
                  key={divider}
                  style={{
                    position: "absolute",
                    top: "-18%",
                    bottom: "-18%",
                    left: `${divider}%`,
                    width: 6,
                    background: "repeating-linear-gradient(180deg, rgba(255,255,120,0.95) 0 4.8%, transparent 4.8% 11.8%)",
                    backgroundSize: "100% 150%",
                    backgroundPositionY: `${snapshot.distance * 2.2}px`,
                    opacity: 0.9,
                  }}
                />
              ))}

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  boxShadow: `0 0 ${12 + impairmentBlur * 2}px rgba(255,255,255,0.09) inset`,
                  backdropFilter: `blur(${impairmentBlur}px)`,
                  opacity: 0.18,
                  pointerEvents: "none",
                }}
              />

              {snapshot.obstacles.map((obstacle) => renderObstacle(obstacle))}

              <div
                style={{
                  position: "absolute",
                  left: `${snapshot.playerX}%`,
                  top: "79%",
                  transform: `translate(-50%, -50%) rotate(${snapshot.drift * 0.5}deg)`,
                  width: 88,
                  height: 146,
                  zIndex: 4,
                  filter: "drop-shadow(0 22px 28px rgba(59,130,246,0.32))",
                }}
              >
                <CarSprite color="#60a5fa" player />
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                left: 16,
                top: 16,
                display: "grid",
                gap: 10,
                maxWidth: fullscreenActive ? 210 : 280,
                zIndex: 6,
              }}
            >
              <DrivingSimHud label="Score" value={`${formatNumber(snapshot.score)} pts`} accent="#f8fbff" />
              <DrivingSimHud label="Speed" value={`${snapshot.speed.toFixed(0)} mph`} accent="#fde68a" />
              <DrivingSimHud label="BAC" value={snapshot.bac.toFixed(2)} accent="#fecaca" />
            </div>

            <div
              style={{
                position: "absolute",
                right: 16,
                top: 16,
                display: "grid",
                gap: 10,
                maxWidth: fullscreenActive ? 220 : 290,
                zIndex: 6,
              }}
            >
              <DrivingSimHud label="Reaction Delay" value={`${snapshot.reactionLag} ms`} accent="#fde68a" />
              <DrivingSimHud label="Control" value={`${snapshot.controlRating}%`} accent="#fca5a5" />
              <DrivingSimHud label="Near Misses" value={String(snapshot.nearMisses)} accent="#c4b5fd" />
            </div>

            {snapshot.phase !== "playing" || (isTouchDevice && !isLandscape) ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  padding: 24,
                  background: "linear-gradient(180deg, rgba(2, 6, 23, 0.36) 0%, rgba(2, 6, 23, 0.82) 100%)",
                  backdropFilter: "blur(10px)",
                  zIndex: 7,
                }}
              >
                <div
                  style={{
                    width: "min(100%, 36rem)",
                    padding: "1.6rem",
                    borderRadius: 26,
                    border: "1px solid rgba(148, 163, 184, 0.16)",
                    background: "rgba(5, 10, 18, 0.94)",
                    boxShadow: "0 24px 56px rgba(2, 6, 23, 0.44)",
                  }}
                >
                  {isTouchDevice && !isLandscape ? (
                    <>
                      <p style={{ margin: 0, color: "#7dd3fc", letterSpacing: "0.15em", textTransform: "uppercase", fontSize: 12 }}>
                        Rotate Device
                      </p>
                      <h2 style={{ margin: "0.55rem 0 0.8rem" }}>Turn your phone sideways to drive</h2>
                      <p style={{ margin: 0, color: "#cbd5e1" }}>
                        This build is meant to play in landscape. Rotate horizontal and tap start again to enter full-screen mode.
                      </p>
                    </>
                  ) : snapshot.phase === "menu" ? (
                    <>
                      <p style={{ margin: 0, color: "#fca5a5", letterSpacing: "0.15em", textTransform: "uppercase", fontSize: 12 }}>
                        Awareness Prototype
                      </p>
                      <h2 style={{ margin: "0.55rem 0 0.8rem" }}>Every second gets less controllable</h2>
                      <p style={{ margin: 0, color: "#cbd5e1" }}>
                        The road drifts, reaction time stretches, and lane control fades. This is built to feel unstable on purpose. On mobile, steering comes from the way you tilt the phone.
                      </p>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 18 }}>
                        <DrivingSimHud label="Starting BAC" value="0.16" accent="#fecaca" />
                        <DrivingSimHud label="Reaction Delay" value="420 ms" accent="#fde68a" />
                        <DrivingSimHud label="Best Run" value={`${formatNumber(snapshot.bestScore)} pts`} accent="#bfdbfe" />
                      </div>

                      <button
                        type="button"
                        onClick={() => void startGame()}
                        style={{
                          width: "100%",
                          marginTop: 18,
                          minHeight: 56,
                          borderRadius: 18,
                          background: "linear-gradient(180deg, rgba(37, 99, 235, 0.96) 0%, rgba(30, 64, 175, 0.98) 100%)",
                        }}
                      >
                        Start Simulation
                      </button>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: 0, color: "#fca5a5", letterSpacing: "0.15em", textTransform: "uppercase", fontSize: 12 }}>
                        Run Ended
                      </p>
                      <h2 style={{ margin: "0.55rem 0 0.8rem" }}>{snapshot.crashReason}</h2>
                      <p style={{ margin: 0, color: "#cbd5e1" }}>
                        Final score: <strong>{formatNumber(snapshot.score)}</strong> points after <strong>{snapshot.elapsed.toFixed(1)}s</strong>. Best run: <strong>{formatNumber(snapshot.bestScore)}</strong>.
                      </p>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 18 }}>
                        <DrivingSimHud label="Distance" value={`${formatNumber(snapshot.distance)} m`} accent="#bfdbfe" />
                        <DrivingSimHud label="Near Misses" value={String(snapshot.nearMisses)} accent="#c4b5fd" />
                        <DrivingSimHud label="Peak BAC" value={snapshot.bac.toFixed(2)} accent="#fecaca" />
                      </div>

                      <button
                        type="button"
                        onClick={() => void startGame()}
                        style={{
                          width: "100%",
                          marginTop: 18,
                          minHeight: 56,
                          borderRadius: 18,
                          background: "linear-gradient(180deg, rgba(15, 118, 110, 0.96) 0%, rgba(17, 94, 89, 0.98) 100%)",
                        }}
                      >
                        Run It Again
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {!fullscreenActive ? (
            <aside
              style={{
                display: "grid",
                gap: 14,
                alignContent: "start",
              }}
            >
              <DrivingSimHud label="Distance" value={`${formatNumber(snapshot.distance)} m`} accent="#bfdbfe" />
              <DrivingSimHud label="Best Run" value={`${formatNumber(snapshot.bestScore)} pts`} accent="#86efac" />

              <div
                style={{
                  padding: 18,
                  borderRadius: 20,
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  background: "rgba(8, 14, 24, 0.82)",
                  boxShadow: "0 12px 28px rgba(2, 6, 23, 0.18)",
                }}
              >
                <p style={{ margin: 0, color: "#7dd3fc", letterSpacing: "0.14em", textTransform: "uppercase", fontSize: 12 }}>
                  Driving Model
                </p>
                <p style={{ margin: "0.65rem 0 0", color: "#cbd5e1" }}>
                  Mobile uses tilt steering after you start. Rotate to landscape, the game takes over the screen, and rotating back upright releases it again.
                </p>
              </div>
            </aside>
          ) : null}
        </div>
      </section>
    </main>
  );
}
