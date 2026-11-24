export default function TeamMemberProfileLoading() {
  return (
    <div className="min-h-screen bg-[#FFF9ED]">
      {/* Burgundy Hero Skeleton */}
      <div className="bg-[#3B001B] px-5 sm:px-8 py-12 md:py-20">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-5 order-2 lg:order-1">
            <div className="h-4 w-36 rounded-full bg-white/15 animate-pulse" />
            <div className="h-14 w-3/4 rounded-2xl bg-white/15 animate-pulse" />
            <div className="h-14 w-1/2 rounded-2xl bg-white/10 animate-pulse" />
            <div className="flex gap-2 pt-3">
              <div className="h-9 w-32 rounded-full bg-white/10 animate-pulse" />
              <div className="h-9 w-28 rounded-full bg-white/10 animate-pulse" />
            </div>
          </div>
          <div className="lg:col-span-5 order-1 lg:order-2 flex justify-center lg:justify-end">
            <div className="w-full max-w-[340px] aspect-[4/5] rounded-[2rem] bg-white/10 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Editorial Body Skeleton */}
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-16 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-3">
            <div className="h-4 w-24 rounded bg-[#3B001B]/15 animate-pulse" />
            <div className="h-9 w-56 rounded-xl bg-[#3B001B]/10 animate-pulse" />
          </div>
          <div className="lg:col-span-8 space-y-3">
            <div className="h-5 w-full rounded bg-[#3B001B]/10 animate-pulse" />
            <div className="h-5 w-11/12 rounded bg-[#3B001B]/10 animate-pulse" />
            <div className="h-5 w-4/5 rounded bg-[#3B001B]/10 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
