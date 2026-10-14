import { sectionCardClass } from "@/lib/ui";
import { useT } from "@/lib/i18n/client";

// Valid account but no household assigned yet (e.g. someone whose household
// was removed, or an account just created by hand).
export default function SinHogar() {
  const t = useT();
  return (
    <div className={sectionCardClass}>
      <p className="text-sm font-medium text-text">{t("noHousehold.title")}</p>
      <p className="mt-1 text-sm text-text-muted">
        {t("noHousehold.body")}
      </p>
    </div>
  );
}
