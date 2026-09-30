import { create } from "zustand";
import { persist } from "zustand/middleware";
import { computeLine, computeTotals, MAX_LINE_QTY, type CartModifier } from "./commerce";

export type CartLine = {
  key: string;
  itemId: string;
  slug: string;
  nameEn: string;
  nameAr: string;
  imageUrl: string | null;
  variantId?: string;
  variantEn?: string;
  variantAr?: string;
  unitPrice: number;
  quantity: number;
  modifiers: CartModifier[];
};

type CartState = {
  slug: string | null;
  table: string | null;
  lines: CartLine[];
  setContext: (slug: string, table?: string | null) => void;
  add: (line: Omit<CartLine, "key">) => void;
  setQty: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

function lineKey(line: Omit<CartLine, "key" | "quantity">) {
  const mods = [...line.modifiers].map((m) => m.id).sort().join(",");
  return `${line.itemId}:${line.variantId ?? ""}:${mods}`;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      slug: null,
      table: null,
      lines: [],
      setContext: (slug, table) => {
        const cur = get();
        if (cur.slug && cur.slug !== slug) {
          set({ slug, table: table ?? null, lines: [] });
          return;
        }
        set({ slug, table: table ?? cur.table ?? null });
      },
      add: (line) => {
        const key = lineKey(line);
        const existing = get().lines.find((l) => l.key === key);
        if (existing) {
          set({
            lines: get().lines.map((l) =>
              l.key === key ? { ...l, quantity: Math.min(MAX_LINE_QTY, l.quantity + line.quantity) } : l,
            ),
          });
          return;
        }
        set({ lines: [...get().lines, { ...line, key }] });
      },
      setQty: (key, quantity) => {
        if (quantity <= 0) {
          set({ lines: get().lines.filter((l) => l.key !== key) });
          return;
        }
        set({ lines: get().lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(MAX_LINE_QTY, Math.floor(quantity)) } : l)) });
      },
      remove: (key) => set({ lines: get().lines.filter((l) => l.key !== key) }),
      clear: () => set({ lines: [] }),
    }),
    {
      name: "vyro-cart",
      version: 1,
      // A cart older than a day is almost certainly abandoned — its prices/items may be stale.
      partialize: (state) => ({ slug: state.slug, table: state.table, lines: state.lines, savedAt: Date.now() }),
      merge: (persisted, current) => {
        const p = persisted as { slug?: string | null; table?: string | null; lines?: CartLine[]; savedAt?: number } | undefined;
        if (!p || !Array.isArray(p.lines)) return current;
        if (p.savedAt && Date.now() - p.savedAt > 24 * 3_600_000) return current;
        return { ...current, slug: p.slug ?? null, table: p.table ?? null, lines: p.lines };
      },
    },
  ),
);

export function cartTotals(lines: CartLine[], deliveryFee = 0) {
  const computed = lines.map((l) =>
    computeLine({
      itemId: l.itemId,
      variantId: l.variantId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      modifiers: l.modifiers,
    }),
  );
  return computeTotals({ lines: computed, deliveryFee });
}

export function cartCount(lines: CartLine[]) {
  return lines.reduce((s, l) => s + l.quantity, 0);
}
