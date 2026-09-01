"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FOUNDERS, type Founder, founderLabel } from "@/lib/founders";
import { cn } from "@/lib/utils";

export function EnterForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/app";
  const [who, setWho] = useState<Founder | "">("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!who) {
      setError("Choose who you are.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ who, password, next }),
      });
      const data = (await res.json()) as { error?: string; next?: string };
      if (!res.ok) {
        setError(data.error || "Could not sign in.");
        setLoading(false);
        return;
      }
      router.replace(data.next || "/app");
      router.refresh();
    } catch {
      setError("Could not sign in. Try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 max-w-[400px]">
      <fieldset>
        <legend className="ui-label">I am</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {FOUNDERS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setWho(id)}
              className={cn(
                "h-10 border text-[13px] font-medium tracking-[-0.015em]",
                who === id
                  ? "border-ink bg-ink text-paper"
                  : "border-line bg-transparent text-ink hover:border-ink",
              )}
            >
              {founderLabel(id)}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 block">
        <span className="ui-label">Password</span>
        <Input
          className="mt-1.5"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error ? (
        <p className="mt-3 text-[13px] text-madder" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="mt-5" disabled={loading}>
        {loading ? "Opening…" : "Open the prototype"}
      </Button>
    </form>
  );
}
