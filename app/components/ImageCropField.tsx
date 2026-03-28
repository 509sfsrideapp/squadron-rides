"use client";

import Image from "next/image";
import { ChangeEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";

type CropShape = "circle" | "square";

type ImageCropFieldProps = {
  value: string;
  onChange: (value: string) => void;
  previewSize?: number;
  cropShape?: CropShape;
  outputSize?: number;
  maxEncodedLength?: number;
  accept?: string;
  disabled?: boolean;
  helperText?: string;
  statusMessage?: string;
  onStatusMessageChange?: (message: string) => void;
};

type CropSession = {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  scale: number;
  minScale: number;
  offsetX: number;
  offsetY: number;
};

const VIEWPORT_SIZE = 280;

function cropErrorMessage() {
  return "Could not process the selected image.";
}

async function readFileAsDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error(cropErrorMessage()));
    };
    reader.onerror = () => reject(new Error(cropErrorMessage()));
    reader.readAsDataURL(file);
  });
}

async function loadImageDimensions(src: string) {
  const image = new window.Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(cropErrorMessage()));
    image.src = src;
  });

  return {
    naturalWidth: image.width,
    naturalHeight: image.height,
  };
}

function getMinimumScale(width: number, height: number) {
  return Math.max(VIEWPORT_SIZE / width, VIEWPORT_SIZE / height);
}

function clampOffset(offset: number, displayedSize: number) {
  const limit = Math.max(0, (displayedSize - VIEWPORT_SIZE) / 2);
  return Math.min(limit, Math.max(-limit, offset));
}

function clampSession(session: CropSession) {
  const displayedWidth = session.naturalWidth * session.scale;
  const displayedHeight = session.naturalHeight * session.scale;

  return {
    ...session,
    offsetX: clampOffset(session.offsetX, displayedWidth),
    offsetY: clampOffset(session.offsetY, displayedHeight),
  };
}

async function renderCroppedDataUrl({
  session,
  outputSize,
  maxEncodedLength,
}: {
  session: CropSession;
  outputSize: number;
  maxEncodedLength: number;
}) {
  const image = new window.Image();

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(cropErrorMessage()));
    image.src = session.src;
  });

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error(cropErrorMessage());
  }

  const ratio = outputSize / VIEWPORT_SIZE;
  const displayedWidth = session.naturalWidth * session.scale * ratio;
  const displayedHeight = session.naturalHeight * session.scale * ratio;

  context.fillStyle = "#0f172a";
  context.fillRect(0, 0, outputSize, outputSize);
  context.drawImage(
    image,
    outputSize / 2 - displayedWidth / 2 + session.offsetX * ratio,
    outputSize / 2 - displayedHeight / 2 + session.offsetY * ratio,
    displayedWidth,
    displayedHeight
  );

  let quality = 0.88;
  let encoded = canvas.toDataURL("image/jpeg", quality);

  while (encoded.length > maxEncodedLength && quality > 0.42) {
    quality -= 0.08;
    encoded = canvas.toDataURL("image/jpeg", quality);
  }

  if (encoded.length > maxEncodedLength) {
    throw new Error("That photo is still too large. Please choose a smaller image.");
  }

  return encoded;
}

