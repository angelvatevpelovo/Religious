import Link from "next/link";
import type { ReactNode } from "react";
import AppHeaderClient from "./AppHeaderClient";

type WithChildren = {
  children: ReactNode;
  className?: string;
};

export function PageShell({ children, className = "" }: WithChildren) {
  return (
    <main
      className={`min-h-screen bg-[#071A2F] bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.16),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(245,215,110,0.08),transparent_28%),linear-gradient(180deg,#071A2F_0%,#0F2744_100%)] px-4 pb-32 pt-4 text-[#F8FAFC] sm:px-8 sm:pt-6 lg:px-10 ${className}`}
    >
      <div className="mx-auto w-full max-w-7xl">
        <AppHeader />
        {children}
      </div>
    </main>
  );
}

export function AppHeader() {
  return <AppHeaderClient />;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between ${className}`}
    >
      <div>
        {eyebrow && (
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#F5D76E]">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-4xl font-bold tracking-normal text-[#F8FAFC] sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {description && (
          <p className="mt-4 max-w-3xl text-base leading-7 text-[#CBD5E1] sm:text-lg">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function HeroPanel({
  eyebrow,
  title,
  description,
  action,
  children,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-[2.25rem] border border-white/12 bg-white/[0.06] p-6 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-8 lg:p-10 ${className}`}
    >
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          {eyebrow && (
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#F5D76E]">
              {eyebrow}
            </p>
          )}
          <h1 className="mt-3 text-4xl font-bold tracking-normal text-[#F8FAFC] sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          {description && (
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#CBD5E1] sm:text-lg">
              {description}
            </p>
          )}
          {action && <div className="mt-7 flex flex-wrap gap-3">{action}</div>}
        </div>
        {children && <div>{children}</div>}
      </div>
    </section>
  );
}

export function GlassCard({ children, className = "" }: WithChildren) {
  return (
    <div
      className={`rounded-[2rem] border border-white/12 bg-white/[0.06] shadow-2xl shadow-black/20 backdrop-blur-xl ${className}`}
    >
      {children}
    </div>
  );
}

export function FeatureCard({
  title,
  description,
  href,
  eyebrow,
  children,
  className = "",
}: {
  title: string;
  description?: string | null;
  href?: string;
  eyebrow?: string;
  children?: ReactNode;
  className?: string;
}) {
  const content = (
    <GlassCard
      className={`h-full p-6 transition hover:-translate-y-1 hover:border-[#D4AF37]/50 hover:bg-white/[0.09] ${className}`}
    >
      {eyebrow && (
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F5D76E]">
          {eyebrow}
        </p>
      )}
      <h3 className="mt-3 text-2xl font-bold text-[#F8FAFC]">{title}</h3>
      {description && (
        <p className="mt-3 leading-7 text-[#CBD5E1]">{description}</p>
      )}
      {children}
    </GlassCard>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export function GoldButton({
  href,
  children,
  className = "",
}: WithChildren & { href?: string }) {
  const classes = `inline-flex items-center justify-center rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#071A2F] shadow-lg shadow-[#D4AF37]/15 transition hover:bg-[#F5D76E] ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return <span className={classes}>{children}</span>;
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <GlassCard className="p-8 text-center">
      <div className="mx-auto h-14 w-14 rounded-full border border-[#D4AF37]/60 bg-[#D4AF37]/10" />
      <h2 className="mt-5 text-2xl font-bold text-[#F8FAFC]">{title}</h2>
      {description && (
        <p className="mx-auto mt-3 max-w-xl text-[#CBD5E1]">{description}</p>
      )}
    </GlassCard>
  );
}

export function BackLink({
  href = "/",
  children = "Back",
}: {
  href?: string;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-[#F5D76E] backdrop-blur transition hover:border-[#D4AF37]/60 hover:bg-white/10"
    >
      {children}
    </Link>
  );
}
