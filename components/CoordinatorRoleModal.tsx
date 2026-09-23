"use client";

import { motion, AnimatePresence } from "framer-motion";

interface CoordinatorRoleModalProps {
  isOpen: boolean;
  coordinatorName: string;
  onSelectTraveller: () => void;
  onSelectCoordinator: () => void;
}

export default function CoordinatorRoleModal({
  isOpen,
  coordinatorName,
  onSelectTraveller,
  onSelectCoordinator,
}: CoordinatorRoleModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onSelectTraveller}
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 16 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          className="relative w-full max-w-xl bg-[#FFFDF9] border border-[#3B001B]/15 rounded-[28px] sm:rounded-[36px] shadow-2xl overflow-hidden p-6 sm:p-8 z-10 my-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-selection-title"
        >
          {/* Top Brand Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#3B001B] via-[#FFE878] to-[#3B001B]" />

          {/* Header */}
          <div className="text-center pt-2 pb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFE878]/30 border border-[#3B001B]/15 text-[#3B001B] text-xs font-bold font-oswald uppercase tracking-wider mb-3">
              <span>✨</span>
              <span>Authorized Coordinator Account</span>
            </div>

            <h2
              id="role-selection-title"
              className="font-oswald text-2xl sm:text-3xl font-black text-[#3B001B] tracking-tight"
            >
              Welcome back, {coordinatorName || "Coordinator"}!
            </h2>
            <p className="text-sm sm:text-base text-[#3B001B]/80 font-medium mt-1">
              How would you like to continue today?
            </p>
          </div>

          {/* Two Selectable Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-2">
            {/* TRAVELLER OPTION */}
            <div
              id="role-select-traveller-card"
              role="button"
              tabIndex={0}
              onClick={onSelectTraveller}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectTraveller();
                }
              }}
              className="group relative flex flex-col justify-between p-5 sm:p-6 bg-white rounded-2xl border-2 border-[#3B001B]/15 hover:border-[#3B001B] shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-[#3B001B]/40"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#FAF7F2] border border-[#3B001B]/15 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform mb-3">
                  ✈️
                </div>
                <h3 className="font-oswald text-lg font-bold text-[#3B001B] uppercase tracking-wide group-hover:text-[#46001D]">
                  Traveller
                </h3>
                <p className="text-xs text-[#3B001B]/70 font-semibold uppercase tracking-wider mb-2">
                  Student Experience
                </p>
                <p className="text-xs text-[#3B001B]/80 leading-relaxed">
                  Register for upcoming trips, view trip itineraries, submit corrections, and manage your booked Boundless journeys.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-[#3B001B]/10">
                <span className="inline-flex items-center text-xs font-bold font-oswald uppercase tracking-wider text-[#3B001B] group-hover:translate-x-1 transition-transform">
                  Continue as Traveller →
                </span>
              </div>
            </div>

            {/* COORDINATOR OPTION */}
            <div
              id="role-select-coordinator-card"
              role="button"
              tabIndex={0}
              onClick={onSelectCoordinator}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectCoordinator();
                }
              }}
              className="group relative flex flex-col justify-between p-5 sm:p-6 bg-gradient-to-b from-[#3B001B] to-[#4A0022] rounded-2xl border-2 border-[#FFE878]/30 hover:border-[#FFE878] shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-[#FFE878]"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#FFE878] text-[#3B001B] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform mb-3 shadow">
                  🛡️
                </div>
                <h3 className="font-oswald text-lg font-bold text-[#FFE878] uppercase tracking-wide">
                  Coordinator
                </h3>
                <p className="text-xs text-[#FFE878]/80 font-semibold uppercase tracking-wider mb-2">
                  Trip Management
                </p>
                <p className="text-xs text-[#FFE878]/90 leading-relaxed">
                  Manage your assigned trips, coordinate on-ground travel, view approved student travellers, and update trip briefings.
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-[#FFE878]/20">
                <span className="inline-flex items-center text-xs font-bold font-oswald uppercase tracking-wider text-[#FFE878] group-hover:translate-x-1 transition-transform">
                  Enter Coordinator Dashboard →
                </span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-6 pt-4 border-t border-[#3B001B]/10 text-center">
            <p className="text-xs text-[#3B001B]/60">
              You can switch between Traveller and Coordinator mode at any time via the navigation menu.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
