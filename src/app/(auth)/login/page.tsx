"use client";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const from = search.get("from") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push(from);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm bg-[#171717] border border-[#262626] rounded-2xl shadow-xl p-6 space-y-4 text-zinc-200">
      <div>
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-sm text-zinc-500 mt-1">Sign in to continue reading.</p>
      </div>
      <div>
        <label className="block text-sm mb-1 text-zinc-400">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[#262626] bg-[#0f0f0f] text-zinc-100 placeholder:text-zinc-600"
        />
      </div>
      <div>
        <label className="block text-sm mb-1 text-zinc-400">Password</label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[#262626] bg-[#0f0f0f] text-zinc-100 placeholder:text-zinc-600"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full py-2 rounded-lg bg-white text-zinc-900 font-medium disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-sm text-zinc-500">
        No account?{" "}
        <Link href="/register" className="text-indigo-400 hover:text-indigo-300">
          Create one
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#0a0a0a]">
      <Suspense fallback={null}>
        <LoginInner />
      </Suspense>
    </div>
  );
}
