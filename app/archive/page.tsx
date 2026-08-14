import { redirect } from "next/navigation";
import { getAvailableArchiveMonths } from "@/components/archiveUtils";

export default function ArchiveIndexPage() {
  const latestArchive = getAvailableArchiveMonths()[0];
  redirect(latestArchive?.href ?? "/");
}
