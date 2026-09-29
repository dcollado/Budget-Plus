import { redirect } from "next/navigation";

// Pivot: nos enfocamos solo en /presupuesto por ahora. El dashboard
// original no se borró — sigue en app/_dashboard-oculto/page.tsx (una
// "private folder" de Next, fuera del router) por si lo retomamos.
export default function Home() {
  redirect("/presupuesto");
}
