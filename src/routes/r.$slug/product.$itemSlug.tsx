import { createFileRoute, getRouteApi, notFound, useNavigate } from "@tanstack/react-router";
import { presetFor } from "@/lib/vyro/presets";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { t, useLocale } from "@/lib/vyro/locale";
import { useCart } from "@/lib/vyro/cart";
import { MAX_LINE_QTY } from "@/lib/vyro/commerce";
import { selectionErrorMessage, validateSelections } from "@/lib/vyro/order-flow";
import { Button } from "@/components/ui/button";
import { trackPublicEvent } from "@/lib/vyro/public";

const parent = getRouteApi("/r/$slug");

export const Route = createFileRoute("/r/$slug/product/$itemSlug")({
  component: Product,
});

function Product() {
  const tenant = parent.useLoaderData();
  const { itemSlug, slug } = Route.useParams();
  const item = tenant.items.find((i) => i.slug === itemSlug);
  const locale = useLocale((s) => s.locale);
  const add = useCart((s) => s.add);
  const navigate = useNavigate();
  if (!item) throw notFound();
  const [variantId, setVariantId] = useState(item.variants.find((v) => v.available)?.id ?? item.variants[0]?.id);
  const [mods, setMods] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const variant = item.variants.find((v) => v.id === variantId);
  const selectedMods = item.modifierGroups.flatMap((g) => g.modifiers).filter((m) => mods.includes(m.id));
  const unit = (variant?.price ?? item.price) + selectedMods.reduce((s, m) => s + m.priceDelta, 0);
  const total = unit * qty;

  useEffect(() => {
    void trackPublicEvent({ data: { slug, event: "product_view", itemId: item.id } });
  }, [item.id, slug]);

  // Single-choice groups (max 1) behave like radio buttons; multi groups like checkboxes.
  function toggle(id: string, groupId: string) {
    const group = item!.modifierGroups.find((g) => g.id === groupId);
    setMods((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (group && group.maxSelect === 1) {
        const siblings = group.modifiers.map((m) => m.id);
        return [...cur.filter((x) => !siblings.includes(x)), id];
      }
      return [...cur, id];
    });
  }

  function addToCart() {
    const picked = validateSelections(item!, variantId, mods);
    if (!picked.ok) {
      const err = picked.error;
      const groupId = err.code === "too_many" || err.code === "too_few" ? err.groupId : undefined;
      const group = groupId ? item!.modifierGroups.find((g) => g.id === groupId) : undefined;
      toast.error(selectionErrorMessage(locale, picked.error, group ? t(locale, group.nameAr, group.nameEn) : ""));
      return;
    }
    add({
      itemId: item!.id,
      slug: item!.slug,
      nameEn: item!.nameEn,
      nameAr: item!.nameAr,
      imageUrl: item!.imageUrl,
      variantId: variant?.id,
      variantEn: variant?.nameEn,
      variantAr: variant?.nameAr,
      unitPrice: variant?.price ?? item!.price,
      quantity: qty,
      modifiers: selectedMods,
    });
    void trackPublicEvent({ data: { slug, event: "add_to_cart", itemId: item!.id } });
    void navigate({ to: "/r/$slug/cart", params: { slug } });
  }

  return (
    <div>
      {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-72 w-full object-cover" /> : null}
      <div className="space-y-4 p-4">
        <div>
          <h1 className="font-display text-3xl">{t(locale, item.nameAr, item.nameEn)}</h1>
          <p className="mt-2 text-sm text-muted">{t(locale, item.descAr || "", item.descEn || "")}</p>
        </div>
        {item.variants.length ? (
          <div className="flex gap-2">
            {item.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={!v.available}
                onClick={() => setVariantId(v.id)}
                className={`rounded-full border px-3 py-2 text-xs disabled:opacity-40 ${variantId === v.id ? "border-primary bg-primary text-primary-fg" : "border-border"}`}
              >
                {t(locale, v.nameAr, v.nameEn)} · {v.price}
              </button>
            ))}
          </div>
        ) : null}
        {item.modifierGroups.map((g) => (
          <div key={g.id}>
            <p className="text-sm text-muted">
              {t(locale, g.nameAr, g.nameEn)}
              {g.required ? <span className="text-primary"> *</span> : null}
              {g.maxSelect > 1 ? <span className="text-xs text-subtle"> ({t(locale, `حتى ${g.maxSelect}`, `up to ${g.maxSelect}`)})</span> : null}
            </p>
            <div className="mt-2 space-y-2">
              {g.modifiers.map((m) => (
                <label key={m.id} className="flex items-center justify-between rounded-[length:var(--radius-md)] bg-elevated px-3 py-3 text-sm">
                  <span>
                    {t(locale, m.nameAr, m.nameEn)}
                    <span className="text-muted"> +{m.priceDelta}</span>
                  </span>
                  <input type={g.maxSelect === 1 ? "radio" : "checkbox"} name={g.id} checked={mods.includes(m.id)} onChange={() => toggle(m.id, g.id)} />
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="icon" onClick={() => setQty(Math.max(1, qty - 1))}>
              −
            </Button>
            <span>{qty}</span>
            <Button variant="secondary" size="icon" disabled={qty >= MAX_LINE_QTY} onClick={() => setQty(Math.min(MAX_LINE_QTY, qty + 1))}>
              +
            </Button>
          </div>
          <p className="font-display text-2xl">
            {total} {tenant.profile.currency}
          </p>
        </div>
        {presetFor(tenant.templateFamily).kind === "showcase" ? (
          <Button asChild className="w-full">
            <a
              href={`https://wa.me/${(tenant.profile.whatsapp || "").replace(/\D/g, "")}?text=${encodeURIComponent(
                `${t(locale, "أرغب في الاستفسار عن:", "I'd like to ask about:")} ${t(locale, item.nameAr, item.nameEn)}`,
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              {t(locale, presetFor(tenant.templateFamily).addAr, presetFor(tenant.templateFamily).addEn)}
            </a>
          </Button>
        ) : (
          <Button className="w-full" disabled={!item.available} onClick={addToCart}>
            {item.available
              ? t(locale, presetFor(tenant.templateFamily).addAr, presetFor(tenant.templateFamily).addEn)
              : t(locale, "غير متاح حالياً", "Currently unavailable")}
          </Button>
        )}
      </div>
    </div>
  );
}
