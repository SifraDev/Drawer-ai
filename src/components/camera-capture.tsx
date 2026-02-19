import { useState, useRef, useCallback, useEffect } from "react";
import { X, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setError(null);
    } catch {
      setError("Could not access camera. Please allow camera permissions.");
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facingMode, startCamera]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(dataUrl);
  }, []);

  const retake = useCallback(() => {
    setCapturedImage(null);
  }, []);

  const confirmPhoto = useCallback(() => {
    if (!capturedImage) return;
    const byteString = atob(capturedImage.split(",")[1]);
    const mimeString = capturedImage.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
    onCapture(file);
  }, [capturedImage, onCapture]);

  const toggleCamera = useCallback(() => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
    setCapturedImage(null);
  }, []);

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center gap-4" role="dialog" aria-modal="true">
        <p className="text-white text-sm text-center px-4">{error}</p>
        <Button variant="outline" onClick={onClose} data-testid="button-camera-close-error">
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" role="dialog" aria-modal="true" data-testid="camera-capture-modal">
      <div className="flex items-center justify-between gap-2 p-3">
        <Button size="icon" variant="ghost" onClick={onClose} className="text-white" data-testid="button-camera-close">
          <X className="h-5 w-5" />
        </Button>
        <Button size="icon" variant="ghost" onClick={toggleCamera} className="text-white" data-testid="button-camera-flip">
          <RotateCcw className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {capturedImage ? (
          <img src={capturedImage} alt="Captured" className="max-w-full max-h-full object-contain" data-testid="img-camera-preview" />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-w-full max-h-full object-contain"
            data-testid="video-camera-feed"
          />
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex items-center justify-center gap-6 p-6">
        {capturedImage ? (
          <>
            <Button size="icon" variant="outline" onClick={retake} data-testid="button-camera-retake">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button size="icon" onClick={confirmPhoto} data-testid="button-camera-confirm">
              <Check className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <button
            onClick={takePhoto}
            className="h-16 w-16 rounded-full border-4 border-white bg-transparent flex items-center justify-center transition-transform active:scale-95"
            data-testid="button-camera-shutter"
          >
            <span className="block h-12 w-12 rounded-full bg-red-500" />
          </button>
        )}
      </div>
    </div>
  );
}
