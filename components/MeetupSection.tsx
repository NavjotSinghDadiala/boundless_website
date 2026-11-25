import React from "react"
import { motion } from "framer-motion"
import Image from "next/image";

export default function MeetupSection({
  title,
  cards,
  onCardClick,
}: {
  title: string;
  cards: any[];
  onCardClick?: (card: any) => void;
}) {
  return (
    <section className="mb-16">
      <h2 className="text-3xl md:text-4xl font-black text-[#3B001B] mb-8 text-center">{title}</h2>
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6"
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: 0.45, type: "spring" }}
      >
        {cards.map((card) => (
          <motion.article
            key={card.id}
            onClick={() => onCardClick?.(card)}
            className="group flex min-h-[280px] flex-col overflow-hidden rounded-2xl border border-amber-950/10 bg-white shadow-lg cursor-pointer"
            whileHover={{ y: -4, boxShadow: "0 18px 36px rgba(59, 0, 27, 0.14)" }}
            transition={{ duration: 0.2 }}
          >
            <div className="relative h-44 w-full overflow-hidden bg-amber-100">
              <Image
                src={card.img}
                alt={`${card.city} - ${title}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                unoptimized={!card.img?.includes("res.cloudinary.com")}
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </div>

            <div
              className="flex min-h-[104px] flex-1 flex-col justify-center px-5 py-4 border-t border-amber-950/5"
              style={{ backgroundColor: card.color || "#FEFAE7" }}
            >
              <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber-900/70">
                {title}
              </p>
              <h3 className="text-xl font-black leading-tight text-[#3B001B]">{card.city}</h3>
            </div>
          </motion.article>
        ))}
      </motion.div>
    </section>
  )
}