import { ssoEnabled } from "@/lib/env";
import { LoginForm } from "./LoginForm";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
            <ShieldCheck size={22} />
          </div>
          <h1 className="mt-3 text-xl font-semibold text-ink">
            Trust Center Admin
          </h1>
          <p className="text-sm text-ink-faint">
            Sign in to manage documents and requests.
          </p>
        </div>
        <div className="card p-6">
          <LoginForm okta={ssoEnabled.okta} google={ssoEnabled.google} />
        </div>
      </div>
    </div>
  );
}
