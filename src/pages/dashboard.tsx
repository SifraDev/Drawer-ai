import { StatsCards } from "@/components/stats-cards";
import { UploadZone } from "@/components/upload-zone";
import { DocumentsTable } from "@/components/documents-table";

function getGreeting(): string {
  const sfTime = new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", hour12: false });
  const hour = parseInt(sfTime, 10);
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

export default function Dashboard() {
  const userName = localStorage.getItem("userName") || "User";

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-dashboard-greeting">
          Good {getGreeting()}, {userName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload documents and track your expenses with AI-powered insights
        </p>
      </div>

      <StatsCards />

      <UploadZone />

      <DocumentsTable limit={5} compact />
    </div>
  );
}
