"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Kind = "brand" | "retailer" | "mill";

export function OriginContact({ mill }: { mill: string }) {
  const [kind, setKind] = useState<Kind | "">("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!kind) {
      setStatus("error");
      setError("Tell us which you are.");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, kind, mill }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setStatus("error");
        setError(data.error || "Could not send that.");
        return;
      }
      setStatus("ok");
    } catch {
      setStatus("error");
      setError("Could not send that. Try again.");
    }
  }

  if (status === "ok") {
    return (
      <div className="border border-white/15 bg-white/5 px-5 py-8" role="status">
        <p className="text-[13px] tracking-[-0.02em] text-weld">Sent to Fruma.</p>
        <p className="mt-2 text-[18px] font-semibold tracking-[-0.03em]">
          We’ll take it from here.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border border-white/15 bg-white/[0.04] px-5 py-6">
      <p className="ui-label text-white/45">Reach this mill through Fruma</p>
      <fieldset className="mt-4">
        <legend className="ui-label text-white/45">I am a</legend>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {(
            [
              ["brand", "Brand"],
              ["retailer", "Retailer"],
              ["mill", "This mill"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={cn(
                "h-9 border text-[12px] font-medium tracking-[-0.015em]",
                kind === value
                  ? "border-chalk bg-chalk text-black"
                  : "border-white/15 bg-transparent text-white hover:border-white/50",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 block">
        <span className="ui-label text-white/45">Name</span>
        <Input
          className="mt-1.5 border-white/15 text-white"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="mt-3 block">
        <span className="ui-label text-white/45">Work email</span>
        <Input
          className="mt-1.5 border-white/15 text-white"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="mt-3 block">
        <span className="ui-label text-white/45">Organisation</span>
        <Input
          className="mt-1.5 border-white/15 text-white"
          name="company"
          required
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </label>
      {status === "error" ? (
        <p className="mt-3 text-[13px] text-madder" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        className="mt-5 bg-chalk text-black hover:bg-white"
        disabled={status === "loading"}
      >
        {status === "loading" ? "Sending…" : "Contact through Fruma"}
      </Button>
    </form>
  );
}
