import { doorMetadata } from "@/lib/fruma/doors";
import { PublicDoor } from "@/components/fruma/PublicDoor";

export const metadata = doorMetadata("retailers");

export default function RetailersPage() {
  return <PublicDoor role="retailers" />;
}
