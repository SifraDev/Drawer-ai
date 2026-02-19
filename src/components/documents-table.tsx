import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, CheckCircle2, FileText, Trash2, ArrowDownCircle, ArrowUpCircle, FileArchive, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadFile } from "@/lib/download";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { Document } from "@shared/schema";

function getInsightIcon(insight: string) {
  if (insight.includes("Alert") || insight.includes("more expensive")) {
    return <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />;
  }
  if (insight.includes("Reminder") || insight.includes("Due")) {
    return <CalendarClock className="h-3.5 w-3.5 text-chart-4 shrink-0" />;
  }
  return <CheckCircle2 className="h-3.5 w-3.5 text-chart-2 shrink-0" />;
}

function getInsightTextClass(insight: string) {
  if (insight.includes("Alert") || insight.includes("more expensive")) {
    return "text-destructive";
  }
  if (insight.includes("Reminder") || insight.includes("Due")) {
    return "text-chart-4";
  }
  return "text-chart-2";
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

function formatAmount(amount: number, transactionType: string) {
  if (transactionType === "record") return "\u2014";
  const prefix = transactionType === "income" ? "+" : "-";
  return `${prefix}$${amount.toFixed(2)}`;
}

interface DocumentsTableProps {
  limit?: number;
  showTitle?: boolean;
  compact?: boolean;
}

export function DocumentsTable({ limit, showTitle = true, compact = false }: DocumentsTableProps) {
  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      toast({ title: "Document deleted" });
      setDeleteTarget(null);
    },
    onError: () => {
      toast({ title: "Failed to delete document", variant: "destructive" });
      setDeleteTarget(null);
    },
  });

  const displayDocs = limit ? documents?.slice(0, limit) : documents;

  if (isLoading) {
    return (
      <Card className="overflow-visible">
        {showTitle && (
          <div className="flex items-center justify-between gap-2 p-4 border-b flex-wrap">
            <Skeleton className="h-5 w-32" />
          </div>
        )}
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (!displayDocs || displayDocs.length === 0) {
    return (
      <Card className="overflow-visible">
        {showTitle && (
          <div className="flex items-center gap-2 p-4 border-b">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Recent Files</h3>
          </div>
        )}
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No documents yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload a receipt or PDF to get started
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-visible" data-testid="documents-table">
      {showTitle && (
        <div className="flex items-center gap-2 p-4 border-b">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Recent Files</h3>
        </div>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Merchant</TableHead>
              <TableHead className="text-xs">Category</TableHead>
              {!compact && <TableHead className="text-xs">Type</TableHead>}
              <TableHead className="text-xs text-right">Amount</TableHead>
              {!compact && <TableHead className="text-xs min-w-[200px]">Insight</TableHead>}
              <TableHead className="text-xs w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayDocs.map((doc) => {
              const typeStyle = getTypeStyle(doc.transactionType);
              const TypeIcon = typeStyle.icon;
              return (
                <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {doc.date}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{doc.merchant}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {doc.category}
                    </Badge>
                  </TableCell>
                  {!compact && (
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <TypeIcon className={`h-3.5 w-3.5 ${typeStyle.color}`} />
                        <span className={`text-xs font-medium ${typeStyle.color}`}>
                          {typeStyle.label}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  <TableCell className={`text-sm font-semibold text-right tabular-nums ${typeStyle.color}`}>
                    {formatAmount(Number(doc.amount), doc.transactionType)}
                  </TableCell>
                  {!compact && (
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {getInsightIcon(doc.insight)}
                        <span className={`text-xs font-medium ${getInsightTextClass(doc.insight)}`}>
                          {doc.insight.length > 80 ? doc.insight.slice(0, 80) + "..." : doc.insight}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      {doc.fileUrl && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => downloadFile(doc.fileUrl!)}
                          data-testid={`button-download-doc-${doc.id}`}
                        >
                          <Download className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteTarget(doc)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-doc-${doc.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>This will permanently delete the <strong>{deleteTarget.merchant}</strong> document{deleteTarget.transactionType !== "record" && <> for <strong>${Number(deleteTarget.amount).toFixed(2)}</strong></>}. This action cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
