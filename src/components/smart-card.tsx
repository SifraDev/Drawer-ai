import { AlertTriangle, CalendarClock, CheckCircle2, Store, Tag, FileText, ArrowDownCircle, ArrowUpCircle, FileArchive, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadFile } from "@/lib/download";
import type { Document } from "@shared/schema";

interface SmartCardProps {
  document: Document;
  highlighted?: boolean;
}

function getInsightStyle(insight: string) {
  if (insight.includes("Alert") || insight.includes("more expensive")) {
    return {
      bg: "bg-destructive/10 dark:bg-destructive/15",
      text: "text-destructive",
      icon: AlertTriangle,
    };
  }
  if (insight.includes("Reminder") || insight.includes("Due")) {
    return {
      bg: "bg-chart-4/10 dark:bg-chart-4/15",
      text: "text-chart-4",
      icon: CalendarClock,
    };
  }
  return {
    bg: "bg-chart-2/10 dark:bg-chart-2/15",
    text: "text-chart-2",
    icon: CheckCircle2,
  };
}

function getTypeStyle(transactionType: string) {
  switch (transactionType) {
    case "expense":
      return { color: "text-destructive", icon: ArrowDownCircle, label: "Expense" };
    case "income":
      return { color: "text-chart-2", icon: ArrowUpCircle, label: "Income" };
    default:
      return { color: "text-muted-foreground", icon: FileArchive, label: "Record" };
  }
}

export function SmartCard({ document, highlighted }: SmartCardProps) {
  const insightStyle = getInsightStyle(document.insight);
  const InsightIcon = insightStyle.icon;
  const typeStyle = getTypeStyle(document.transactionType);
  const TypeIcon = typeStyle.icon;

  return (
    <Card
      className={`overflow-visible p-4 space-y-3 ${highlighted ? "ring-1 ring-primary/30" : ""}`}
      data-testid={`smart-card-${document.id}`}
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Store className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" data-testid={`text-merchant-${document.id}`}>
              {document.merchant}
            </p>
            <p className="text-xs text-muted-foreground">{document.date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" data-testid={`badge-category-${document.id}`}>
            <Tag className="h-3 w-3 mr-1" />
            {document.category}
          </Badge>
          <div className="flex items-center gap-1">
            <TypeIcon className={`h-3.5 w-3.5 ${typeStyle.color}`} />
            <span className={`text-xs font-medium ${typeStyle.color}`}>{typeStyle.label}</span>
          </div>
          {document.transactionType !== "record" && (
            <span className={`text-base font-bold tabular-nums ${typeStyle.color}`} data-testid={`text-amount-${document.id}`}>
              {document.transactionType === "income" ? "+" : "-"}${Number(document.amount).toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {document.summary && (
        <div className="flex items-start gap-2">
          <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground leading-relaxed">{document.summary}</p>
        </div>
      )}

      <div
        className={`flex items-start gap-2 rounded-md p-3 ${insightStyle.bg}`}
        data-testid={`insight-${document.id}`}
      >
        <InsightIcon className={`h-4 w-4 mt-0.5 shrink-0 ${insightStyle.text}`} />
        <p className={`text-xs font-medium leading-relaxed ${insightStyle.text}`}>
          {document.insight}
        </p>
      </div>

      {document.fileUrl && (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            downloadFile(document.fileUrl!);
          }}
          data-testid={`button-download-original-${document.id}`}
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Download Original Document
        </Button>
      )}
    </Card>
  );
}
