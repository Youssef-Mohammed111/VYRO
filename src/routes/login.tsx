import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { safeRedirectPath } from "@/lib/vyro/validation";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { VyroLogo } from "@/components/vyro/logo";
import { LanguageToggle } from "@/components/vyro/language-toggle";
import { applyDocumentLocale, tr, useLocale } from "@/lib/vyro/locale";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  component: Login,
});

function Login() {
  const { redirect } = Route.useSearch();
  const after = safeRedirectPath(redirect, "/dashboard");
  const locale = useLocale((s) => s.locale);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "up") {
        const res = await authClient.signUp.email({ email, password, name: name || email.split("@")[0] });
        if (res.error) throw new Error(res.error.message || "Sign up failed");
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message || "Sign in failed");
      }
      window.location.assign(after);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-bg px-6 py-12 text-fg">
      <div className="absolute end-4 top-4">
        <LanguageToggle />
      </div>
      <Card className="w-full max-w-md space-y-6 p-8">
        <div className="flex justify-center">
          <VyroLogo variant="lockup" to={false} imgClassName="max-h-28 w-auto max-w-[220px]" />
        </div>
        <div>
          <h1 className="font-display text-3xl">
            {mode === "up" ? tr(locale, "createAccountTitle") : tr(locale, "loginTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted">{tr(locale, "loginSubtitle")}</p>
        </div>
        {authEnabled ? (
          <>
            <div className="space-y-2">
              {GROK_PROVIDERS.map((p) => (
                <Button
                  key={p.providerId}
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => signIn(p.providerId, { callbackURL: after })}
                >
                  {tr(locale, "continueWith")} {p.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-3 text-xs text-subtle">
              <span className="h-px flex-1 bg-border" />
              {tr(locale, "orEmail")}
              <span className="h-px flex-1 bg-border" />
            </div>
            <form className="space-y-3" onSubmit={onEmail}>
              {mode === "up" ? (
                <div className="space-y-1">
                  <Label htmlFor="name">{tr(locale, "nameLabel")}</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
              ) : null}
              <div className="space-y-1">
                <Label htmlFor="email">{tr(locale, "emailLabel")}</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">{tr(locale, "passwordLabel")}</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy
                  ? tr(locale, "pleaseWait")
                  : mode === "up"
                    ? tr(locale, "createAccount")
                    : tr(locale, "signIn")}
              </Button>
            </form>
            <button type="button" className="text-sm text-muted" onClick={() => setMode(mode === "up" ? "in" : "up")}>
              {mode === "up" ? tr(locale, "haveAccount") : tr(locale, "needAccount")}
            </button>
          </>
        ) : (
          <p className="text-sm text-muted">{tr(locale, "signInDisabled")}</p>
        )}
        <Link to="/" className="block text-sm text-muted">
          {tr(locale, "backHome")}
        </Link>
      </Card>
    </main>
  );
}
