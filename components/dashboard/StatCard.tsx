import type { LucideIcon } from "lucide-react";

type Accento = "sage" | "rust" | "gold";

const accentClasses: Record<Accento, { icon: string; iconBg: string }> = {
  sage: { icon: "text-sage", iconBg: "bg-sage-soft" },
  rust: { icon: "text-rust", iconBg: "bg-rust-soft" },
  gold: { icon: "text-gold", iconBg: "bg-gold-soft" },
};

type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
  accent: Accento;
  sub?: string;
  detalles?: { label: string; value: string }[];
};

export default function StatCard({ label, value, icon: Icon, accent, sub, detalles }: StatCardProps) {
  const { icon, iconBg } = accentClasses[accent];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
          {label}
        </span>
        <span className={`flex items-center justify-center rounded-full p-1.5 ${iconBg} ${icon}`}>
          <Icon size={14} />
        </span>
      </div>
      <span className="font-mono text-2xl font-semibold text-text sm:text-3xl">
        {value}
      </span>
      {sub ? <span className="text-xs text-text-muted">{sub}</span> : null}
      {detalles && detalles.length > 0 ? (
        <div className="flex flex-col gap-1 border-t border-line pt-2">
          {detalles.map((d) => (
            <div key={d.label} className="flex items-center justify-between text-xs">
              <span className="text-text-muted">{d.label}</span>
              <span className="font-mono text-text">{d.value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
