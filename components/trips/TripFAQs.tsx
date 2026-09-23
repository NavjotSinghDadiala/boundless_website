"use client";

import React, { useState } from "react";
import { HelpCircle, ChevronDown, Sparkles } from "lucide-react";
import { TripFAQItem } from "./TripCard";

interface TripFAQsProps {
  faqs?: TripFAQItem[];
}

export default function TripFAQs({ faqs }: TripFAQsProps) {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  if (!faqs || faqs.length === 0) {
    return null;
  }

  const validFaqs = faqs.filter(
    (faq) => faq.question && faq.question.trim() && faq.answer && faq.answer.trim()
  );

  if (validFaqs.length === 0) {
    return null;
  }

  const toggleFaq = (id: string) => {
    setOpenIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <section className="w-full py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-12 lg:p-14 backdrop-blur-2xl bg-white/[0.03] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden">
          {/* Top specular highlight */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-400/40 to-transparent" />
          <div className="absolute -top-24 right-10 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header */}
          <div className="relative z-10 flex items-center gap-3 mb-8 sm:mb-10 pb-6 border-b border-white/10">
            <div className="w-10 h-10 rounded-2xl bg-purple-400/10 border border-purple-400/30 flex items-center justify-center text-purple-300 shadow-lg">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-purple-300/80">
                Inquiries & Protocols
              </p>
              <h2 className="font-oswald text-2xl sm:text-4xl font-black uppercase text-white tracking-tight">
                Frequently Asked Questions
              </h2>
            </div>
          </div>

          {/* Liquid Glass Accordion Items */}
          <div className="relative z-10 space-y-3 sm:space-y-4">
            {validFaqs.map((faq, idx) => {
              const faqId = faq.id || `faq-${idx}`;
              const isOpen = !!openIds[faqId];

              return (
                <div
                  key={faqId}
                  className={`rounded-2xl sm:rounded-3xl border transition-all duration-300 overflow-hidden ${
                    isOpen
                      ? "bg-white/[0.06] border-purple-400/40 shadow-[0_10px_30px_rgba(168,85,247,0.15)]"
                      : "bg-white/[0.02] hover:bg-white/[0.04] border-white/10"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(faqId)}
                    className="w-full px-6 py-5 sm:px-8 sm:py-6 flex items-center justify-between text-left gap-4 cursor-pointer focus:outline-none"
                    aria-expanded={isOpen}
                  >
                    <span className="font-oswald text-base sm:text-xl font-bold text-white tracking-wide leading-snug">
                      {faq.question}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-full border border-white/15 flex items-center justify-center shrink-0 transition-transform duration-300 ${
                        isOpen
                          ? "rotate-180 bg-purple-500/20 text-purple-300 border-purple-400/40"
                          : "bg-white/[0.05] text-white/70"
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 sm:px-8 sm:pb-7 pt-1 text-white/70 text-sm sm:text-base leading-relaxed whitespace-pre-line border-t border-white/10">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
