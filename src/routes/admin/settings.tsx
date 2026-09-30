import { createFileRoute } from "@tanstack/react-router";
import { getPlatformSettings } from "@/lib/vyro/public";
import { updatePlatformSettings } from "@/lib/vyro/admin";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  loader: () => getPlatformSettings(),
  component: Page,
});

function Page() {
  const settings = Route.useLoaderData();
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    for (const [key, value] of fd.entries()) {
      await updatePlatformSettings({ data: { key, value: String(value) } });
    }
    toast.success("Saved");
  }
  return (
    <form className="grid max-w-xl gap-3" onSubmit={save}>
      <h1 className="font-display text-3xl">Platform settings</h1>
      {["company_name", "tagline", "owner_name", "contact_email", "contact_phone", "contact_whatsapp", "hero_line"].map((key) => (
        <div key={key}>
          <Label htmlFor={key}>{key}</Label>
          <Input id={key} name={key} defaultValue={settings[key] ?? ""} />
        </div>
      ))}
      <Button type="submit">Save</Button>
    </form>
  );
}
