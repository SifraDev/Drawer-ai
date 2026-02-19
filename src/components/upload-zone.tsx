import { useState, useRef, useCallback } from "react";
import { Upload, FileUp, Loader2, X, CheckCircle2, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { SmartCard } from "./smart-card";
import type { Document } from "@shared/schema";
import confetti from "canvas-confetti";

export function UploadZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<Document | null>(null);
  const [showSuccessCheckmark, setShowSuccessCheckmark] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fireConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  }, []);

  const uploadFile = async (file: File) => {
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Oops! Invalid file type.",
        description: "Please upload a PDF or image file (PNG, JPG, WEBP).",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Oops! File too large.",
        description: "Maximum file size is 10MB. Please try a smaller file.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadResult(null);
    setShowSuccessCheckmark(false);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Upload failed");
      }

      const data = await res.json();

      fireConfetti();

      setShowSuccessCheckmark(true);
      setIsUploading(false);

      setTimeout(() => {
        setShowSuccessCheckmark(false);
        setUploadResult(data);
      }, 1800);

      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });

      toast({
        title: "Document processed",
        description: `Successfully extracted data from ${data.merchant}`,
      });
    } catch (error: any) {
      setIsUploading(false);
      toast({
        title: "Oops! Couldn't upload.",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-4">
      <Card
        className={`relative cursor-pointer transition-colors ${
          isDragging
            ? "border-primary border-2 bg-primary/5"
            : "border-dashed border-2 hover-elevate"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && !showSuccessCheckmark && fileInputRef.current?.click()}
        data-testid="upload-dropzone"
      >
        <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          {showSuccessCheckmark ? (
            <div className="animate-fade-in-scale flex flex-col items-center gap-3" data-testid="status-upload-success">
              <div className="animate-glow-pulse flex h-20 w-20 items-center justify-center rounded-full bg-green-500/15">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <p className="text-sm font-semibold text-green-600 dark:text-green-400" data-testid="text-upload-complete">
                Upload complete
              </p>
            </div>
          ) : isUploading ? (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Processing document...</p>
                <p className="text-xs text-muted-foreground mt-1">
                  AI is extracting data and generating insights
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                {isDragging ? (
                  <FileUp className="h-8 w-8 text-primary" />
                ) : (
                  <Upload className="h-8 w-8 text-primary" />
                )}
              </div>
              <div>
                <p className="font-semibold">
                  {isDragging ? "Drop your file here" : "Drag & drop a receipt or PDF"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse. Supports PDF, PNG, JPG, WEBP (max 10MB)
                </p>
              </div>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={handleFileSelect}
          data-testid="input-file-upload"
        />
      </Card>

      {uploadResult && (
        <div className="space-y-3">
          <div className="relative">
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-2 top-2 z-10"
              onClick={() => setUploadResult(null)}
              data-testid="button-dismiss-result"
            >
              <X className="h-4 w-4" />
            </Button>
            <SmartCard document={uploadResult} highlighted />
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setUploadResult(null)}
            data-testid="button-back-to-dashboard"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
