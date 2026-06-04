export function Sk({ className = "", light = false }: { className?: string; light?: boolean }) {
  return <div className={`${light ? "skeleton-light" : "skeleton"} ${className}`} />;
}

export function NavSkeleton() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-5 md:px-8 h-16 bg-transparent border-b border-white/10">
      <div className="flex items-center gap-2.5">
        <Sk light className="w-8 h-8 rounded-xl" />
        <Sk light className="w-16 h-5" />
        <Sk light className="hidden sm:block w-14 h-5 rounded-full" />
      </div>
      <div className="hidden md:flex items-center gap-1">
        <Sk light className="w-20 h-8 rounded-lg" />
        <Sk light className="w-20 h-8 rounded-lg" />
        <Sk light className="w-16 h-8 rounded-lg" />
      </div>
      <div className="flex items-center gap-2">
        <Sk light className="w-10 h-8 rounded-lg" />
        <Sk light className="w-8 h-8 rounded-lg" />
        <Sk light className="w-24 h-8 rounded-lg" />
      </div>
    </nav>
  );
}

export function HeroSkeleton() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden"
      style={{ background: "linear-gradient(165deg, #04293f 0%, #075985 35%, #0EA5E9 75%, #38BDF8 100%)" }}>
      <div className="relative z-10 max-w-4xl mx-auto space-y-8 pt-24 pb-20 w-full">
        <Sk light className="w-64 h-7 rounded-full mx-auto" />
        <div className="space-y-3 mx-auto" style={{ maxWidth: "52rem" }}>
          <Sk light className="w-4/5 h-14 mx-auto rounded-lg" />
          <Sk light className="w-3/5 h-14 mx-auto rounded-lg" />
        </div>
        <div className="space-y-2 mx-auto" style={{ maxWidth: "52ch" }}>
          <Sk light className="w-full h-4" />
          <Sk light className="w-5/6 h-4 mx-auto" />
          <Sk light className="w-4/6 h-4 mx-auto" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Sk light className="w-40 h-14 rounded-2xl" />
          <Sk light className="w-36 h-14 rounded-xl" />
        </div>
        <div className="flex items-center justify-center gap-4 pt-2">
          <Sk light className="w-32 h-24 rounded-2xl" />
          <Sk light className="w-8 h-4 rounded-full" />
          <Sk light className="w-32 h-24 rounded-2xl" />
          <Sk light className="w-8 h-4 rounded-full" />
          <Sk light className="w-32 h-24 rounded-2xl" />
        </div>
      </div>
    </section>
  );
}

export function FeaturesSkeleton() {
  return (
    <section className="py-28 px-6 bg-bg">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 space-y-3">
          <Sk className="w-20 h-4 rounded-full" />
          <Sk className="w-72 h-10" />
          <Sk className="w-96 h-4" />
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-8 space-y-5">
              <Sk className="w-12 h-12 rounded-2xl" />
              <Sk className="w-40 h-5" />
              <div className="space-y-2">
                <Sk className="w-full h-3" />
                <Sk className="w-5/6 h-3" />
                <Sk className="w-4/6 h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-bg flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border px-4 py-6 gap-6 flex-shrink-0">
        <div className="flex items-center gap-3 px-2">
          <Sk className="w-9 h-9 rounded-xl" />
          <div className="space-y-1.5">
            <Sk className="w-20 h-4" />
            <Sk className="w-14 h-3" />
          </div>
        </div>
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Sk key={i} className="w-full h-10 rounded-xl" />
          ))}
        </div>
        <div className="mt-auto">
          <Sk className="w-full h-16 rounded-2xl" />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-16 border-b border-border flex items-center justify-between px-6">
          <Sk className="w-48 h-5" />
          <div className="flex items-center gap-3">
            <Sk className="w-8 h-8 rounded-lg" />
            <Sk className="w-9 h-9 rounded-full" />
          </div>
        </div>
        <div className="flex-1 p-6 space-y-6">
          <div className="space-y-1.5">
            <Sk className="w-56 h-7" />
            <Sk className="w-80 h-4" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Sk className="w-8 h-8 rounded-xl" />
                  <Sk className="w-16 h-4 rounded-full" />
                </div>
                <Sk className="w-14 h-8" />
                <Sk className="w-24 h-3" />
              </div>
            ))}
          </div>
          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Sk className="w-36 h-5" />
              <Sk className="w-24 h-8 rounded-xl" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Sk className="w-9 h-9 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Sk className="w-32 h-4" />
                    <Sk className="w-20 h-3" />
                  </div>
                  <Sk className="w-16 h-6 rounded-full" />
                  <Sk className="w-20 h-8 rounded-xl" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PatientsSkeleton() {
  return (
    <div className="min-h-screen bg-bg ml-64">
      <header className="sticky top-0 z-30 px-8 py-5 glass border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Sk className="w-36 h-6" />
            <Sk className="w-20 h-3" />
          </div>
          <Sk className="w-28 h-10 rounded-xl" />
        </div>
      </header>
      <div className="p-8 space-y-5">
        <div className="flex items-center gap-3">
          <Sk className="w-72 h-10 rounded-xl flex-1 max-w-sm" />
          <Sk className="w-40 h-10 rounded-xl" />
        </div>
        <div className="glass rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50 flex gap-4">
            {Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="w-24 h-4" />)}
          </div>
          <div className="divide-y divide-border/30">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4">
                <Sk className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Sk className="w-32 h-4" />
                  <Sk className="w-20 h-3" />
                </div>
                <Sk className="w-12 h-4" />
                <Sk className="w-14 h-6 rounded-full" />
                <Sk className="w-24 h-8 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AssessmentsSkeleton() {
  return (
    <div className="min-h-screen bg-bg ml-64">
      <header className="sticky top-0 z-30 px-8 py-5 glass border-b border-border/50">
        <div className="space-y-1.5">
          <Sk className="w-40 h-6" />
          <Sk className="w-64 h-3" />
        </div>
      </header>
      <div className="p-8 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass rounded-2xl p-5 flex items-center gap-5">
            <Sk className="w-12 h-12 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Sk className="w-40 h-4" />
              <Sk className="w-56 h-3" />
            </div>
            <Sk className="w-20 h-6 rounded-full" />
            <Sk className="w-16 h-4" />
            <Sk className="w-24 h-8 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
