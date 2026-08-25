import { useEffect, useState } from "react";
import { AlertTriangle, Banknote, CalendarCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { IconTile } from "@/components/ui-kit";
import { fetchWorklist } from "@/lib/api/worklist";
import { toLocalDateKey } from "@/lib/date";
import { formatMAD } from "@/types/domain";

/**
 * Cartes de synthèse de la direction (Mr Adnane) :
 * examens du jour, chiffre d'affaires encaissé et anomalies potentielles.
 */
export function DirectionStats({
  anomaliesCount,
  showFinance = true,
}: {
  anomaliesCount: number;
  showFinance?: boolean;
}) {
  const [examens, setExamens] = useState<number | null>(null);
  const [ca, setCa] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchWorklist({ date: toLocalDateKey() }, controller.signal)
      .then((rows) => {
        setExamens(rows.length);
        setCa(
          rows
            .filter((r) => r.paiement === "paye")
            .reduce((sum, r) => sum + (r.montant ?? 0), 0),
        );
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setExamens(null);
        setCa(null);
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardContent className="flex items-start gap-4 p-5">
          <IconTile tone="primary">
            <CalendarCheck className="size-5" />
          </IconTile>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Examens du jour
            </p>
            <p className="mt-1 text-2xl font-bold">{examens ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Worklist consolidée</p>
          </div>
        </CardContent>
      </Card>

      {showFinance ? (
        <Card>
          <CardContent className="flex items-start gap-4 p-5">
            <IconTile tone="success">
              <Banknote className="size-5" />
            </IconTile>
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Chiffre d&apos;affaires encaissé
              </p>
              <p className="mt-1 text-2xl font-bold">{ca === null ? "—" : formatMAD(ca)}</p>
              <p className="text-xs text-muted-foreground">Actes payés du jour</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="flex items-start gap-4 p-5">
          <IconTile tone="warning">
            <AlertTriangle className="size-5" />
          </IconTile>
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Anomalies potentielles
            </p>
            <p className="mt-1 text-2xl font-bold">{anomaliesCount}</p>
            <p className="text-xs text-muted-foreground">Signalées par le clustering</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
