import { Link } from "wouter";
import { ArrowRight, Shield, Brain, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import drawerIcon from "@assets/Icon_1771174192260.jpg";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[hsl(220,20%,8%)] text-white flex flex-col">
      <nav className="flex items-center justify-between gap-2 px-6 py-4 border-b border-white/10 flex-wrap">
        <div className="flex items-center gap-2">
          <img src={drawerIcon} alt="Drawer" className="h-8 w-8 rounded-md object-cover" />
          <span className="text-lg font-semibold tracking-tight">Drawer</span>
        </div>
        <Link href="/login">
          <Button variant="outline" size="sm" className="border-white/20 text-white" data-testid="button-landing-login">
            Sign In
          </Button>
        </Link>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="max-w-2xl space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight" data-testid="text-landing-title">
            Drawer: Your Personal Data Warehouse
          </h1>
          <p className="text-lg text-white/60 max-w-xl mx-auto" data-testid="text-landing-subtitle">
            Stop trusting generic clouds. Start owning your financial intelligence.
          </p>
          <Link href="/login">
            <Button size="lg" className="mt-4" data-testid="button-launch-demo">
              Launch Demo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 max-w-3xl w-full">
          <div className="rounded-md border border-white/10 bg-white/5 p-6 text-left space-y-2">
            <Brain className="h-6 w-6 text-blue-400" />
            <h3 className="text-sm font-semibold">AI-Powered Extraction</h3>
            <p className="text-xs text-white/50">
              Upload any document and AI extracts every detail automatically.
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-6 text-left space-y-2">
            <Database className="h-6 w-6 text-blue-400" />
            <h3 className="text-sm font-semibold">Smart Storage</h3>
            <p className="text-xs text-white/50">
              All your receipts, bills, and records organized and searchable.
            </p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/5 p-6 text-left space-y-2">
            <Shield className="h-6 w-6 text-blue-400" />
            <h3 className="text-sm font-semibold">Your Data, Your Control</h3>
            <p className="text-xs text-white/50">
              Private, secure, and always accessible when you need it.
            </p>
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-white/40 border-t border-white/10">
        Drawer - AI-Powered Document Intelligence
      </footer>
    </div>
  );
}
