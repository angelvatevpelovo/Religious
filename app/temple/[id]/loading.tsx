import { GlassCard, PageShell } from "../../../components/DesignSystem";

export default function TempleDetailsLoading() {
  return (
    <PageShell>
      <GlassCard className="mt-10 overflow-hidden">
        <div className="h-72 animate-pulse bg-white/10 sm:h-96" />
        <div className="space-y-4 p-6 sm:p-8">
          <div className="h-8 w-2/3 animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-full animate-pulse rounded-full bg-white/10" />
          <div className="h-4 w-4/5 animate-pulse rounded-full bg-white/10" />
        </div>
      </GlassCard>
    </PageShell>
  );
}
