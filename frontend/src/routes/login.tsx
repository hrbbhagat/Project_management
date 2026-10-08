import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthScreen } from "@/components/layout/AuthLayout";
import { Field } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Taskline" },
      { name: "description", content: "Sign in to your Taskline project workspace." },
      { property: "og:title", content: "Sign in — Taskline" },
      { property: "og:description", content: "Sign in to your Taskline project workspace." },
    ],
  }),
  component: LoginPage,
});

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === "authenticated") navigate({ to: "/dashboard" });
  }, [status, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = "Email is required";
    else if (!emailRe.test(email.trim())) errs.email = "Enter a valid email address";
    if (!password) errs.password = "Password is required";
    setErrors(errs);
    setFormError("");
    if (Object.keys(errs).length) return;
    setPending(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthScreen title="Welcome back" subtitle="Sign in to continue to your workspace.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {formError && <div role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-destructive">{formError}</div>}
        <Field label="Email" error={errors.email}>
          <Input aria-label="Email" aria-invalid={Boolean(errors.email)} type="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password" error={errors.password}>
          <div className="relative">
            <Input aria-label="Password" aria-invalid={Boolean(errors.password)} className="pr-12" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1.5 text-muted-foreground" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff /> : <Eye />}</Button>
          </div>
        </Field>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />} Sign in {!pending && <ArrowRight className="ml-auto size-4" />}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create one
          </Link>
        </p>
      </form>
    </AuthScreen>
  );
}
