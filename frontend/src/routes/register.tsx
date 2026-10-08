import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthScreen } from "@/components/layout/AuthLayout";
import { Field } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth";
import { ApiError } from "@/services/api";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — Taskline" },
      { name: "description", content: "Create a Taskline account to manage projects and tasks." },
      { property: "og:title", content: "Create account — Taskline" },
      { property: "og:description", content: "Create a Taskline account to manage projects and tasks." },
    ],
  }),
  component: RegisterPage,
});

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!f.name.trim()) errs.name = "Full name is required";
    else if (f.name.trim().length < 2) errs.name = "Full name must be at least 2 characters";

    if (!f.email.trim()) errs.email = "Email is required";
    else if (!emailRe.test(f.email.trim())) errs.email = "Enter a valid email address";

    if (!f.password) errs.password = "Password is required";
    else if (f.password.length < 8) errs.password = "Password must be at least 8 characters";

    if (!f.confirmPassword) errs.confirmPassword = "Confirm password is required";
    else if (f.password !== f.confirmPassword) errs.confirmPassword = "Passwords do not match";

    setErrors(errs);
    setFormError("");
    if (Object.keys(errs).length) return;

    setPending(true);
    try {
      const signedIn = await register(f.name.trim(), f.email.trim(), f.password);
      toast.success("Account created successfully! Please sign in.");
      navigate({ to: signedIn ? "/dashboard" : "/login" });
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) setErrors(err.fieldErrors);
      setFormError((err as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <AuthScreen title="Create your account" subtitle="Start organizing your projects in minutes.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {formError && <div role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-destructive">{formError}</div>}
        <Field label="Full name" error={errors.name}>
          <Input aria-label="Full name" aria-invalid={Boolean(errors.name)} placeholder="John Doe" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="Email" error={errors.email}>
          <Input aria-label="Email" aria-invalid={Boolean(errors.email)} placeholder="you@company.com" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <Field label="Password" error={errors.password}>
          <div className="relative">
            <Input aria-label="Password" aria-invalid={Boolean(errors.password)} className="pr-12" placeholder="At least 8 characters" type={showPassword ? "text" : "password"} autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1.5 text-muted-foreground" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} title={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff /> : <Eye />}</Button>
          </div>
        </Field>
        <Field label="Confirm Password" error={errors.confirmPassword}>
          <div className="relative">
            <Input aria-label="Confirm Password" aria-invalid={Boolean(errors.confirmPassword)} className="pr-12" placeholder="Re-enter your password" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" value={f.confirmPassword} onChange={(e) => setF({ ...f, confirmPassword: e.target.value })} />
            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1.5 text-muted-foreground" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} title={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}>{showConfirmPassword ? <EyeOff /> : <Eye />}</Button>
          </div>
        </Field>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />} Create account
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthScreen>
  );
}
