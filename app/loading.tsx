import Image from "next/image";
import afgscLogo from "./afgsc.png";
import b2Image from "./b2.png";
import targetImage from "./target.png";

export default function Loading() {
  return (
    <main className="loading-screen" aria-label="Loading Defender Drivers">
      <div className="loading-frame">
        <div className="loading-header">
          <p className="loading-kicker">Defender Drivers</p>
          <h1>Mission Loading</h1>
          <p className="loading-copy">
            Routing your ride operations through Global Strike Command.
          </p>
        </div>

        <div className="loading-runway" aria-hidden="true">
          <div className="loading-origin">
            <div className="loading-origin-ring" />
            <div className="loading-origin-core">
              <Image
                src={afgscLogo}
                alt="Air Force Global Strike Command"
                width={76}
                height={76}
                className="loading-origin-logo"
              />
            </div>
          </div>

          <div className="loading-track">
            <div className="loading-track-line" />
            <div className="loading-b2">
              <Image
                src={b2Image}
                alt="B-2 Spirit silhouette"
                width={160}
                height={72}
                className="loading-b2-image"
              />
            </div>
          </div>

          <div className="loading-target">
            <Image
              src={targetImage}
              alt="Target"
              width={96}
              height={96}
              className="loading-target-image"
            />
          </div>
        </div>

        <div className="loading-progress" aria-hidden="true">
          <span className="loading-progress-label">Establishing route</span>
          <div className="loading-progress-bar">
            <div className="loading-progress-fill" />
          </div>
        </div>
      </div>
    </main>
  );
}
