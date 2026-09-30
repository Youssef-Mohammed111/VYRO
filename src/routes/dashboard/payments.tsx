import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, ExternalLink, Pencil } from "lucide-react";
import { listPaymentMethods, setPaymentMethodEnabled, upsertPaymentMethod } from "@/lib/vyro/admin";
import { PAYMENT_PROVIDER_TYPES, PAYMENT_TYPE_LABEL } from "@/lib/vyro/payment-types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/payments")({
  loader: () => listPaymentMethods({ data: {} }),
  component: Page,
});

type MethodRow = Record<string, unknown>;

function Page() {
  const methods = Route.useLoaderData() as MethodRow[];
  const [editing, setEditing] = useState<MethodRow | "new" | null>(null);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const id = editing && editing !== "new" ? String(editing.id) : undefined;
    try {
      await upsertPaymentMethod({
        data: {
          id,
          type: String(fd.get("type")),
          nameEn: String(fd.get("nameEn")),
          nameAr: String(fd.get("nameAr")),
          descEn: String(fd.get("descEn") || ""),
          descAr: String(fd.get("descAr") || ""),
          paymentUrl: String(fd.get("paymentUrl") || ""),
          deepLinkUrl: String(fd.get("deepLinkUrl") || ""),
          accountIdentifier: String(fd.get("accountIdentifier") || ""),
          accountName: String(fd.get("accountName") || ""),
          logoUrl: String(fd.get("logoUrl") || ""),
          instructionsEn: String(fd.get("instructionsEn") || ""),
          instructionsAr: String(fd.get("instructionsAr") || ""),
          requiresProof: fd.get("requiresProof") === "on",
          requiresManualVerification: fd.get("requiresManualVerification") === "on",
          enabled: fd.get("enabled") === "on",
          sortOrder: Number(fd.get("sortOrder") || 0),
        },
      });
      toast.success("Payment method saved");
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Payment methods</h1>
          <p className="mt-1 text-sm text-muted">
            Configurable methods for this business. Customers see cards — not raw URLs. Paid only after proof review or
            a real gateway webhook.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>Add payment method</Button>
      </div>
      {methods.map((m) => {
        const enabled = Boolean(m.enabled);
        const url = m.payment_url ? String(m.payment_url) : "";
        return (
          <Card key={String(m.id)} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {String(m.name_en)} / {String(m.name_ar)}
                </p>
                <p className="text-xs text-muted">{PAYMENT_TYPE_LABEL[String(m.type)] ?? String(m.type)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={enabled ? "success" : "muted"}>{enabled ? "Enabled" : "Disabled"}</Badge>
                {m.requires_proof ? <Badge tone="warning">Proof</Badge> : null}
                {m.requires_manual_verification ? <Badge>Manual verify</Badge> : null}
              </div>
            </div>
            {url ? <p className="text-sm text-muted">External payment link configured</p> : <p className="text-sm text-muted">No external link</p>}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditing(m)}>
                <Pencil className="size-3.5" /> Edit
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  await setPaymentMethodEnabled({ data: { id: String(m.id), enabled: !enabled } });
                  toast.success(enabled ? "Disabled" : "Enabled");
                  window.location.reload();
                }}
              >
                {enabled ? "Disable" : "Enable"}
              </Button>
              {url ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await navigator.clipboard.writeText(url);
                      toast.success("Payment link copied");
                    }}
                  >
                    <Copy className="size-3.5" /> Copy link
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <a href={url} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-3.5" /> Open
                    </a>
                  </Button>
                </>
              ) : null}
            </div>
          </Card>
        );
      })}
      {editing ? (
        <Card>
          <h2 className="font-display text-xl">{editing === "new" ? "New payment method" : "Edit payment method"}</h2>
          <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={save}>
            <Field name="nameEn" label="Name EN" defaultValue={str(editing, "name_en")} />
            <Field name="nameAr" label="Name AR" defaultValue={str(editing, "name_ar")} />
            <div>
              <Label htmlFor="type">Provider type</Label>
              <select
                id="type"
                name="type"
                defaultValue={str(editing, "type") || "EXTERNAL_LINK"}
                className="mt-1 flex h-11 w-full rounded-[length:var(--radius-sm)] border border-border bg-elevated px-3 text-sm"
              >
                {PAYMENT_PROVIDER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {PAYMENT_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <Field name="sortOrder" label="Display order" type="number" defaultValue={str(editing, "sort_order") || "0"} />
            <Field name="paymentUrl" label="Payment URL" defaultValue={str(editing, "payment_url")} required={false} />
            <Field name="deepLinkUrl" label="Deep link URL" defaultValue={str(editing, "deep_link_url")} required={false} />
            <Field name="accountName" label="Account display name" defaultValue={str(editing, "account_name")} required={false} />
            <Field name="accountIdentifier" label="Account / number" defaultValue={str(editing, "account_identifier")} required={false} />
            <Field name="logoUrl" label="Logo URL" defaultValue={str(editing, "logo_url")} required={false} />
            <div className="md:col-span-2">
              <Label htmlFor="descEn">Description EN</Label>
              <Input id="descEn" name="descEn" defaultValue={str(editing, "desc_en")} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="descAr">Description AR</Label>
              <Input id="descAr" name="descAr" defaultValue={str(editing, "desc_ar")} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="instructionsEn">Instructions EN</Label>
              <Textarea id="instructionsEn" name="instructionsEn" defaultValue={str(editing, "instructions_en")} />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="instructionsAr">Instructions AR</Label>
              <Textarea id="instructionsAr" name="instructionsAr" defaultValue={str(editing, "instructions_ar")} />
            </div>
            <label className="text-sm">
              <input type="checkbox" name="requiresProof" defaultChecked={editing === "new" || Boolean((editing as MethodRow).requires_proof)} /> Requires
              proof
            </label>
            <label className="text-sm">
              <input
                type="checkbox"
                name="requiresManualVerification"
                defaultChecked={editing === "new" || Boolean((editing as MethodRow).requires_manual_verification)}
              />{" "}
              Manual verification
            </label>
            <label className="text-sm">
              <input type="checkbox" name="enabled" defaultChecked={editing === "new" || Boolean((editing as MethodRow).enabled)} /> Enabled
            </label>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit">Save</Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}

function str(row: MethodRow | "new", key: string) {
  if (row === "new") return "";
  const v = row[key];
  return v == null ? "" : String(v);
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
  required = true,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const isName = name === "nameEn" || name === "nameAr";
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} required={isName && required} />
    </div>
  );
}
