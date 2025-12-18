// HomePage: MVP -> send users to /login as the default entry point.

import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/login");
}
