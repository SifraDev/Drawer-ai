import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { StickyNote, Calendar, Trash2, Pencil, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { DocumentsTable } from "@/components/documents-table";
import type { Note } from "@shared/schema";

export default function Files() {
  const { data: allNotes, isLoading: notesLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
  });
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editReminderDate, setEditReminderDate] = useState("");
  const [editReminderTime, setEditReminderTime] = useState("");

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      toast({ title: "Note deleted" });
      setDeleteTarget(null);
    },
    onError: () => {
      toast({ title: "Failed to delete note", variant: "destructive" });
      setDeleteTarget(null);
    },
  });

  const editNoteMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Record<string, any> }) => {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      toast({ title: "Note updated" });
      setEditingId(null);
    },
    onError: () => {
      toast({ title: "Failed to update note", variant: "destructive" });
    },
  });

  function startEditing(note: Note) {
    setEditingId(note.id);
    setEditContent(note.content);
    setEditReminderDate(note.reminderDate || "");
    setEditReminderTime(note.reminderTime || "");
  }

  function cancelEditing() {
    setEditingId(null);
    setEditContent("");
    setEditReminderDate("");
    setEditReminderTime("");
  }

  function saveEdit(id: number) {
    if (!editContent.trim()) return;
    editNoteMutation.mutate({
      id,
      updates: {
        content: editContent.trim(),
        reminderDate: editReminderDate || null,
        reminderTime: editReminderTime || null,
      },
    });
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">All Files</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View all your uploaded documents and notes
        </p>
      </div>

      <DocumentsTable showTitle />

      <Card className="overflow-visible" data-testid="notes-table">
        <div className="flex items-center gap-2 p-4 border-b">
          <StickyNote className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Notes & Reminders</h3>
          <Badge variant="secondary" className="ml-auto">
            {allNotes?.length ?? 0} total
          </Badge>
        </div>
        {notesLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !allNotes || allNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
              <StickyNote className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No notes yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create a note or reminder in the chat
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Content</TableHead>
                  <TableHead className="text-xs">Reminder</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allNotes.map((note) => (
                  <TableRow key={note.id} data-testid={`row-note-${note.id}`}>
                    <TableCell className="text-sm">
                      {editingId === note.id ? (
                        <Input
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="text-sm"
                          data-testid={`input-edit-note-content-${note.id}`}
                          autoFocus
                        />
                      ) : (
                        note.content.length > 80 ? note.content.slice(0, 80) + "..." : note.content
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === note.id ? (
                        <div className="flex flex-col gap-1.5">
                          <Input
                            type="date"
                            value={editReminderDate}
                            onChange={(e) => setEditReminderDate(e.target.value)}
                            className="text-xs"
                            data-testid={`input-edit-note-date-${note.id}`}
                          />
                          <Input
                            type="time"
                            value={editReminderTime}
                            onChange={(e) => setEditReminderTime(e.target.value)}
                            className="text-xs"
                            data-testid={`input-edit-note-time-${note.id}`}
                          />
                        </div>
                      ) : note.reminderDate ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {note.reminderDate}
                            {note.reminderTime ? ` at ${note.reminderTime}` : ""}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={note.isCompleted ? "secondary" : "default"} className="text-xs">
                        {note.isCompleted ? "Done" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {editingId === note.id ? (
                        <div className="flex items-center gap-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => saveEdit(note.id)}
                            disabled={editNoteMutation.isPending || !editContent.trim()}
                            data-testid={`button-save-note-${note.id}`}
                          >
                            <Check className="h-3.5 w-3.5 text-chart-2" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={cancelEditing}
                            disabled={editNoteMutation.isPending}
                            data-testid={`button-cancel-edit-note-${note.id}`}
                          >
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => startEditing(note)}
                            data-testid={`button-edit-note-${note.id}`}
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteTarget(note)}
                            disabled={deleteNoteMutation.isPending}
                            data-testid={`button-delete-note-${note.id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete note?</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget && (
                  <>This will permanently delete the note: "{deleteTarget.content.length > 60 ? deleteTarget.content.slice(0, 60) + "..." : deleteTarget.content}". This action cannot be undone.</>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete-note">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteTarget && deleteNoteMutation.mutate(deleteTarget.id)}
                className="bg-destructive text-destructive-foreground"
                data-testid="button-confirm-delete-note"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  );
}
