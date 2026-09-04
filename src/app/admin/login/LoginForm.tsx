"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, PlayCircle } from "lucide-react";

export function LoginForm({
  okta,
  google,
  demo = false,
  demoEmail = "",
  demoPassword = "",
}: {
  okta: boolean;
  google: boolean;
  demo?: boolean;
  demoEmail?: string;
  demoPassword?: string;
}) {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function doSignIn(e: string, p: string) {
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email: e,
      password: p,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    window.location.href = callbackUrl;
  }

  return (
    <div className="space-y-4">
      {demo && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-3">
          <p className="text-xs font-medium text-brand-800">Demo environment</p>
          <p className="mt-0.5 text-xs text-brand-700">
            Synthetic data only. Sign in as the vendor to explore the admin console.
          </p>
          <button
            type="button"
            onClick={() => doSignIn(demoEmail, demoPassword)}
            className="btn-primary mt-2 w-full"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <PlayCircle size={16} />
            )}
            Enter demo as vendor admin
          </button>
          <p className="mt-2 text-center text-[11px] text-brand-700/80">
            {demoEmail} · {demoPassword}
          </p>
        </div>
      )}

      {(okta || google) && (
        <div className="space-y-2">
          {okta && (
            <button
              onClick={() => signIn("okta", { callbackUrl })}
              className="btn-secondary w-full"
            >
              Continue with Okta
            </button>
          )}
          {google && (
            <button
              onClick={() => signIn("google", { callbackUrl })}
              className="btn-secondary w-full"
            >
              Continue with Google
            </button>
          )}
          <div className="relative py-2 text-center">
            <span className="relative z-10 bg-white px-2 text-xs text-ink-faint">
              or sign in with email
            </span>
            <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          doSignIn(email, password);
        }}
        className="space-y-3"
      >
        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@trustcenter.local"
            autoFocus
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : null}
          Sign in
        </button>
      </form>
    </div>
  );
}
