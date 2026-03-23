import Image from "next/image";
import afgscLogo from "../afgsc.png";
import b2Image from "../b2.png";
import targetImage from "../target.png";

type AppLoadingStateProps = {
  title?: string;
  caption?: string;
  compact?: boolean;
};

export default function AppLoadingState({
  title = "Mission Loading",
  caption = "Routing your ride operations through Global Strike Command.",
  compact = false,
}: AppLoadingStateProps) {
  return (
    <div className={`loading-state ${compact ? "loading-state-compact" : ""}`} aria-label={title}>
      <div className="loading-state-visual" aria-hidden="true">
        <div className="loading-state-origin">
          <Image
            src={afgscLogo}
            alt="Air Force Global Strike Command"
            width={36}
            height={36}
            className="loading-state-origin-logo"
          />
        </div>
        <div className="loading-state-track" />
        <div className="loading-state-b2">
          <Image
            src={b2Image}
            alt="B-2 Spirit silhouette"
            width={160}
            height={72}
            className="loading-b2-image"
          />
        </div>
        <div className="loading-state-target">
          <Image
            src={targetImage}
            alt="Target"
            width={28}
            height={28}
            className="loading-state-target-image"
          />
        </div>
      </div>
      <div>
        <p className="loading-state-title">{title}</p>
        <p className="loading-state-caption">{caption}</p>
      </div>
    </div>
  );
}
