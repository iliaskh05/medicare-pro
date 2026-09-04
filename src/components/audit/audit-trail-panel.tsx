import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAuditTrail, type AuditTrailItem } from "@/lib/api/audit-trail";
import { formatCentreDateTime } from "@/lib/date";

/** Journal d'audit métier append-only (GET /api/audit-trail). */
export function AuditTrailPanel() {
  const [rows, setRows] = useState<AuditTrailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityType, setEntityType] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void fetchAuditTrail({
      ...(entityType.trim() ? { entityType: entityType.trim() } : {}),
      page: 0,
      size: 40,
      signal: controller.signal,
    })
      .then((page) => {
        if (!controller.signal.aborted) setRows(page.content ?? []);
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) {
          setRows([]);
          setError(e instanceof Error ? e.message : "Journal indisponible");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [entityType, reloadKey]);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Journal d&apos;audit (immutable)</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Filtrer entityType (PATIENT, EXAMEN…)"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="w-64"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={loading}
          >
            <RefreshCw className="mr-1.5 size-4" /> Actualiser
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune entrée d&apos;audit.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entité</TableHead>
                  <TableHead>Utilisateur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums">
                      {r.createdAt ? formatCentreDateTime(r.createdAt) : "—"}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{r.action}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[r.entityType, r.entityId].filter(Boolean).join(" · ") || "—"}
                    </TableCell>
                    <TableCell className="text-sm">{r.userEmail ?? r.userId ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
