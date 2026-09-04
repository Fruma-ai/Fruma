"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EnterForm() {
  const search = useSearchParams();
  const next = search.get("next") || "/app";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, next }),
      });
      const data = (await res.json()) as { error?: string; next?: string };
      if (!res.ok) {
        setError(data.error || "Could not sign in.");
        setLoading(false);
        return;
      }

      // The auth cookie is written by the POST response. A full browser
      // navigation guarantees the next request includes it immediately and
      // avoids the client router getting stuck on the login page.
      window.location.assign(data.next || "/app");
    } catch {
      setError("Could not sign in. Try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 max-w-[400px]">
      <label className="block">
        <span className="ui-label">Email</span>
        <Input
          className="mt-1.5 border-white/15 text-white"
          type="email"
          name="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="mt-4 block">
        <span className="ui-label">Password</span>
        <Input
          className="mt-1.5 border-white/15 text-white"
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
      <Button
        type="submit"
        className="mt-5 bg-chalk text-black hover:bg-white"
        disabled={loading}
      >
        {loading ? "Opening…" : "Open the platform"}
      </Button>
    </form>
  );
}
