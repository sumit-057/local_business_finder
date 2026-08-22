import { redirect } from "next/navigation";
import { DEFAULT_QUERY } from "@/lib/categories";

export default function Home() {
  redirect(`/search?q=${encodeURIComponent(DEFAULT_QUERY)}`);
}
