"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

/* ── Kinetic Text: splits text into words, each word animates from
     blur+displaced → sharp+positioned as the section scrolls into view ── */
export function KineticText({
  text,
  as: Tag = "h2",
  className = "",
  highlightWords = [] as string[],
  charLevel = false,
}: {
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  highlightWords?: string[];
  charLevel?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reveal = () => setRevealed(true);

    // Respect reduced-motion: resolve to the final, sharp state immediately.
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      reveal();
      return;
    }

    // If the text is already on screen at mount (e.g. the hero headline),
    // drive the reveal ourselves on the next frames rather than waiting for
    // the IntersectionObserver callback. That callback can be delayed — or in
    // some engines never fire for elements that are in view from the start —
    // which would leave the headline permanently blurred.
    const rect = el.getBoundingClientRect();
    const inViewOnMount =
      rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Reveal once, then stop observing — text stays sharp and never
        // re-blurs when it scrolls back into view.
        if (entry.isIntersecting) {
          reveal();
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    observer.observe(el);

    let raf1 = 0;
    let raf2 = 0;
    let failsafe = 0;
    if (inViewOnMount) {
      // Double rAF: paint the initial blurred state once, then flip to
      // revealed so the blur→sharp transition actually runs.
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(reveal);
      });
      // Absolute backstop — in-view text can never stay stuck blurred.
      failsafe = window.setTimeout(reveal, 1200);
    }

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(failsafe);
    };
  }, []);

  const words = text.split(" ");

  return (
    // @ts-ignore
    <Tag ref={ref} className={`${className} overflow-hidden`}>
      {charLevel
        ? /* Character-level stagger */
          text.split("").map((char, i) => (
            <span
              key={i}
              className={`kinetic-char ${revealed ? "revealed" : ""}`}
              style={{ transitionDelay: `${i * 0.025}s` }}
            >
              {char === " " ? "\u00A0" : char}
            </span>
          ))
        : /* Word-level stagger */
          words.map((word, i) => {
            const isHighlight = highlightWords.includes(word.replace(/[.,!?]/g, ""));
            return (
              <span key={i}>
                <span
                  className={`kinetic-word motion-echo ${revealed ? "revealed" : ""} ${
                    isHighlight ? "text-accent" : ""
                  }`}
                  data-text={word}
                  style={{ transitionDelay: `${i * 0.06}s` }}
                >
                  {word}
                </span>
                {i < words.length - 1 && "\u00A0"}
              </span>
            );
          })}
    </Tag>
  );
}

/* ── ScrollytellingSection: each section of the page gets entrance
     animations (blur→sharp, translateY→0, scale→1) driven by
     IntersectionObserver. Background stays fixed, content scrolls over. ── */

interface ScrollytellingSectionProps {
  id: string;
  index: number;
  total: number;
  title: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
  pinned?: boolean;        // if true, section uses sticky inner content
  darkBg?: boolean;        // dark background variant
  entrance?: "fade-up" | "slide-left" | "slide-right" | "scale" | "none";
}

export function ScrollytellingSection({
  id,
  index,
  total,
  title,
  badge,
  children,
  className = "",
  pinned = false,
  darkBg = false,
  entrance = "fade-up",
}: ScrollytellingSectionProps) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [parallaxY, setParallaxY] = useState(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Play the entrance once; keep the section resolved thereafter.
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Parallax offset for the chapter indicator
  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const windowH = window.innerHeight;
      const centerOffset = (rect.top + rect.height / 2 - windowH / 2) / windowH;
      setParallaxY(centerOffset * -30);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const entranceClass =
    entrance === "none"
      ? ""
      : entrance === "slide-left"
      ? `slide-in-left ${inView ? "in-view" : ""}`
      : entrance === "slide-right"
      ? `slide-in-right ${inView ? "in-view" : ""}`
      : entrance === "scale"
      ? `scale-entrance ${inView ? "in-view" : ""}`
      : `scroll-section-hidden ${inView ? "scroll-section-visible" : ""}`;

  return (
    <section
      id={id}
      ref={sectionRef}
      className={`relative min-h-screen flex flex-col justify-center py-20 border-b border-line overflow-hidden ${
        darkBg ? "bg-ink text-white" : "bg-canvas"
      } ${className}`}
    >
      {/* Sticky Chapter Indicator along the left margin — parallax shifted */}
      <div
        className="absolute top-8 left-4 sm:left-8 z-20 hidden lg:flex items-center gap-3 font-mono text-[11px] select-none"
        style={{ transform: `translateY(${parallaxY}px)` }}
      >
        <span className={`font-bold ${darkBg ? "text-accent-hover" : "text-accent"}`}>
          {String(index).padStart(2, "0")}
        </span>
        <span className={`w-8 h-px ${darkBg ? "bg-white/20" : "bg-line"}`} />
        <span className={`uppercase tracking-widest ${darkBg ? "text-white/70" : "text-ink"}`}>
          {title}
        </span>
        {badge && (
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
              darkBg
                ? "bg-white/10 border border-white/20 text-emerald-light"
                : "bg-surface border border-line text-emerald"
            }`}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Animated content wrapper */}
      <div ref={contentRef} className={`max-w-7xl mx-auto px-4 sm:px-6 w-full relative z-10 ${entranceClass}`}>
        {children}
      </div>
    </section>
  );
}

/* ── useScrollReveal: lightweight hook for any element that needs
     scroll-triggered class toggling ── */
export function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}
