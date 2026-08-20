"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ExportButtons } from "@/components/shared/export-buttons";
import { usePermission } from "@/hooks/use-permission";
import { toast } from "@/components/ui/toaster";
import { initials, formatDate } from "@/lib/utils";
import type { EmployeeListItem, DepartmentItem } from "@/types";
import { EmployeeFormDialog } from "./employee-form-dialog";

const statusVariant: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  ACTIVE: "success", ON_LEAVE: "warning", SUSPENDED: "destructive", RESIGNED: "secondary", TERMINATED: "destructive",
};

export function EmployeesTab() {
  const canCreate = usePermission("employees.create");
  const canDelete = usePermission("employees.delete");

  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetch("/api/departments").then((r) => r.json()).then((j) => setDepartments(j.data ?? [])); }, []);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (search) params.set("search", search);
      if (departmentFilter !== "ALL") params.set("departmentId", departmentFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/employees?${params}`);
      const json = await res.json();
      setEmployees(res.ok ? json.data : []);
      setTotalPages(json.pagination?.totalPages ?? 1);
    } finally {
      setLoading(false);
    }
  }, [search, departmentFilter, statusFilter, page]);

  useEffect(() => {
    const t = setTimeout(fetchEmployees, 300);
    return () => clearTimeout(t);
  }, [fetchEmployees]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/employees/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        toast({ title: "Failed to remove employee", description: json.message, variant: "destructive" });
        return;
      }
      toast({ title: "Employee removed", variant: "success" });
      setDeleteTarget(null);
      fetchEmployees();
    } finally {
      setDeleting(false);
    }
  }

  const exportRows = employees.map((e) => [
    e.employeeCode, `${e.firstName} ${e.lastName}`, e.email, e.phone ?? "",
    e.departmentName, e.designationTitle, e.status, formatDate(e.joiningDate),
  ]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search employees..." className="pl-9" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} />
          </div>
          <Select value={departmentFilter} onValueChange={(v) => { setDepartmentFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Departments</SelectItem>
              {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {["ACTIVE", "ON_LEAVE", "SUSPENDED", "RESIGNED", "TERMINATED"].map((s) => (
                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <ExportButtons
            filename="employees"
            headers={["Code", "Name", "Email", "Phone", "Department", "Designation", "Status", "Joining Date"]}
            rows={exportRows}
          />
          {canCreate && <Button onClick={() => setFormOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> Add Employee</Button>}
        </div>
      </div>

      <Card className="p-4">
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : employees.length === 0 ? (
          <EmptyState title="No employees found" description="Add your first employee to get started." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Link href={`/hr/employees/${e.id}`} className="flex items-center gap-3 hover:underline">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{initials(e.firstName, e.lastName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{e.firstName} {e.lastName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{e.employeeCode}</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>{e.departmentName}</TableCell>
                    <TableCell>{e.designationTitle}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(e.joiningDate)}</TableCell>
                    <TableCell><Badge variant={statusVariant[e.status]}>{e.status.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild><Link href={`/hr/employees/${e.id}`}>View</Link></Button>
                      {canDelete && (
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(e)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={fetchEmployees} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove employee?"
        description={`This will soft-delete ${deleteTarget?.firstName} ${deleteTarget?.lastName}'s record.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
