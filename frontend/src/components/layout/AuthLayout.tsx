import type { ReactNode } from "react";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Brand } from "./AppShell";
import { AuthScene } from "@/components/motion/AuthScene";
import { BlurText } from "@/components/motion/BlurText";

export function AuthScreen({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <div className="auth-page">
      <header className="auth-header">
        <Brand />
        <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><span className="size-1.5 rounded-full bg-primary" /> A little structure. A lot of possibility.</span>
      </header>
      <main className="auth-main">
        <section className="auth-story">
          <p className="auth-eyebrow"><span className="h-px w-7 bg-primary" /> YOUR NEXT CHAPTER</p>
          <h1 className="auth-wordmark"><BlurText text="Taskline." /></h1>
          <p className="auth-tagline">Less friction.<br /> <span className="text-primary">More momentum.</span></p>
          <p className="auth-description">A clear space for your projects, your people,<br className="hidden sm:block" /> and the work that matters.</p>
          <AuthScene />
          <div className="auth-story-footer"><span>Make room for great work.</span><ArrowUpRight className="size-4 text-primary" /></div>
        </section>
        <motion.section className="auth-form-section" initial={false} animate={reduced ? {} : { opacity: [0, 1], y: [16, 0] }} transition={{ duration: 0.6, delay: 0.12 }}>
          <div className="auth-form-inner">
            <div className="mb-8 flex size-11 items-center justify-center rounded-lg border border-border bg-card text-primary"><ArrowUpRight className="size-5" /></div>
            <h2 className="text-3xl font-semibold">{title}</h2>
            <p className="mt-3 mb-9 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            {children}
            <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="size-3.5" /> Your space. Your work.</p>
          </div>
        </motion.section>
      </main>
      <footer className="auth-footer"><span>Taskline / Project workspace</span><span>Built for the way you work.</span></footer>
    </div>
  );
}
