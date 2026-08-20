"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import type { BookItem, StudentListItem } from "@/types";

export function IssueBookDialog({
  open, onOpenChange, onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [bookSearch, setBookSearch] = useState("");
  const [books, setBooks] = useState<BookItem[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);

  const [studentSearch, setStudentSearch] = useState("");
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null);

  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setBookSearch(""); setBooks([]); setSelectedBook(null);
      setStudentSearch(""); setStudents([]); setSelectedStudent(null);
      const d = new Date();
      d.setDate(d.getDate() + 14);
      setDueDate(d.toISOString().slice(0, 10));
    }
  }, [open]);

  useEffect(() => {
    if (!bookSearch) { setBooks([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/books?search=${encodeURIComponent(bookSearch)}&availableOnly=true&limit=8`).then((r) => r.json()).then((j) => setBooks(j.data ?? []));
    }, 300);
    return () => clearTimeout(t);
  }, [bookSearch]);

  useEffect(() => {
    if (!studentSearch) { setStudents([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/students?search=${encodeURIComponent(studentSearch)}&limit=8`).then((r) => r.json()).then((j) => setStudents(j.data ?? []));
    }, 300);
    return () => clearTimeout(t);
  }, [studentSearch]);

  async function handleSubmit() {
    if (!selectedBook || !selectedStudent) {
      toast({ title: "Select a book and a student", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/book-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: selectedBook.id, studentId: selectedStudent.id, dueDate }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Failed to issue book", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "Book issued successfully", variant: "success" });
      onOpenChange(false);
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Issue Book</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Book</Label>
            {selectedBook ? (
              <div className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                <span>{selectedBook.title} <span className="text-muted-foreground">by {selectedBook.author}</span></span>
                <button className="text-xs text-primary" onClick={() => setSelectedBook(null)}>Change</button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search available books..." value={bookSearch} onChange={(e) => setBookSearch(e.target.value)} />
                </div>
                {books.length > 0 && (
                  <div className="border rounded-lg mt-1 max-h-36 overflow-y-auto">
                    {books.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
                        onClick={() => { setSelectedBook(b); setBooks([]); setBookSearch(""); }}
                      >
                        <span>{b.title}</span>
                        <Badge variant="secondary">{b.availableQuantity} available</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Student</Label>
            {selectedStudent ? (
              <div className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                <span>{selectedStudent.firstName} {selectedStudent.lastName} <span className="text-muted-foreground font-mono">({selectedStudent.registrationNumber})</span></span>
                <button className="text-xs text-primary" onClick={() => setSelectedStudent(null)}>Change</button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search student..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
                </div>
                {students.length > 0 && (
                  <div className="border rounded-lg mt-1 max-h-36 overflow-y-auto">
                    {students.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
                        onClick={() => { setSelectedStudent(s); setStudents([]); setStudentSearch(""); }}
                      >
                        <span>{s.firstName} {s.lastName}</span>
                        <span className="text-xs text-muted-foreground font-mono">{s.registrationNumber}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Due Date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Issuing..." : "Issue Book"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
