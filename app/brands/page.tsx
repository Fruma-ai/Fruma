import { doorMetadata } from "@/lib/fruma/doors";
import { PublicDoor } from "@/components/fruma/PublicDoor";

export const metadata = doorMetadata("brands");

export default function BrandsPage() {
  return <PublicDoor role="brands" />;
}
