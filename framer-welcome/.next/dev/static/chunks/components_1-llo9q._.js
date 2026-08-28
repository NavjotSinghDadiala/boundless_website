(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/LenisProvider.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>LenisProvider
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lenis$2f$dist$2f$lenis$2d$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lenis/dist/lenis-react.mjs [app-client] (ecmascript)");
"use client";
;
;
function LenisProvider({ children }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lenis$2f$dist$2f$lenis$2d$react$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ReactLenis"], {
        root: true,
        autoRaf: true,
        options: {
            lerp: 0.1,
            duration: 1.2,
            smoothWheel: true,
            syncTouch: true,
            wheelMultiplier: 1,
            touchMultiplier: 2
        },
        children: children
    }, void 0, false, {
        fileName: "[project]/components/LenisProvider.tsx",
        lineNumber: 8,
        columnNumber: 5
    }, this);
}
_c = LenisProvider;
var _c;
__turbopack_context__.k.register(_c, "LenisProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/NavigationLoader.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>NavigationLoader
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
function NavigationLoader() {
    _s();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const searchParams = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"])();
    // Start as loading on mount — covers initial page load / hard refresh
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    const [visible, setVisible] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    // Clear the initial-load state once the page is hydrated & ready
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "NavigationLoader.useEffect": ()=>{
            const timer = setTimeout({
                "NavigationLoader.useEffect.timer": ()=>setLoading(false)
            }["NavigationLoader.useEffect.timer"], 600);
            return ({
                "NavigationLoader.useEffect": ()=>clearTimeout(timer)
            })["NavigationLoader.useEffect"];
        }
    }["NavigationLoader.useEffect"], []);
    // Hide on route change complete
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "NavigationLoader.useEffect": ()=>{
            setLoading(false);
        }
    }["NavigationLoader.useEffect"], [
        pathname,
        searchParams
    ]);
    // Manage visibility with fade-out delay
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "NavigationLoader.useEffect": ()=>{
            if (loading) {
                setVisible(true);
            } else {
                const timer = setTimeout({
                    "NavigationLoader.useEffect.timer": ()=>setVisible(false)
                }["NavigationLoader.useEffect.timer"], 400);
                return ({
                    "NavigationLoader.useEffect": ()=>clearTimeout(timer)
                })["NavigationLoader.useEffect"];
            }
        }
    }["NavigationLoader.useEffect"], [
        loading
    ]);
    // Intercept link clicks
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "NavigationLoader.useEffect": ()=>{
            const handleClick = {
                "NavigationLoader.useEffect.handleClick": (e)=>{
                    if (e.defaultPrevented) return;
                    const target = e.target.closest("a");
                    if (!target) return;
                    const href = target.getAttribute("href");
                    if (!href) return;
                    const pathPart = href.split("?")[0].split("#")[0];
                    const isApiOrAsset = pathPart.startsWith("/api/") || pathPart.startsWith("/images/") || /\.(pdf|png|jpe?g|gif|svg|csv|xlsx?|zip|json)$/i.test(pathPart);
                    const isInternal = href.startsWith("/") && !href.startsWith("//") && !target.getAttribute("target") && !isApiOrAsset;
                    if (isInternal && pathPart !== pathname) {
                        setLoading(true);
                    }
                }
            }["NavigationLoader.useEffect.handleClick"];
            document.addEventListener("click", handleClick);
            return ({
                "NavigationLoader.useEffect": ()=>document.removeEventListener("click", handleClick)
            })["NavigationLoader.useEffect"];
        }
    }["NavigationLoader.useEffect"], [
        pathname
    ]);
    if (!visible) return null;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none transition-opacity duration-500 ${loading ? "opacity-100" : "opacity-0"}`,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "relative flex items-center justify-center",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "absolute w-44 h-44 rounded-full animate-pulse",
                    style: {
                        border: "1px solid #3B001B22"
                    }
                }, void 0, false, {
                    fileName: "[project]/components/NavigationLoader.tsx",
                    lineNumber: 71,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "absolute w-28 h-28 rounded-full",
                    style: {
                        border: "3px solid transparent",
                        borderTopColor: "#3B001B",
                        borderRightColor: "#3B001B44",
                        filter: "drop-shadow(0 0 6px #3B001B88)",
                        animation: "spin-reverse 1.4s linear infinite"
                    }
                }, void 0, false, {
                    fileName: "[project]/components/NavigationLoader.tsx",
                    lineNumber: 77,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "absolute w-20 h-20 rounded-full",
                    style: {
                        border: "2.5px solid transparent",
                        borderTopColor: "#5C0028",
                        borderLeftColor: "#5C002855",
                        filter: "drop-shadow(0 0 4px #5C002866)",
                        animation: "spin 1s linear infinite"
                    }
                }, void 0, false, {
                    fileName: "[project]/components/NavigationLoader.tsx",
                    lineNumber: 89,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "absolute w-11 h-11 rounded-full",
                    style: {
                        border: "2px solid transparent",
                        borderTopColor: "#3B001BCC",
                        filter: "drop-shadow(0 0 3px #3B001B77)",
                        animation: "spin-reverse 0.7s linear infinite"
                    }
                }, void 0, false, {
                    fileName: "[project]/components/NavigationLoader.tsx",
                    lineNumber: 101,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "w-3 h-3 rounded-full bg-[#3B001B]",
                    style: {
                        boxShadow: "0 0 10px 4px #3B001B88"
                    }
                }, void 0, false, {
                    fileName: "[project]/components/NavigationLoader.tsx",
                    lineNumber: 112,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/NavigationLoader.tsx",
            lineNumber: 69,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/NavigationLoader.tsx",
        lineNumber: 63,
        columnNumber: 5
    }, this);
}
_s(NavigationLoader, "f45U1ZS/CiLvHTDWbCQc60mCKtQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useSearchParams"]
    ];
});
_c = NavigationLoader;
var _c;
__turbopack_context__.k.register(_c, "NavigationLoader");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=components_1-llo9q._.js.map