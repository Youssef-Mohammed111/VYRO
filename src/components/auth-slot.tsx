import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export function AuthSlot({ loginLabel = "Sign in" }: { loginLabel?: string }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <div className="h-8 w-8 animate-pulse rounded-full bg-elevated" />;
  if (user) return <UserButton />;
  return (
    <Link
      to="/login"
      className="inline-flex h-11 items-center rounded-[length:var(--radius-md)] border border-border px-4 text-sm text-fg"
    >
      {loginLabel}
    </Link>
  );
}
