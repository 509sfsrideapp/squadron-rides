"use client";

import { useEffect, useState } from "react";
import HomeIconLink from "../../components/HomeIconLink";

const PIN_LENGTH = 4;
const keypadDigits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const SELF_DESTRUCT_STORAGE_KEY = "developer-self-destruct-overlay";

export default function DeveloperUnlockPage() {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [detonating, setDetonating] = useState(false);
  const [screenState, setScreenState] = useState<"idle" | "checking" | "error">("idle");

  useEffect(() => {
    if (countdown === null) {
      return;
    }

    if (countdown <= 0) {
      setDetonating(true);
      const redirectTimer = window.setTimeout(() => {
        window.sessionStorage.setItem(SELF_DESTRUCT_STORAGE_KEY, "true");
        window.location.href = "/";
      }, 120);

      return () => window.clearTimeout(redirectTimer);
    }

    const timer = window.setTimeout(() => {
      setCountdown((current) => (current === null ? null : current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdown]);

  const appendDigit = (digit: string) => {
    if (countdown !== null) {
      return;
    }
    setCode((current) => (current.length < PIN_LENGTH ? `${current}${digit}` : current));
    setStatusMessage("");
    setScreenState("idle");
  };

  const removeDigit = () => {
    if (countdown !== null) {
      return;
    }
    setCode((current) => current.slice(0, -1));
    setStatusMessage("");
    setScreenState("idle");
  };

  const clearCode = () => {
    if (countdown !== null) {
      return;
    }
    setCode("");
    setStatusMessage("");
    setScreenState("idle");
  };

  const startSelfDestruct = () => {
    setCode("");
    setSubmitting(false);
    setStatusMessage("Incorrect PIN. Initiating self destruct.");
    setScreenState("error");
    setCountdown(3);
  };

  const submitCode = async () => {
    if (countdown !== null) {
      return;
    }

    if (code.length !== PIN_LENGTH) {
      setStatusMessage("Enter all four digits.");
      setScreenState("idle");
      return;
    }

    try {
      setSubmitting(true);
      setStatusMessage("Checking developer access...");
      setScreenState("checking");

      const response = await fetch("/api/developer/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        await response.json().catch(() => null);
        startSelfDestruct();
        return;
      }

      window.location.href = "/developer";
    } catch (error) {
      console.error(error);
      setStatusMessage("Could not verify developer access.");
      setScreenState("error");
    } finally {
      setSubmitting(false);
    }
  };

  const digitalScreenLines = (() => {
    if (countdown !== null) {
      return [
        "INCORRECT PIN DETECTED",
        "INITIATING SELF DESTRUCT",
        `T-MINUS 00:0${Math.max(countdown, 0)}`,
      ];
    }

    if (statusMessage === "Checking developer access...") {
      return ["AUTHORIZATION CHECK", "VERIFYING DEVELOPER ACCESS", "STAND BY"];
    }

    if (statusMessage) {
      return ["ACCESS TERMINAL ACTIVE", statusMessage.toUpperCase(), "AWAITING VALID PIN"];
    }

    return ["SECURE CHANNEL STANDBY", "ENTER AUTHORIZATION CODE", "FOUR-DIGIT PIN REQUIRED"];
  })();

  return (
    <main className={`vault-screen${detonating ? " vault-screen-detonating" : ""}`}>
      <div className="vault-shell">
        <div className="vault-topbar">
          <HomeIconLink style={{ marginBottom: 0 }} />
          <span className="vault-badge">Restricted</span>
        </div>

        <div className="vault-panel">
          <div className="vault-frame-accent" aria-hidden="true">
            <div className="vault-hardware-strip">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="vault-cable-bundle">
              <span className="vault-cable vault-cable-amber" />
              <span className="vault-cable vault-cable-red" />
              <span className="vault-cable vault-cable-blue" />
              <span className="vault-cable vault-cable-green" />
            </div>
          </div>

          <div className="vault-header">
            <div className="vault-header-copy">
              <p className="vault-kicker">Developer Vault</p>
              <h1>Access Terminal</h1>
              <p className="vault-subcopy">
                Improvised secure access node. Enter the authorization sequence before the anti-tamper routine escalates.
              </p>
            </div>

            <div className="vault-header-side">
              <span className="vault-warning-tab">Field Device</span>
              <div className="vault-arming-module" aria-hidden="true">
                <span className="vault-arming-label">Trigger Matrix</span>
                <span className="vault-arming-light vault-arming-light-red" />
                <span className="vault-arming-light vault-arming-light-amber" />
                <span className="vault-arming-light vault-arming-light-green" />
              </div>
            </div>
          </div>

          <div className="vault-status-row" aria-hidden="true">
            <span className="vault-status-chip">Anti-Tamper</span>
            <span className="vault-status-chip">Field-Wired</span>
            <span className="vault-status-chip">Live Circuit</span>
          </div>

          <section className="vault-module vault-module-console">
            <p className="vault-module-label">Access Instructions</p>
            <div className={`vault-digital-screen vault-digital-screen-${screenState}`} aria-live="polite">
              {digitalScreenLines.map((line, index) => (
                <span
                  key={`${line}-${index}`}
                  className={`vault-digital-screen-line${index > 0 ? " vault-digital-screen-line-secondary" : ""}`}
                >
                  {line}
                </span>
              ))}
            </div>
          </section>

          <section className="vault-module vault-pin-module">
            <div className="vault-pin-heading">
              <div>
                <p className="vault-module-label">Secure Code Module</p>
                <p className="vault-pin-caption">Four-digit manual override required.</p>
              </div>
              <span className="vault-pin-id">PIN-4</span>
            </div>

            <div className="vault-display" aria-label="PIN entry">
              {Array.from({ length: PIN_LENGTH }).map((_, index) => (
                <span
                  key={index}
                  className={`vault-dot ${index < code.length ? "vault-dot-filled" : ""}`}
                />
              ))}
            </div>
          </section>

          <section className="vault-module vault-keypad-module">
            <p className="vault-module-label">Keypad Array</p>
            <div className="vault-keypad">
              {keypadDigits.map((digit) => (
                <button
                  key={digit}
                  type="button"
                  className="vault-key"
                  onClick={() => appendDigit(digit)}
                  disabled={submitting || code.length >= PIN_LENGTH || countdown !== null}
                >
                  {digit}
                </button>
              ))}

              <button type="button" className="vault-key vault-key-muted" onClick={clearCode} disabled={submitting || countdown !== null}>
                CLR
              </button>
              <button type="button" className="vault-key" onClick={() => appendDigit("0")} disabled={submitting || code.length >= PIN_LENGTH || countdown !== null}>
                0
              </button>
              <button type="button" className="vault-key vault-key-muted" onClick={removeDigit} disabled={submitting || code.length === 0 || countdown !== null}>
                DEL
              </button>
            </div>
          </section>

          <div className="vault-action-row">
            <button type="button" className="vault-submit" onClick={submitCode} disabled={submitting || countdown !== null}>
              {submitting ? "Authorizing..." : "Unlock"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
