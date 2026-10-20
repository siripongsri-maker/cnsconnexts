import { useEffect, useRef } from "react";
import { useMotionSettings } from "@/lib/motion";

/** Progressive enhancement: content stays readable before hydration and without JS. */
export function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const { reducedMotion, lowSpec } = useMotionSettings();

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const elements = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion || lowSpec || media.matches || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.removeAttribute("data-reveal-state"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const element = entry.target as HTMLElement;
        element.dataset.revealState = "visible";
        observer.unobserve(element);
      });
    }, { threshold: 0.08 });

    elements.forEach((element) => {
      const bounds = element.getBoundingClientRect();
      // Do not conceal sections already scrolled past (restored scroll position).
      if (bounds.bottom <= 0) return;
      element.dataset.revealState = "pending";
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
      elements.forEach((element) => element.removeAttribute("data-reveal-state"));
    };
  }, [reducedMotion, lowSpec]);

  return ref;
}