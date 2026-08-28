(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/components/CouncilSection.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>CouncilSection
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$MemberAvatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/MemberAvatar.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
function useFadeInOnScroll(deps = []) {
    _s();
    const refs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])([]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useFadeInOnScroll.useEffect": ()=>{
            const observer = new window.IntersectionObserver({
                "useFadeInOnScroll.useEffect": (entries)=>{
                    entries.forEach({
                        "useFadeInOnScroll.useEffect": (entry)=>{
                            if (entry.isIntersecting) {
                                entry.target.classList.add("visible");
                            }
                        }
                    }["useFadeInOnScroll.useEffect"]);
                }
            }["useFadeInOnScroll.useEffect"], {
                threshold: 0.15
            });
            refs.current.forEach({
                "useFadeInOnScroll.useEffect": (ref)=>{
                    if (ref) observer.observe(ref);
                }
            }["useFadeInOnScroll.useEffect"]);
            return ({
                "useFadeInOnScroll.useEffect": ()=>observer.disconnect()
            })["useFadeInOnScroll.useEffect"];
        }
    }["useFadeInOnScroll.useEffect"], deps);
    return refs;
}
_s(useFadeInOnScroll, "dbFJJ0hGiHCp9buBTHiPUgjXrKc=");
function CouncilSection() {
    _s1();
    const [termTitle, setTermTitle] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [council, setCouncil] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [deptHeads, setDeptHeads] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const headingRefs = useFadeInOnScroll();
    const councilRefs = useFadeInOnScroll([
        council
    ]);
    const deptGroupRefs = useFadeInOnScroll([
        deptHeads
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "CouncilSection.useEffect": ()=>{
            async function fetchTeam() {
                try {
                    const res = await fetch("/api/team-members");
                    if (res.ok) {
                        const data = await res.json();
                        const list = data.members || [];
                        // Get all unique terms for council and dept heads
                        const terms = Array.from(new Set(list.filter({
                            "CouncilSection.useEffect.fetchTeam.terms": (m)=>(m.type === "council" || m.type === "dept_head") && m.term
                        }["CouncilSection.useEffect.fetchTeam.terms"]).map({
                            "CouncilSection.useEffect.fetchTeam.terms": (m)=>m.term
                        }["CouncilSection.useEffect.fetchTeam.terms"])));
                        if (terms.length > 1) {
                            // Sort terms descending (latest first)
                            terms.sort({
                                "CouncilSection.useEffect.fetchTeam": (a, b)=>b.localeCompare(a)
                            }["CouncilSection.useEffect.fetchTeam"]);
                            // Second highest term is the previous term
                            const oldTerm = terms[1];
                            const prevCouncil = list.filter({
                                "CouncilSection.useEffect.fetchTeam.prevCouncil": (m)=>m.type === "council" && m.term === oldTerm
                            }["CouncilSection.useEffect.fetchTeam.prevCouncil"]);
                            const prevDept = list.filter({
                                "CouncilSection.useEffect.fetchTeam.prevDept": (m)=>m.type === "dept_head" && m.term === oldTerm
                            }["CouncilSection.useEffect.fetchTeam.prevDept"]);
                            setTermTitle(`COUNCIL (${oldTerm})`);
                            setCouncil(prevCouncil);
                            setDeptHeads(prevDept);
                        }
                    }
                } catch (error) {
                    console.error("Error fetching old council:", error);
                }
            }
            fetchTeam();
        }
    }["CouncilSection.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "relative py-8 bg-[#FFF9ED] overflow-hidden",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "relative z-10",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                    ref: (el)=>{
                        headingRefs.current[0] = el;
                    },
                    className: "text-center mb-12 fade-in text-5xl",
                    style: {
                        fontFamily: "'Oswald', Arial, sans-serif",
                        fontWeight: 900,
                        fontStretch: "condensed",
                        letterSpacing: "0.04em",
                        color: "#6d1a2c"
                    },
                    children: termTitle
                }, void 0, false, {
                    fileName: "[project]/components/CouncilSection.tsx",
                    lineNumber: 77,
                    columnNumber: 9
                }, this),
                council.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-center text-muted-foreground",
                    children: "No council members found for this term."
                }, void 0, false, {
                    fileName: "[project]/components/CouncilSection.tsx",
                    lineNumber: 94,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-row flex-wrap justify-center gap-x-14 gap-y-5",
                    children: council.map((member, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            ref: (el)=>{
                                councilRefs.current[i] = el;
                            },
                            className: "bg-black text-white hover:scale-110 transition-transform cursor-pointer rounded-3xl w-96 h-48 flex items-center px-6 py-4 mb-2 shadow-2xl border border-purple-200",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex-1 flex flex-col justify-center items-start h-full py-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "font-bold text-2xl mb-1",
                                            children: member.name
                                        }, void 0, false, {
                                            fileName: "[project]/components/CouncilSection.tsx",
                                            lineNumber: 106,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-lg text-gray-300 mb-2",
                                            children: member.role
                                        }, void 0, false, {
                                            fileName: "[project]/components/CouncilSection.tsx",
                                            lineNumber: 107,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/CouncilSection.tsx",
                                    lineNumber: 105,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$MemberAvatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    src: member.image || member.src || "",
                                    alt: member.name,
                                    containerClassName: "w-32 h-32 ml-4",
                                    className: "rounded-2xl shadow"
                                }, void 0, false, {
                                    fileName: "[project]/components/CouncilSection.tsx",
                                    lineNumber: 109,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, i, true, {
                            fileName: "[project]/components/CouncilSection.tsx",
                            lineNumber: 98,
                            columnNumber: 15
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/components/CouncilSection.tsx",
                    lineNumber: 96,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                    ref: (el)=>{
                        deptGroupRefs.current[0] = el;
                    },
                    className: "text-center mt-16 mb-12 fade-in",
                    style: {
                        fontFamily: "'Oswald', Arial, sans-serif",
                        fontWeight: 900,
                        fontStretch: "condensed",
                        fontSize: "2.8rem",
                        letterSpacing: "0.04em",
                        color: "#6d1a2c"
                    },
                    children: "DEPARTMENT HEADS"
                }, void 0, false, {
                    fileName: "[project]/components/CouncilSection.tsx",
                    lineNumber: 120,
                    columnNumber: 9
                }, this),
                deptHeads.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-center text-muted-foreground",
                    children: "No department heads found for this term."
                }, void 0, false, {
                    fileName: "[project]/components/CouncilSection.tsx",
                    lineNumber: 138,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-0 gap-y-12 justify-items-center",
                    children: deptHeads.map((member, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            ref: (el)=>{
                                deptGroupRefs.current[i + 1] = el;
                            },
                            className: "bg-black text-white hover:scale-110 transition-transform cursor-pointer rounded-3xl w-96 h-48 flex items-center px-6 py-4 mb-2 shadow-2xl border border-purple-200",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex-1 flex flex-col justify-center items-start h-full py-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "font-bold text-2xl mb-1",
                                            children: member.name
                                        }, void 0, false, {
                                            fileName: "[project]/components/CouncilSection.tsx",
                                            lineNumber: 150,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-lg text-gray-300 mb-2",
                                            children: member.role
                                        }, void 0, false, {
                                            fileName: "[project]/components/CouncilSection.tsx",
                                            lineNumber: 151,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/CouncilSection.tsx",
                                    lineNumber: 149,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$MemberAvatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    src: member.image || member.src || "",
                                    alt: member.name,
                                    containerClassName: "w-32 h-32 ml-4",
                                    className: "rounded-2xl shadow"
                                }, void 0, false, {
                                    fileName: "[project]/components/CouncilSection.tsx",
                                    lineNumber: 153,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, i, true, {
                            fileName: "[project]/components/CouncilSection.tsx",
                            lineNumber: 142,
                            columnNumber: 15
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/components/CouncilSection.tsx",
                    lineNumber: 140,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/CouncilSection.tsx",
            lineNumber: 76,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/CouncilSection.tsx",
        lineNumber: 75,
        columnNumber: 5
    }, this);
}
_s1(CouncilSection, "maHpvK/clZb86EebQ6x4fW24tKA=", false, function() {
    return [
        useFadeInOnScroll,
        useFadeInOnScroll,
        useFadeInOnScroll
    ];
});
_c = CouncilSection;
var _c;
__turbopack_context__.k.register(_c, "CouncilSection");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/MemberAvatar.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>MemberAvatar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-client] (ecmascript)");
;
;
function MemberAvatar({ src, alt, className = "", containerClassName = "" }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: `relative aspect-square overflow-hidden flex-shrink-0 ${containerClassName}`,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
            src: src,
            alt: alt,
            fill: true,
            className: `object-cover object-center ${className}`
        }, void 0, false, {
            fileName: "[project]/components/MemberAvatar.tsx",
            lineNumber: 13,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/MemberAvatar.tsx",
        lineNumber: 12,
        columnNumber: 9
    }, this);
}
_c = MemberAvatar;
var _c;
__turbopack_context__.k.register(_c, "MemberAvatar");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/components/New.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>New
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$MemberAvatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/MemberAvatar.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
"use client";
;
;
function useFadeInOnScroll(deps = []) {
    _s();
    const refs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])([]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useFadeInOnScroll.useEffect": ()=>{
            const observer = new window.IntersectionObserver({
                "useFadeInOnScroll.useEffect": (entries)=>{
                    entries.forEach({
                        "useFadeInOnScroll.useEffect": (entry)=>{
                            if (entry.isIntersecting) {
                                entry.target.classList.add("visible");
                            }
                        }
                    }["useFadeInOnScroll.useEffect"]);
                }
            }["useFadeInOnScroll.useEffect"], {
                threshold: 0.15
            });
            refs.current.forEach({
                "useFadeInOnScroll.useEffect": (ref)=>{
                    if (ref) observer.observe(ref);
                }
            }["useFadeInOnScroll.useEffect"]);
            return ({
                "useFadeInOnScroll.useEffect": ()=>observer.disconnect()
            })["useFadeInOnScroll.useEffect"];
        }
    }["useFadeInOnScroll.useEffect"], deps);
    return refs;
}
_s(useFadeInOnScroll, "dbFJJ0hGiHCp9buBTHiPUgjXrKc=");
function New() {
    _s1();
    const [termTitle, setTermTitle] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [council, setCouncil] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [deptHeads, setDeptHeads] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const headingRefs = useFadeInOnScroll();
    const councilRefs = useFadeInOnScroll([
        council
    ]);
    const deptGroupRefs = useFadeInOnScroll([
        deptHeads
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "New.useEffect": ()=>{
            async function fetchTeam() {
                try {
                    const res = await fetch("/api/team-members");
                    if (res.ok) {
                        const data = await res.json();
                        const list = data.members || [];
                        // Get all unique terms for council and dept heads
                        const terms = Array.from(new Set(list.filter({
                            "New.useEffect.fetchTeam.terms": (m)=>(m.type === "council" || m.type === "dept_head") && m.term
                        }["New.useEffect.fetchTeam.terms"]).map({
                            "New.useEffect.fetchTeam.terms": (m)=>m.term
                        }["New.useEffect.fetchTeam.terms"])));
                        if (terms.length > 0) {
                            // Sort terms descending (latest first)
                            terms.sort({
                                "New.useEffect.fetchTeam": (a, b)=>b.localeCompare(a)
                            }["New.useEffect.fetchTeam"]);
                            const latestTerm = terms[0];
                            const currentCouncil = list.filter({
                                "New.useEffect.fetchTeam.currentCouncil": (m)=>m.type === "council" && m.term === latestTerm
                            }["New.useEffect.fetchTeam.currentCouncil"]);
                            const currentDept = list.filter({
                                "New.useEffect.fetchTeam.currentDept": (m)=>m.type === "dept_head" && m.term === latestTerm
                            }["New.useEffect.fetchTeam.currentDept"]);
                            setTermTitle(`COUNCIL (${latestTerm})`);
                            setCouncil(currentCouncil);
                            setDeptHeads(currentDept);
                        }
                    }
                } catch (error) {
                    console.error("Error fetching current council:", error);
                }
            }
            fetchTeam();
        }
    }["New.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "relative py-8 bg-[#FFF9ED] overflow-hidden",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "relative z-10",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                    ref: (el)=>{
                        headingRefs.current[0] = el;
                    },
                    className: "text-center mb-12 fade-in text-5xl",
                    style: {
                        fontFamily: "'Oswald', Arial, sans-serif",
                        fontWeight: 900,
                        fontStretch: "condensed",
                        letterSpacing: "0.04em",
                        color: "#6d1a2c"
                    },
                    children: termTitle
                }, void 0, false, {
                    fileName: "[project]/components/New.tsx",
                    lineNumber: 75,
                    columnNumber: 9
                }, this),
                council.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-center text-muted-foreground",
                    children: "No council members found for this term."
                }, void 0, false, {
                    fileName: "[project]/components/New.tsx",
                    lineNumber: 92,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-row flex-wrap justify-center gap-x-14 gap-y-5",
                    children: council.map((member, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            ref: (el)=>{
                                councilRefs.current[i] = el;
                            },
                            className: "bg-black text-white hover:scale-110 transition-transform cursor-pointer rounded-3xl w-96 h-48 flex items-center px-6 py-4 mb-2 shadow-2xl border border-purple-200",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex-1 flex flex-col justify-center items-start h-full py-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "font-bold text-2xl mb-1",
                                            children: member.name
                                        }, void 0, false, {
                                            fileName: "[project]/components/New.tsx",
                                            lineNumber: 104,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-lg text-gray-300 mb-2",
                                            children: member.role
                                        }, void 0, false, {
                                            fileName: "[project]/components/New.tsx",
                                            lineNumber: 105,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/New.tsx",
                                    lineNumber: 103,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$MemberAvatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    src: member.image || member.src || "",
                                    alt: member.name,
                                    containerClassName: "w-32 h-32 ml-4",
                                    className: "rounded-2xl shadow"
                                }, void 0, false, {
                                    fileName: "[project]/components/New.tsx",
                                    lineNumber: 107,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, i, true, {
                            fileName: "[project]/components/New.tsx",
                            lineNumber: 96,
                            columnNumber: 15
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/components/New.tsx",
                    lineNumber: 94,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                    ref: (el)=>{
                        deptGroupRefs.current[0] = el;
                    },
                    className: "text-center mt-16 mb-12 fade-in",
                    style: {
                        fontFamily: "'Oswald', Arial, sans-serif",
                        fontWeight: 900,
                        fontStretch: "condensed",
                        fontSize: "2.8rem",
                        letterSpacing: "0.04em",
                        color: "#6d1a2c"
                    },
                    children: "DEPARTMENT HEADS"
                }, void 0, false, {
                    fileName: "[project]/components/New.tsx",
                    lineNumber: 118,
                    columnNumber: 9
                }, this),
                deptHeads.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-center text-muted-foreground",
                    children: "No department heads found for this term."
                }, void 0, false, {
                    fileName: "[project]/components/New.tsx",
                    lineNumber: 136,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-0 gap-y-12 justify-items-center",
                    children: deptHeads.map((member, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            ref: (el)=>{
                                deptGroupRefs.current[i + 1] = el;
                            },
                            className: "bg-black text-white hover:scale-110 transition-transform cursor-pointer rounded-3xl w-96 h-48 flex items-center px-6 py-4 mb-2 shadow-2xl border border-purple-200",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex-1 flex flex-col justify-center items-start h-full py-1",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                            className: "font-bold text-2xl mb-1",
                                            children: member.name
                                        }, void 0, false, {
                                            fileName: "[project]/components/New.tsx",
                                            lineNumber: 148,
                                            columnNumber: 19
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-lg text-gray-300 mb-2",
                                            children: member.role
                                        }, void 0, false, {
                                            fileName: "[project]/components/New.tsx",
                                            lineNumber: 149,
                                            columnNumber: 19
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/New.tsx",
                                    lineNumber: 147,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$MemberAvatar$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                    src: member.image || member.src || "",
                                    alt: member.name,
                                    containerClassName: "w-32 h-32 ml-4",
                                    className: "rounded-2xl shadow"
                                }, void 0, false, {
                                    fileName: "[project]/components/New.tsx",
                                    lineNumber: 151,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, i, true, {
                            fileName: "[project]/components/New.tsx",
                            lineNumber: 140,
                            columnNumber: 15
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/components/New.tsx",
                    lineNumber: 138,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/New.tsx",
            lineNumber: 74,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/New.tsx",
        lineNumber: 73,
        columnNumber: 5
    }, this);
}
_s1(New, "maHpvK/clZb86EebQ6x4fW24tKA=", false, function() {
    return [
        useFadeInOnScroll,
        useFadeInOnScroll,
        useFadeInOnScroll
    ];
});
_c = New;
var _c;
__turbopack_context__.k.register(_c, "New");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=components_1wn6ezj._.js.map