export default function ImageCropField({
  value,
  onChange,
  previewSize = 104,
  cropShape = "square",
  outputSize = 720,
  maxEncodedLength = 350000,
  accept = "image/*",
  disabled = false,
  helperText,
  statusMessage,
  onStatusMessageChange,
}: ImageCropFieldProps) {
  const [session, setSession] = useState<CropSession | null>(null);
  const [saving, setSaving] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartRef = useRef<{
    distance: number;
    scale: number;
    offsetX: number;
    offsetY: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [session]);

  const previewBorderRadius = cropShape === "circle" ? 999 : 18;

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      onStatusMessageChange?.("Please choose an image file.");
      event.target.value = "";
      return;
    }

    try {
      onStatusMessageChange?.("Preparing image...");
      const src = await readFileAsDataUrl(file);
      const { naturalWidth, naturalHeight } = await loadImageDimensions(src);
      const minScale = getMinimumScale(naturalWidth, naturalHeight);

      setSession({
        src,
        naturalWidth,
        naturalHeight,
        scale: minScale,
        minScale,
        offsetX: 0,
        offsetY: 0,
      });
      onStatusMessageChange?.("Adjust your image, then save the crop.");
    } catch (error) {
      console.error(error);
      onStatusMessageChange?.(error instanceof Error ? error.message : "Could not process that image.");
    } finally {
      event.target.value = "";
    }
  };

  const cropOverlay = useMemo(
    () =>
      cropShape === "circle"
        ? {
            borderRadius: "50%",
            boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.48)",
          }
        : {
            borderRadius: 22,
            boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.48)",
          },
    [cropShape]
  );

  const currentDisplayWidth = session ? session.naturalWidth * session.scale : 0;
  const currentDisplayHeight = session ? session.naturalHeight * session.scale : 0;

  const clearGestureRefs = () => {
    dragStartRef.current = null;
    activePointersRef.current.clear();
    pinchStartRef.current = null;
  };

  const updateSinglePointerDrag = (pointerId: number, clientX: number, clientY: number) => {
    activePointersRef.current.set(pointerId, { x: clientX, y: clientY });
    const start = dragStartRef.current;

    if (!start) {
      return;
    }

    setSession((current) => {
      if (!current) {
        return current;
      }

      return clampSession({
        ...current,
        offsetX: start.offsetX + (clientX - start.x),
        offsetY: start.offsetY + (clientY - start.y),
      });
    });
  };

  const updatePinchGesture = () => {
    const pointerEntries = Array.from(activePointersRef.current.values());

    if (pointerEntries.length < 2) {
      pinchStartRef.current = null;
      return;
    }

    const [firstPointer, secondPointer] = pointerEntries;
    const currentDistance = Math.hypot(secondPointer.x - firstPointer.x, secondPointer.y - firstPointer.y);
    const currentCenterX = (firstPointer.x + secondPointer.x) / 2;
    const currentCenterY = (firstPointer.y + secondPointer.y) / 2;

    if (!pinchStartRef.current) {
      pinchStartRef.current = session
        ? {
            distance: currentDistance || 1,
            scale: session.scale,
            offsetX: session.offsetX,
            offsetY: session.offsetY,
            centerX: currentCenterX,
            centerY: currentCenterY,
          }
        : null;
      dragStartRef.current = null;
      return;
    }

    setSession((current) => {
      if (!current || !pinchStartRef.current) {
        return current;
      }

      const nextScale = Math.min(
        current.minScale * 3,
        Math.max(current.minScale, pinchStartRef.current.scale * (currentDistance / pinchStartRef.current.distance))
      );

      return clampSession({
        ...current,
        scale: nextScale,
        offsetX: pinchStartRef.current.offsetX + (currentCenterX - pinchStartRef.current.centerX),
        offsetY: pinchStartRef.current.offsetY + (currentCenterY - pinchStartRef.current.centerY),
      });
    });
  };

  const saveCrop = async () => {
    if (!session) {
      return;
    }

    try {
      setSaving(true);
      onStatusMessageChange?.("Saving cropped image...");
      const cropped = await renderCroppedDataUrl({
        session,
        outputSize,
        maxEncodedLength,
      });
      onChange(cropped);
      onStatusMessageChange?.("Image ready.");
      setSession(null);
    } catch (error) {
      console.error(error);
      onStatusMessageChange?.(error instanceof Error ? error.message : "Could not save the cropped image.");
    } finally {
      setSaving(false);
    }
  };

  const previewNode = value ? (
    <Image
      src={value}
      alt="Selected image preview"
      width={previewSize}
      height={previewSize}
      unoptimized
      style={{
        width: previewSize,
        height: previewSize,
        objectFit: "cover",
        borderRadius: previewBorderRadius,
        border: "1px solid rgba(148, 163, 184, 0.22)",
        display: "block",
      }}
    />
  ) : (
    <div
      style={{
        width: previewSize,
        height: previewSize,
        borderRadius: previewBorderRadius,
        display: "grid",
        placeItems: "center",
        backgroundColor: "rgba(18, 37, 63, 0.72)",
        color: "#dbeafe",
        border: "1px solid rgba(96, 165, 250, 0.2)",
        fontFamily: "var(--font-display)",
        fontSize: "1rem",
      }}
    >
      Photo
    </div>
  );

  return (
    <>
      <div style={{ display: "grid", gap: 10 }}>
        {previewNode}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input type="file" accept={accept} onChange={handleFileChange} disabled={disabled || saving} />
          {value ? (
            <button type="button" onClick={() => onChange("")} disabled={disabled || saving}>
              Remove Photo
            </button>
          ) : null}
        </div>
        {helperText ? (
          <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>{helperText}</p>
        ) : null}
        {statusMessage ? (
          <p style={{ margin: 0, fontSize: 13, color: "#cbd5e1" }}>{statusMessage}</p>
        ) : null}
      </div>

      {session ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 110,
            backgroundColor: "rgba(2, 6, 23, 0.94)",
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "min(100%, 420px)",
              borderRadius: 22,
              padding: 18,
              backgroundColor: "rgba(9, 15, 25, 0.98)",
              border: "1px solid rgba(148, 163, 184, 0.18)",
              boxShadow: "0 20px 46px rgba(2, 6, 23, 0.34)",
            }}
          >
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Adjust Photo</h2>
            <p style={{ marginTop: 0, marginBottom: 14, color: "#94a3b8" }}>
              Drag to move the image, pinch with two fingers to zoom, or use the slider if you prefer.
            </p>

            <div
              style={{
                position: "relative",
                width: VIEWPORT_SIZE,
                height: VIEWPORT_SIZE,
                margin: "0 auto 16px",
                overflow: "hidden",
                borderRadius: 28,
                backgroundColor: "#020617",
                touchAction: "none",
              }}
              onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                activePointersRef.current.set(event.pointerId, {
                  x: event.clientX,
                  y: event.clientY,
                });

                if (activePointersRef.current.size === 1) {
                  dragStartRef.current = {
                    x: event.clientX,
                    y: event.clientY,
                    offsetX: session.offsetX,
                    offsetY: session.offsetY,
                  };
                  pinchStartRef.current = null;
                  return;
                }

                updatePinchGesture();
              }}
              onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
                if (!activePointersRef.current.has(event.pointerId)) {
                  return;
                }

                if (activePointersRef.current.size >= 2) {
                  activePointersRef.current.set(event.pointerId, {
                    x: event.clientX,
                    y: event.clientY,
                  });
                  updatePinchGesture();
                  return;
                }

                updateSinglePointerDrag(event.pointerId, event.clientX, event.clientY);
              }}
              onPointerUp={(event: PointerEvent<HTMLDivElement>) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }

                activePointersRef.current.delete(event.pointerId);

                if (activePointersRef.current.size === 1) {
                  const [remainingPointer] = Array.from(activePointersRef.current.values());
                  dragStartRef.current = session
                    ? {
                        x: remainingPointer.x,
                        y: remainingPointer.y,
                        offsetX: session.offsetX,
                        offsetY: session.offsetY,
                      }
                    : null;
                } else {
                  dragStartRef.current = null;
                }

                pinchStartRef.current = null;
              }}
              onPointerCancel={() => {
                clearGestureRefs();
              }}
            >
              <img
                src={session.src}
                alt="Crop preview"
                draggable={false}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  width: currentDisplayWidth,
                  height: currentDisplayHeight,
                  maxWidth: "none",
                  maxHeight: "none",
                  transform: `translate(calc(-50% + ${session.offsetX}px), calc(-50% + ${session.offsetY}px))`,
                  transformOrigin: "center center",
                  userSelect: "none",
                  touchAction: "none",
                }}
              />
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  border: "2px solid rgba(255, 255, 255, 0.88)",
                  pointerEvents: "none",
                  ...cropOverlay,
                }}
              />
            </div>

            <label style={{ display: "block", marginBottom: 6 }}>Zoom</label>
            <input
              type="range"
              min={session.minScale}
              max={session.minScale * 3}
              step={0.01}
              value={session.scale}
              onChange={(event) => {
                const nextScale = Number(event.target.value);
                setSession((current) => {
                  if (!current) {
                    return current;
                  }

                  return clampSession({
                    ...current,
                    scale: nextScale,
                  });
                });
              }}
              style={{ width: "100%", marginBottom: 18 }}
            />

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  setSession(null);
                  onStatusMessageChange?.("");
                }}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="button" onClick={() => void saveCrop()} disabled={saving}>
                {saving ? "Saving..." : "Use Photo"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
