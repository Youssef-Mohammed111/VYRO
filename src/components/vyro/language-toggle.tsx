import { Languages } from "lucide-react";
import { applyDocumentLocale, t, useLocale } from "@/lib/vyro/locale";
import { cn } from "@/lib/utils";

type Props = {
  variant?: "icon" | "chip";
  className?: string;
};

/** System-wide Arabic ↔ English toggle. Persists + updates html lang/dir. */
export function LanguageToggle({ variant = "chip", className }: Props) {
  const locale = useLocale((s) => s.locale);
  const toggle = useLocale((s) => s.toggle);

  const onClick = () => {
    const next = locale === "ar" ? "en" : "ar";
    toggle();
    applyDocumentLocale(next);
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn("grid size-11 place-items-center text-muted hover:text-fg", className)}
        aria-label={t(locale, "تبديل اللغة", "Toggle language")}
        title={locale === "ar" ? "English" : "عربي"}
      >
        <Languages className="size-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-xs font-medium text-muted hover:border-primary hover:text-fg",
        className,
      )}
      aria-label={t(locale, "تبديل اللغة", "Toggle language")}
    >
      <Languages className="size-3.5" />
      <span>{locale === "ar" ? "EN" : "عر"}</span>
    </button>
  );
}
