export default function Loading() {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none">
      <div className="relative flex items-center justify-center">
        {/* Outermost faint pulse ring */}
        <div
          className="absolute w-44 h-44 rounded-full animate-pulse"
          style={{ border: "1px solid #3B001B22" }}
        />

        {/* Outer ring — slow counter-clockwise */}
        <div
          className="absolute w-28 h-28 rounded-full"
          style={{
            border: "3px solid transparent",
            borderTopColor: "#3B001B",
            borderRightColor: "#3B001B44",
            filter: "drop-shadow(0 0 6px #3B001B88)",
            animation: "spin-reverse 1.4s linear infinite",
          }}
        />

        {/* Mid ring — clockwise */}
        <div
          className="absolute w-20 h-20 rounded-full"
          style={{
            border: "2.5px solid transparent",
            borderTopColor: "#5C0028",
            borderLeftColor: "#5C002855",
            filter: "drop-shadow(0 0 4px #5C002866)",
            animation: "spin 1s linear infinite",
          }}
        />

        {/* Inner ring — counter-clockwise, faster */}
        <div
          className="absolute w-11 h-11 rounded-full"
          style={{
            border: "2px solid transparent",
            borderTopColor: "#3B001BCC",
            filter: "drop-shadow(0 0 3px #3B001B77)",
            animation: "spin-reverse 0.7s linear infinite",
          }}
        />

        {/* Center dot */}
        <div
          className="w-3 h-3 rounded-full bg-[#3B001B]"
          style={{ boxShadow: "0 0 10px 4px #3B001B88" }}
        />
      </div>
    </div>
  );
}


