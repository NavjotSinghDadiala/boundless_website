import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export default function TeamMemberNotFound() {
  return (
    <div className="min-h-[80vh] bg-[#FFF9ED] flex items-center justify-center px-5 py-16">
      <div className="max-w-lg w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#3B001B]/10 text-[#3B001B] flex items-center justify-center mx-auto">
          <Compass className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6d1a2c]">
            Profile Not Found
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-[#1c1015]">
            We couldn&apos;t find that team member
          </h1>
          <p className="text-base text-stone-600 leading-relaxed">
            The profile URL may have changed or the member hasn&apos;t been published yet.
            Browse the full Boundless team directory below.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/team-members"
            className="inline-flex items-center gap-2 min-h-[48px] px-6 rounded-full bg-[#3B001B] hover:bg-[#520026] text-[#FFF9ED] text-sm font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Team Members</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
