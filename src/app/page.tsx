import { Workspace } from "@/components/search/workspace";

export const metadata = { title: "local_business_finder" };

/**
 * Landing page: location-first. We try device geolocation, then coarse
 * IP location, before falling back to the default Smart Query.
 */
export default function Home() {
  return <Workspace initialQuery="" preferLocation />;
}
