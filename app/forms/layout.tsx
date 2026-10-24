import { requireOrganizer } from "@/lib/auth/session";

// Each screen draws its own single top bar: the list has the brand, a form has its title and tabs.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireOrganizer();
  return <div className="min-h-dvh">{children}</div>;
}
