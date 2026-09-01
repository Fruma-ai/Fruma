import { FrumaApp } from "@/components/fruma/FrumaApp";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function AppPage() {
  return <FrumaApp />;
}
