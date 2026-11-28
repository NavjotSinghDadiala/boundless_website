export default function MountainFooterTransition() {
  return (
    <section className="relative w-full overflow-hidden">
      {/* Blend the image into the cream 'About Us' section */}
      <div
        className="absolute inset-x-0 top-0 z-10 h-48 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, #fffbed 0%, rgba(255,251,237,0.8) 30%, transparent 100%)",
        }}
      />

      {/* Boundless mountain img */}
      <img
        src="/Boundless-mountain-path-footer.png"
        alt="Boundless mountain pathway"
        className="block w-full h-auto"
      />
    </section>
  );
}
