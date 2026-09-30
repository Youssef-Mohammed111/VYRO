import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MarketingShell } from "@/components/vyro/site-chrome";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { submitDemoRequest } from "@/lib/vyro/public";

export const Route = createFileRoute("/contact")({ component: Page });

function Page() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await submitDemoRequest({
        data: {
          name: String(fd.get("name") || ""),
          email: String(fd.get("email") || ""),
          phone: String(fd.get("phone") || ""),
          business: String(fd.get("business") || ""),
          message: String(fd.get("message") || ""),
        },
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MarketingShell>
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-2">
        <div>
          <h1 className="font-display text-5xl">Request a Demo</h1>
          <p className="mt-4 text-muted">
            Tell us about the business. We will show the platform with a tenant configured for your industry.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <a href="https://wa.me/201050034183" target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            </Button>
            <Button asChild variant="secondary">
              <a href="tel:+201050034183">Call 01050034183</a>
            </Button>
            <Button asChild variant="secondary">
              <a href="mailto:vyro.techpro1@gmail.com">Email</a>
            </Button>
          </div>
        </div>
        <Card>
          {sent ? (
            <p className="text-sm text-muted">Received. VYRO will follow up on the contact you left.</p>
          ) : (
            <form className="space-y-3" onSubmit={onSubmit}>
              <div className="space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="business">Business</Label>
                <Input id="business" name="business" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" name="message" />
              </div>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <Button type="submit" disabled={busy}>
                {busy ? "Sending…" : "Send request"}
              </Button>
            </form>
          )}
        </Card>
      </main>
    </MarketingShell>
  );
}
