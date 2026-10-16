"use client";

import { useEffect } from "react";
import { useT } from "@/lib/i18n/client";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error("Client render error:", error.digest, error.message);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h2 className="font-display text-xl">{t("common.errorTitle")}</h2>
      <p className="mt-2 text-sm text-text/70">{t("common.errorBody")}</p>
      <button
        onClick={() => unstable_retry()}
        className="mt-6 rounded-lg border border-text/20 px-4 py-2 text-sm"
      >
        {t("common.retry")}
      </button>
    </div>
  );
}
