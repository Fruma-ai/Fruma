"use client";

import { BrandSetup } from "./BrandSetup";
import { BrandShell } from "./BrandShell";
import { CatalogView } from "./CatalogView";
import { DesignView } from "./DesignView";
import { DeskView } from "./DeskView";
import { EntryGate } from "./EntryGate";
import { FeedsView } from "./FeedsView";
import { MillMapView } from "./MillMapView";
import { MillProfileView } from "./MillProfileView";
import { MillReviewView } from "./MillReviewView";
import { MillShell } from "./MillShell";
import { MillUploadView } from "./MillUploadView";
import { ProductView } from "./ProductView";
import { FrumaProvider, useFruma } from "./store";
import { SuppliersView } from "./SuppliersView";
import { Toast } from "./Toast";

function Rooms() {
  const { mode, brandRoom, millRoom, setupPhase } = useFruma();

  if (mode === "entry") return <EntryGate />;

  if (mode === "mill") {
    return (
      <MillShell>
        <div hidden={millRoom !== "profile"}>
          <MillProfileView />
        </div>
        <div hidden={millRoom !== "upload"}>
          <MillUploadView />
        </div>
        <div hidden={millRoom !== "map"}>
          <MillMapView />
        </div>
        <div hidden={millRoom !== "review"}>
          <MillReviewView />
        </div>
        <div hidden={millRoom !== "catalog"}>
          <CatalogView />
        </div>
      </MillShell>
    );
  }

  if (setupPhase !== "ready") return <BrandSetup />;

  return (
    <BrandShell>
      <div hidden={brandRoom !== "design"}>
        <DesignView />
      </div>
      <div hidden={brandRoom !== "desk"}>
        <DeskView />
      </div>
      <div hidden={brandRoom !== "product"}>
        <ProductView />
      </div>
      <div hidden={brandRoom !== "feeds"}>
        <FeedsView />
      </div>
      <div hidden={brandRoom !== "suppliers"}>
        <SuppliersView />
      </div>
    </BrandShell>
  );
}

export function FrumaApp() {
  return (
    <FrumaProvider>
      <Rooms />
      <Toast />
    </FrumaProvider>
  );
}
