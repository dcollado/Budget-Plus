import { redirect } from "next/navigation";

// Pivot: we focus only on /presupuesto for now. The original dashboard
// was not deleted — it still lives in app/_dashboard-oculto/page.tsx (a
// Next "private folder", outside the router) in case we pick it up again.
export default function Home() {
  redirect("/presupuesto");
}
