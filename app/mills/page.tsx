import { doorMetadata } from "@/lib/fruma/doors";
import { PublicDoor } from "@/components/fruma/PublicDoor";

export const metadata = doorMetadata("mills");

export default function MillsPage() {
  return <PublicDoor role="mills" />;
}
