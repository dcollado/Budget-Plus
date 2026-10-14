import { sectionCardClass } from "@/lib/ui";

// Valid account but no household assigned yet (e.g. someone whose household
// was removed, or an account just created by hand).
export default function SinHogar() {
  return (
    <div className={sectionCardClass}>
      <p className="text-sm font-medium text-text">Your account does not have a household yet.</p>
      <p className="mt-1 text-sm text-text-muted">
        Ask whoever manages your household to invite you with your email, or write to
        the Budget Plus administrator.
      </p>
    </div>
  );
}
