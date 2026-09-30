import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { createQr, listQr, setQrActive } from "@/lib/vyro/admin";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export const Route = createFileRoute("/dashboard/qr")({
  loader: () => listQr({ data: {} }),
  component: QrPage,
});

const DESTINATIONS = [
  ["menu", "Menu"],
  ["home", "Home page"],
  ["offers", "Offers"],
  ["location", "Location"],
  ["checkout", "Checkout"],
] as const;

function QrPage() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const codes = data.codes as Record<string, unknown>[];
  const nfc = data.nfc as Record<string, unknown>[];
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createQr({
        data: {
          label: String(fd.get("label")),
          type: String(fd.get("type")) as "table",
          destination: String(fd.get("destination") || "menu") as "menu",
          tableNumber: String(fd.get("tableNumber") || "") || undefined,
        },
      });
      (e.target as HTMLFormElement).reset();
      await router.invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create");
    }
  }
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">QR / NFC</h1>
      <p className="text-sm text-muted">
        Printed QR codes keep working if the template changes. NFC tags are programmed externally with the destination URL.
      </p>
      <form className="flex flex-wrap gap-2" onSubmit={add}>
        <Input name="label" placeholder="TABLE 05" required className="max-w-40" />
        <Input name="tableNumber" placeholder="05" className="max-w-24" />
        <select name="type" className="h-11 rounded-[length:var(--radius-sm)] border border-border bg-elevated px-2 text-sm">
          <option value="table">table</option>
          <option value="counter">counter</option>
          <option value="menu">menu</option>
          <option value="branch">branch</option>
        </select>
        <select name="destination" className="h-11 rounded-[length:var(--radius-sm)] border border-border bg-elevated px-2 text-sm">
          {DESTINATIONS.map(([v, l]) => (
            <option key={v} value={v}>
              → {l}
            </option>
          ))}
        </select>
        <Button type="submit">Generate</Button>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {codes.map((c) => (
          <QrCard
            key={String(c.id)}
            id={String(c.id)}
            active={c.active === true}
            token={String(c.token)}
            label={String(c.label)}
            origin={origin}
            scans={Number(c.scan_count)}
            table={c.table_number as string | null}
            onChanged={() => router.invalidate()}
          />
        ))}
      </div>
      <h2 className="font-display text-2xl">NFC destinations</h2>
      {nfc.map((n) => (
        <Card key={String(n.id)} className="flex items-center justify-between">
          <div>
            <p>{String(n.label)}</p>
            <p className="text-xs text-muted break-all">{origin}/q/{String(n.token)}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigator.clipboard.writeText(`${origin}/q/${String(n.token)}`)}
          >
            Copy NFC URL
          </Button>
        </Card>
      ))}
    </div>
  );
}

function QrCard({
  id,
  active,
  token,
  label,
  origin,
  scans,
  table,
  onChanged,
}: {
  id: string;
  active: boolean;
  token: string;
  label: string;
  origin: string;
  scans: number;
  table: string | null;
  onChanged: () => void;
}) {
  const [src, setSrc] = useState("");
  const url = `${origin}/q/${token}`;
  useEffect(() => {
    void QRCode.toDataURL(url, { margin: 1, width: 640, errorCorrectionLevel: "M" }).then(setSrc);
  }, [url]);
  return (
    <Card className="text-center">
      <p className="font-display text-xl">{label}</p>
      {table ? <p className="text-xs text-muted">Table {table}</p> : null}
      {src ? <img src={src} alt={label} className="mx-auto mt-3 size-40 bg-fg p-2" /> : null}
      <p className="mt-2 text-xs text-muted">{scans} scans</p>
      <p className="mt-1 break-all text-[11px] text-subtle">{url}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Button variant="secondary" onClick={() => navigator.clipboard.writeText(url)}>
          Copy URL
        </Button>
        <Button
          variant="secondary"
          disabled={!src}
          onClick={() => {
            const a = document.createElement("a");
            a.href = src;
            a.download = `qr-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
            a.click();
          }}
        >
          PNG
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            try {
              await setQrActive({ data: { id, active: !active } });
              onChanged();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Failed");
            }
          }}
        >
          {active ? "Disable" : "Enable"}
        </Button>
      </div>
      {!active ? <p className="mt-2 text-xs text-warning">Disabled — scans redirect home</p> : null}
    </Card>
  );
}

void Label;
