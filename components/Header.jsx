"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "framer-motion";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import CoordinatorRoleModal from "@/components/CoordinatorRoleModal";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [studentUser, setStudentUser] = useState(null);
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [coordinatorName, setCoordinatorName] = useState("");
  const [showRoleModal, setShowRoleModal] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Listen to Firebase auth state & check coordinator status server-side
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.email && user.email.toLowerCase().endsWith("iitm.ac.in")) {
        setStudentUser(user);
        try {
          const token = await user.getIdToken();
          const res = await fetch("/api/auth/coordinator-status", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok && isMounted) {
            const data = await res.json();
            const coord = Boolean(data.isCoordinator);
            setIsCoordinator(coord);
            if (data.name) setCoordinatorName(data.name);

            // If user is a verified coordinator and has not chosen a role in this session, show prompt
            if (coord && typeof window !== "undefined") {
              const savedRole = sessionStorage.getItem("boundless_role_choice");
              if (!savedRole) {
                setShowRoleModal(true);
              }
            }
          } else if (isMounted) {
            setIsCoordinator(false);
          }
        } catch {
          if (isMounted) setIsCoordinator(false);
        }
      } else {
        setStudentUser(null);
        setIsCoordinator(false);
        setCoordinatorName("");
        setShowRoleModal(false);
      }
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Non-production test harness for deterministic visual QA
  useEffect(() => {
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
      window.__SET_HEADER_TEST_STATE__ = (state) => {
        if (state.studentUser !== undefined) setStudentUser(state.studentUser);
        if (state.isCoordinator !== undefined) setIsCoordinator(Boolean(state.isCoordinator));
        if (state.coordinatorName !== undefined) setCoordinatorName(state.coordinatorName);
        if (state.showRoleModal !== undefined) setShowRoleModal(Boolean(state.showRoleModal));
      };
    }
  }, []);

  const handleSelectTraveller = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("boundless_role_choice", "traveller");
    }
    setShowRoleModal(false);
    if (pathname.startsWith("/coordinator")) {
      router.push("/my-trips");
    }
  };

  const handleSelectCoordinator = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("boundless_role_choice", "coordinator");
    }
    setShowRoleModal(false);
    router.push("/coordinator");
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("boundless_role_choice");
      }
      setStudentUser(null);
      setIsCoordinator(false);
      setCoordinatorName("");
      setShowRoleModal(false);
      setMenuOpen(false);
      router.push("/");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const homeMenuItems = [
    { label: "Upcoming Trips", href: "#upcoming-trips" },
    { label: "Trip Registration", href: "/trip-registration" },
    ...(studentUser ? [{ label: "My Trips", href: "/my-trips" }] : []),
    ...(isCoordinator ? [{ label: "Coordinator Dashboard", href: "/coordinator" }] : []),
    { label: "Our Gallery", href: "#gallery" },
    { label: "Previous Trips", href: "#previous-trips" },
    { label: "Stats", href: "#stats" },
    { label: "About Us", href: "#about" },
    { label: "City Meetups", href: "/city-meetups" },
    { label: "Our Team", href: "/team-members" },
    { label: "Whatsapp groups", href: "/whatsapp-groups" },
    { label: "Verify Certificates", href: "/verify-certificate" },
  ];

  const otherMenuItems = [
    { label: "Home", href: "/" },
    { label: "Trip Registration", href: "/trip-registration" },
    ...(studentUser ? [{ label: "My Trips", href: "/my-trips" }] : []),
    ...(isCoordinator ? [{ label: "Coordinator Dashboard", href: "/coordinator" }] : []),
    { label: "Our Team", href: "/team-members" },
    { label: "Whatsapp groups", href: "/whatsapp-groups" },
    { label: "City Meetups", href: "/city-meetups" },
    { label: "Previous Trips", href: "/previous-trips" },
    { label: "Verify Certificates", href: "/verify-certificate" },
  ];

  const menuItems = pathname === "/" ? homeMenuItems : otherMenuItems;

  const { scrollY } = useScroll();

  // Efficient scroll tracker
  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() || 0;
    setIsScrolled(latest > 100);

    // Hide/Show header logic
    if (latest > previous && latest > 300 && !menuOpen) {
      setHidden(true); // Scrolling down
    } else {
      setHidden(false); // Scrolling up
    }
  });

  // Close menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && menuOpen) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  const handleMenuClick = (e, href) => {
    e.preventDefault();
    setMenuOpen(false);

    if (href.startsWith("#")) {
      if (pathname === "/") {
        const el = document.querySelector(href);
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 40;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      } else {
        router.push(`/${href}`);
      }
    } else {
      router.push(href);
    }
  };

  return (
    <>
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 bg-black/40 z-[999] backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      <motion.header
        variants={{
          visible: { y: "0%" },
          hidden: { y: "-110%" }
        }}
        animate={hidden ? "hidden" : "visible"}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4 fixed w-full top-0 z-[9999] bg-transparent"
      >
        <Link
          href="/"
          aria-label="Boundless Home"
          className="w-12 h-12 sm:w-14 sm:h-14 bg-[#3B001B] rounded-full flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-95 hover:scale-105 transition-all shadow-md border-2 border-[#FFE878]/30"
        >
          <Image src="/Logo Bound.png" alt="Boundless Society Logo" width={48} height={48} className="object-contain" priority />
        </Link>

        <div className="relative z-[1000] flex items-center gap-2">
          {/* MY TRIPS pill — only for signed-in IITM students */}
          {studentUser && (
            <Link
              href="/my-trips"
              id="header-my-trips-btn"
              aria-label="My Trips dashboard"
              className="bg-[#FFE878] text-[#3B001B] border border-[#3B001B]/20 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold font-oswald uppercase tracking-wider hover:bg-[#FCE16D] hover:scale-105 active:scale-95 transition-all shadow-md flex items-center gap-1.5"
            >
              <span>✈</span>
              <span>MY TRIPS</span>
            </Link>
          )}
          <button
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-label="Toggle navigation menu"
            className="bg-[#3B001B] text-[#FFE878] border border-[#FFE878]/30 px-5 py-2 sm:px-6 sm:py-2.5 rounded-full text-sm sm:text-base font-bold font-oswald uppercase tracking-wider hover:bg-[#46001D] hover:scale-105 active:scale-95 transition-all shadow-lg flex items-center gap-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span>MENU</span>
            <span
              className="text-[10px] sm:text-xs transition-transform duration-200"
              style={{ transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              ▼
            </span>
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="absolute right-0 top-full mt-2 bg-[#FFE878] rounded-[28px] sm:rounded-[36px] shadow-2xl px-6 sm:px-8 py-5 flex flex-col gap-2 w-[280px] sm:w-[320px] max-w-[calc(100vw-2rem)] z-[1001] border-2 border-[#3B001B]/20"
              >
                {/* Signed-in User Profile Header */}
                {studentUser && (
                  <div className="pb-3 mb-1 border-b border-[#3B001B]/20">
                    <div className="flex items-center gap-3">
                      {studentUser.photoURL ? (
                        <img
                          src={studentUser.photoURL}
                          alt={studentUser.displayName || "User avatar"}
                          className="w-10 h-10 rounded-full border border-[#3B001B]/20 object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#3B001B] text-[#FFE878] font-oswald font-bold flex items-center justify-center text-sm shadow">
                          {(studentUser.displayName || studentUser.email || "S")[0].toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-oswald font-bold text-sm text-[#3B001B] truncate">
                          {coordinatorName || studentUser.displayName || "IITM Student"}
                        </div>
                        <div className="text-xs text-[#3B001B]/70 truncate font-mono">
                          {studentUser.email}
                        </div>
                        {isCoordinator && (
                          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-[#3B001B]/15">
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#3B001B] text-[#FFE878] tracking-wider uppercase">
                              Coordinator
                            </span>
                            <button
                              type="button"
                              id="header-switch-role-btn"
                              onClick={() => {
                                setMenuOpen(false);
                                setShowRoleModal(true);
                              }}
                              className="text-[10px] font-oswald font-bold uppercase tracking-wider bg-[#3B001B] hover:bg-[#46001D] text-[#FFE878] px-2.5 py-1 rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1 active:scale-95"
                            >
                              <span>Switch Role</span>
                              <span>⇄</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1 max-h-[55vh] overflow-y-auto pr-1">
                  {menuItems.map((item, i) => {
                    const isActive = pathname === item.href;
                    return (
                      <div key={i}>
                        <a
                          href={item.href}
                          onClick={(e) => handleMenuClick(e, item.href)}
                          className={`font-oswald font-bold text-lg sm:text-xl py-1.5 px-2 transition-all duration-200 block rounded-lg flex items-center justify-between ${
                            isActive
                              ? "text-[#46001D] bg-[#3B001B]/10 pl-4 font-black"
                              : "text-[#3B001B] hover:pl-4 hover:text-[#46001D] hover:bg-[#3B001B]/5"
                          }`}
                        >
                          <span>{item.label}</span>
                          {isActive && <span className="text-xs text-[#3B001B]">●</span>}
                        </a>
                        <div className="h-[1px] bg-[#3B001B]/20 mx-1" />
                      </div>
                    );
                  })}
                </div>

                {/* Sign Out Button in Dropdown */}
                {studentUser && (
                  <div className="pt-2 mt-1 border-t border-[#3B001B]/20">
                    <button
                      id="header-signout-btn"
                      onClick={handleSignOut}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#3B001B] text-[#FFE878] hover:bg-[#46001D] font-oswald font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow cursor-pointer"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>

      {/* Coordinator Role Selection Modal */}
      <CoordinatorRoleModal
        isOpen={showRoleModal}
        coordinatorName={coordinatorName}
        onSelectTraveller={handleSelectTraveller}
        onSelectCoordinator={handleSelectCoordinator}
      />
    </>
  );
}
