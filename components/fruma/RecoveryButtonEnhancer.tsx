"use client";

import { useEffect, useRef, useState } from "react";

type ModalState = { title: string; body: string } | null;

export function RecoveryButtonEnhancer() {
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState("");
  const filterActive = useRef(false);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    function showToast(message: string) {
      setToast(message);
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setToast(""), 2200);
    }

    function openModal(title: string, body: string) {
      setModal({ title, body });
    }

    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button") as HTMLButtonElement | null;
      if (!button) return;

      const label = (button.textContent || "").replace(/\s+/g, " ").trim();

      if (label === "Save notes") {
        const textarea = button.closest("section")?.querySelector("textarea") as HTMLTextAreaElement | null;
        if (textarea) {
          window.localStorage.setItem("fruma-pr14-development-notes", textarea.value);
          showToast("Development notes saved");
        }
        return;
      }

      if (label === "Filters" || label === "Clear filters") {
        const cards = Array.from(document.querySelectorAll<HTMLElement>(".fx-source-grid .fx-supplier"));
        filterActive.current = !filterActive.current;
        cards.forEach((card) => {
          const isPreferred = (card.textContent || "").toLowerCase().includes("preferred");
          card.style.display = filterActive.current && !isPreferred ? "none" : "";
        });
        button.innerHTML = filterActive.current ? "Clear filters" : "Filters";
        showToast(filterActive.current ? "Showing preferred suppliers" : "Supplier filters cleared");
        return;
      }

      if (label === "Open response workspace") {
        const card = button.closest("section");
        const requestTitle = card?.querySelector("h2")?.textContent || "Selected request";
        openModal(
          "Response workspace",
          `${requestTitle} is open for response. Review the request details, confirm current MOQ and lead time, then prepare the mill response before sending.`
        );
        return;
      }

      if (label === "Open evidence record") {
        const card = button.closest("article");
        const certification = card?.querySelector("h2")?.textContent || "Evidence record";
        const status = card?.querySelector(".fx-line span")?.textContent || "Current";
        openModal(
          certification,
          `Evidence status: ${status}. Scope remains attached to the mill site and applicable quality families; evidence is reviewed separately from capability and commercial claims.`
        );
        return;
      }

      if (label === "Open") {
        const card = button.closest("article");
        const title = card?.querySelector("h2")?.textContent || "Operational record";
        const shell = button.closest(".fx-shell");
        const heading = shell?.querySelector(".fx-page-head h1")?.textContent || "Workspace";
        openModal(heading, `${title}. Linked records and current operating status are available in this workspace.`);
        return;
      }

      if (button.classList.contains("fx-workspace")) {
        openModal(
          "Workspace",
          `${label.replace(/▾/g, "").trim()} is the active workspace in this recovery build. Workspace switching is intentionally contained to this seeded operating environment.`
        );
        return;
      }

      if (button.getAttribute("aria-label") === "Notifications") {
        openModal("Notifications", "No new notifications in this seeded recovery workspace.");
      }
    }

    document.addEventListener("click", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  return (
    <>
      {toast ? (
        <div style={{ position: "fixed", right: 24, bottom: 24, zIndex: 1000, padding: "11px 14px", borderRadius: 9, background: "#172018", color: "#eef2ed", boxShadow: "0 8px 30px rgba(0,0,0,.18)", fontSize: 12 }}>
          {toast}
        </div>
      ) : null}
      {modal ? (
        <div
          role="presentation"
          onClick={() => setModal(null)}
          style={{ position: "fixed", inset: 0, zIndex: 999, display: "grid", placeItems: "center", background: "rgba(7,10,8,.42)", padding: 24 }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={modal.title}
            onClick={(event) => event.stopPropagation()}
            style={{ width: "min(520px, 100%)", borderRadius: 14, padding: 24, background: "#fbfcfa", color: "#172018", border: "1px solid rgba(23,32,24,.14)", boxShadow: "0 24px 80px rgba(0,0,0,.24)" }}
          >
            <p style={{ margin: "0 0 6px", textTransform: "uppercase", letterSpacing: ".14em", fontSize: 10, opacity: .55 }}>Fruma operating workspace</p>
            <h2 style={{ margin: "0 0 10px", fontFamily: "Georgia, serif", fontWeight: 500, fontSize: 26 }}>{modal.title}</h2>
            <p style={{ margin: 0, lineHeight: 1.55, opacity: .72 }}>{modal.body}</p>
            <button
              onClick={() => setModal(null)}
              style={{ marginTop: 20, border: 0, borderRadius: 8, padding: "10px 14px", background: "#223b2a", color: "white", cursor: "pointer" }}
            >
              Close
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
