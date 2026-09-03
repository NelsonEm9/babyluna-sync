import Link from "next/link";

const TABS = [
  { key: "rail", label: "Rail", href: "/dashboard?view=rail" },
  { key: "category", label: "By category", href: "/dashboard?view=category" },
  { key: "settings", label: "Settings", href: "/settings" },
] as const;

export function BottomTabBar({ active }: { active: "rail" | "category" | "settings" }) {
  return (
    <nav className="sticky bottom-0 flex gap-1.5 border-t border-border bg-surface p-2">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`flex min-h-[44px] flex-1 items-center justify-center rounded-btn text-body font-medium ${
            active === tab.key ? "bg-bg text-text-primary" : "text-text-secondary"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
