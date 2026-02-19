import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Send, Loader2, Paperclip, X, Trash2, FileText, Bot, User, Camera, Download, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { downloadFile } from "@/lib/download";
import { useUnread } from "@/lib/unread-context";
import { SmartCard } from "@/components/smart-card";
import { CameraCapture } from "@/components/camera-capture";
import type { ChatMessage, Document } from "@shared/schema";
import confetti from "canvas-confetti";

function renderMessageContent(content: string, isAssistant: boolean) {
  if (!isAssistant) return <div className="whitespace-pre-wrap">{content}</div>;

  const linkRegex = /\[([^\]]+)\]\((\/uploads\/[^\)]+)\)/g;
  const parts: Array<{ type: "text"; value: string } | { type: "link"; label: string; url: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "link", label: match[1], url: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  if (parts.length === 1 && parts[0].type === "text") {
    return <div className="whitespace-pre-wrap">{content}</div>;
  }

  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, i) =>
        part.type === "text" ? (
          <span key={i}>{part.value}</span>
        ) : (
          <Button
            key={i}
            variant="outline"
            size="sm"
            className="inline-flex my-1"
            onClick={() => downloadFile(part.url, part.label)}
            data-testid={`button-chat-download-${i}`}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {part.label}
          </Button>
        )
      )}
    </div>
  );
}

export default function Chat() {
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ document?: Document; note?: any } | null>(null);
  const [showSuccessCheckmark, setShowSuccessCheckmark] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { setChatActive } = useUnread();

  useEffect(() => {
    setChatActive(true);
    return () => setChatActive(false);
  }, [setChatActive]);

  const { data: messages, isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/messages"],
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/chat/messages", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      setLastResult(null);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const handleSend = async () => {
    if (!message.trim() && !selectedFile) return;

    let outgoingMessage = message;
    const hadFile = !!selectedFile;

    const trimmed = message.trim().toLowerCase();
    if (
      (trimmed === "yes" || trimmed === "sure") &&
      messages &&
      messages.length > 0
    ) {
      const lastAssistant = [...messages]
        .reverse()
        .find((m) => m.role === "assistant");
      if (lastAssistant && lastAssistant.content.toLowerCase().includes("draft a complaint")) {
        outgoingMessage =
          "Generate a formal complaint email to AT&T regarding the recent bill of $150.00, which is higher than the agreed rate. Ask for a correction.";
      }
    }

    setIsSending(true);
    setLastResult(null);
    setShowSuccessCheckmark(false);

    try {
      const formData = new FormData();
      formData.append("message", outgoingMessage);
      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      const res = await fetch("/api/chat/send", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Failed to send message");
      }

      const data = await res.json();

      if (hadFile && data.document) {
        fireConfetti();
        setShowSuccessCheckmark(true);
        setIsSending(false);

        setTimeout(() => {
          setShowSuccessCheckmark(false);
          setLastResult({
            document: data.document || undefined,
            note: data.note || undefined,
          });
        }, 1800);
      } else {
        setLastResult({
          document: data.document || undefined,
          note: data.note || undefined,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });

      setMessage("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: any) {
      toast({
        title: "Oops! Couldn't send.",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-2 p-4 border-b flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Chat</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload documents, ask questions, or create notes
          </p>
        </div>
        {messages && messages.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => clearMutation.mutate()}
            disabled={clearMutation.isPending}
            data-testid="button-clear-chat"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-3/4" />
            ))}
          </div>
        ) : messages && messages.length > 0 ? (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              data-testid={`chat-message-${msg.id}`}
            >
              {msg.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-md px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border"
                }`}
              >
                {msg.attachmentUrl && (
                  <div className="flex items-center gap-1.5 mb-1.5 text-xs opacity-80">
                    <FileText className="h-3 w-3" />
                    <span>Attached file</span>
                  </div>
                )}
                {renderMessageContent(msg.content, msg.role === "assistant")}
              </div>
              {msg.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Welcome to Drawer Chat</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Upload any document and I'll extract all the details. Ask me anything about your stored documents anytime.
              </p>
            </div>
            
          </div>
        )}

        {showSuccessCheckmark && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-card border rounded-md px-4 py-4">
              <div className="animate-fade-in-scale flex items-center gap-3" data-testid="status-chat-upload-success">
                <div className="animate-glow-pulse flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15">
                  <CheckCircle2 className="h-7 w-7 text-green-500" />
                </div>
                <p className="text-sm font-semibold text-green-600 dark:text-green-400" data-testid="text-chat-upload-complete">
                  Upload complete
                </p>
              </div>
            </div>
          </div>
        )}

        {lastResult?.document && (
          <div className="ml-11 space-y-3">
            <div className="relative">
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-2 top-2 z-10"
                onClick={() => setLastResult(null)}
                data-testid="button-dismiss-chat-result"
              >
                <X className="h-4 w-4" />
              </Button>
              <SmartCard document={lastResult.document} highlighted />
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setLastResult(null)}
              data-testid="button-close-chat-result"
            >
              <X className="h-4 w-4 mr-2" />
              Close Details
            </Button>
          </div>
        )}

        {isSending && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="bg-card border rounded-md px-3 py-2 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {selectedFile ? "Uploading and analyzing document..." : "Thinking..."}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4 space-y-3">
        {selectedFile && (
          <div className="flex items-center gap-2 rounded-md bg-muted p-2">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs truncate flex-1">{selectedFile.name}</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              data-testid="button-remove-file"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            data-testid="button-attach-file"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowCamera(true)}
            disabled={isSending}
            data-testid="button-camera"
          >
            <Camera className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={handleFileSelect}
            data-testid="input-chat-file"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Drawer..."
            className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[40px] max-h-[120px]"
            rows={1}
            disabled={isSending}
            data-testid="input-chat-message"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={isSending || (!message.trim() && !selectedFile)}
            data-testid="button-send-message"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={(file) => {
            setSelectedFile(file);
            setShowCamera(false);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
