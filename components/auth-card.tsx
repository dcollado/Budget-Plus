import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useT } from "@/lib/i18n/client";

export const authInputClass =
  "h-12 w-full rounded-xl border border-line bg-surface-raised px-4 text-sm text-text outline-none transition placeholder:text-text-muted/60 focus:border-sage focus:ring-4 focus:ring-sage/10 disabled:opacity-60";

export const authButtonClass =
  "flex h-12 w-full items-center justify-center rounded-xl bg-rust px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

// Shared frame for invitation, forgot and reset pages (public pages).
export function AuthCard({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-5 py-10 text-text">
      <div className="w-full max-w-md">
        <div className="mb-3 flex justify-end">
          <LanguageSwitcher />
        </div>
        <div className="rounded-[28px] border border-line bg-surface p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="mb-6">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-surface-raised text-sage">
              <LockKeyhole size={22} />
            </div>
            <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">{titulo}</h1>
            {subtitulo ? (
              <p className="mt-2 text-sm leading-6 text-text-muted">{subtitulo}</p>
            ) : null}
          </div>
          {children}
        </div>
        <p className="mt-5 text-center text-sm">
          <Link href="/login" className="text-text-muted underline hover:text-text">
            {t("auth.backToSignIn")}
          </Link>
        </p>
      </div>
    </main>
  );
}

export function AuthError({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-rust/30 bg-rust/10 px-4 py-3 text-sm text-rust"
    >
      {children}
    </div>
  );
}
