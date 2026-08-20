"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Settings2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { usePermission } from "@/hooks/use-permission";
import type { SalaryStructureItem } from "@/types";
import { SalaryStructureFormDialog } from "./salary-structure-form-dialog";

export function SalaryStructureTab() {
  const canManage = usePermission("payroll.create");

  const [structures, setStructures] = useState<SalaryStructureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SalaryStructureItem | null>(null);

  const fetchStructures = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/salary-structures");
      const json = await res.json();
      setStructures(res.ok ? json.data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStructures(); }, [fetchStructures]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">Define basic salary, allowances, and deductions per employee before generating payroll.</p>
        {canManage && (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="mr-1.5 h-4 w-4" /> Set Salary Structure
          </Button>
        )}
      </div>

      <Card className="p-4">
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : structures.length === 0 ? (
          <EmptyState title="No salary structures defined" description="Set a salary structure for an employee to enable payroll generation." icon={<Settings2 className="h-6 w-6 text-muted-foreground" />} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Basic Salary</TableHead>
                <TableHead>Allowances</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {structures.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <p className="font-medium">{s.employeeName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{s.employeeCode}</p>
                  </TableCell>
                  <TableCell>Rs. {s.basicSalary.toLocaleString()}</TableCell>
                  <TableCell>Rs. {s.allowances.toLocaleString()}</TableCell>
                  <TableCell>Rs. {s.deductions.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {canManage && (
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(s); setFormOpen(true); }}>Edit</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <SalaryStructureFormDialog open={formOpen} onOpenChange={setFormOpen} structure={editing} onSaved={fetchStructures} />
    </div>
  );
}
