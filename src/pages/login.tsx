import { useState } from "react";
import { useLocation } from "wouter";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import drawerIcon from "@assets/Icon_1771174192260.jpg";

export default function Login() {
  const [, setLocation] = useLocation();
  const [firstName, setFirstName] = useState("");
  const [emailPrefix, setEmailPrefix] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password === "judge2026") {
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("userName", firstName.trim() || "User");
      localStorage.setItem("userEmail", (emailPrefix.trim() || "demo") + "@drawer.ai");
      setLocation("/dashboard");
    } else {
      setError("Access Denied: Invalid Credentials");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6 space-y-6">
        <div className="flex flex-col items-center gap-2">
          <img src={drawerIcon} alt="Drawer" className="h-12 w-12 rounded-md object-cover" />
          <h1 className="text-xl font-semibold tracking-tight">Welcome to Drawer</h1>
          <p className="text-xs text-muted-foreground">Sign in to access your data warehouse</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="firstName" className="text-xs font-medium">
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              data-testid="input-first-name"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium">
              Email
            </label>
            <div className="flex items-center rounded-md border bg-background focus-within:ring-1 focus-within:ring-ring">
              <input
                id="email"
                type="text"
                value={emailPrefix}
                onChange={(e) => setEmailPrefix(e.target.value)}
                placeholder="yourname"
                required
                className="flex-1 bg-transparent pl-3 py-2 text-sm focus-visible:outline-none"
                data-testid="input-email"
              />
              <span className="pr-3 text-sm text-muted-foreground select-none whitespace-nowrap">@drawer.ai</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              data-testid="input-password"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive font-medium" data-testid="text-login-error">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" data-testid="button-sign-in">
            <LogIn className="h-4 w-4 mr-2" />
            Sign In
          </Button>

          <p className="text-[11px] text-muted-foreground text-center">
            Judge Access: Use <span className="font-mono">demo</span> / <span className="font-mono">judge2026</span>
          </p>
        </form>
      </Card>
    </div>
  );
}
