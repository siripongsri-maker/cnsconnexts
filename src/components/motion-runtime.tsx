import { useEffect } from "react";
import { useMotionSettings } from "@/lib/motion";

const PANELS =
  ".mission-page-hero,.mission-panel,.mission-empty,.card-soft,.publication-group,.person-masthead,.connection-masthead,.guide-explore";
const NATIVE_SCROLL =
  '[data-lenis-prevent],[role="dialog"],[role="log"],textarea,select,input,.space-menu,.admin-nav,.overflow-x-auto,.overflow-y-auto';

/** Document scrolling stays native for touch, focus, restoration and nested UI. */
export function MotionRuntime() {
  const { ready, reducedMotion, lowSpec } = useMotionSettings();

  useEffect(() => {
    if (!ready || reducedMotion || lowSpec) return;
    let disposed = false;
    let destroyScroll: (() => void) | undefined;
    void import("lenis")
      .then(({ default: Lenis }) => {
        if (disposed) return;
        const lenis = new Lenis({
          autoRaf: true,
          duration: 1.05,
          smoothWheel: true,
          syncTouch: false,
          anchors: { offset: -96, duration: 1.05 },
          stopInertiaOnNavigate: true,
          prevent: (node) => !!node.closest(NATIVE_SCROLL),
        });
        const syncLock = () => {
          const locked =
            document.body.style.overflow === "hidden" ||
            document.documentElement.style.overflow === "hidden";
          if (locked) lenis.stop();
          else lenis.start();
        };
        const locks = new MutationObserver(syncLock);
        locks.observe(document.body, { attributes: true, attributeFilter: ["style"] });
        locks.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
        const print = () => lenis.stop();
        const scrollTo = (event: Event) => {
          const detail = (event as CustomEvent<{ top: number; immediate?: boolean }>).detail;
          const top = detail?.top;
          if (typeof top !== "number" || !Number.isFinite(top)) return;
          event.preventDefault();
          lenis.scrollTo(top, { duration: 1.05, immediate: detail.immediate === true });
        };
        const printed = () => {
          lenis.resize();
          syncLock();
        };
        window.addEventListener("connexts:scroll-to", scrollTo);
        window.addEventListener("beforeprint", print);
        window.addEventListener("afterprint", printed);
        syncLock();
        destroyScroll = () => {
          locks.disconnect();
          window.removeEventListener("beforeprint", print);
          window.removeEventListener("afterprint", printed);
          window.removeEventListener("connexts:scroll-to", scrollTo);
          lenis.destroy();
        };
      })
      .catch(() => {
        /* Native scrolling remains available if enhancement fails. */
      });
    return () => {
      disposed = true;
      destroyScroll?.();
    };
  }, [ready, reducedMotion, lowSpec]);

  useEffect(() => {
    if (!ready || reducedMotion || lowSpec || !("IntersectionObserver" in window)) return;
    const seen = new WeakSet<Element>();
    const enhanced = new Set<HTMLElement>();
    let order = 0;
    const show = (el: HTMLElement) => {
      el.dataset["motionState"] = "visible";
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          show(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.01, rootMargin: "0px 0px -3% 0px" },
    );
    const register = (el: HTMLElement) => {
      if (seen.has(el)) return;
      seen.add(el);
      if (el.closest('[data-motion-local="true"],.mission-story,[role="dialog"],[role="log"]'))
        return;
      if (el.parentElement?.closest(PANELS)) return;
      const rect = el.getBoundingClientRect();
      // Long forms and restored content must not disappear while being used.
      if (rect.bottom <= 0 || rect.height > 1500 || el.contains(document.activeElement)) return;
      enhanced.add(el);
      el.style.setProperty("--motion-delay", `${(order++ % 4) * 45}ms`);
      el.dataset["motionState"] = "pending";
      observer.observe(el);
    };
    const scan = (root: ParentNode) => root.querySelectorAll<HTMLElement>(PANELS).forEach(register);
    scan(document);
    const mutations = new MutationObserver((records) => {
      let removed = false;
      for (const record of records) {
        if (record.removedNodes.length) removed = true;
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (node.matches(PANELS)) register(node);
          scan(node);
        }
      }
      if (removed)
        for (const el of enhanced) {
          if (el.isConnected) continue;
          observer.unobserve(el);
          enhanced.delete(el);
          delete el.dataset["motionState"];
          el.style.removeProperty("--motion-delay");
        }
    });
    mutations.observe(document.body, { subtree: true, childList: true });
    const focus = (event: FocusEvent) => {
      const panel = (event.target as HTMLElement)?.closest<HTMLElement>("[data-motion-state]");
      if (panel) {
        delete panel.dataset["motionState"];
        panel.style.removeProperty("--motion-delay");
        enhanced.delete(panel);
        observer.unobserve(panel);
      }
    };
    const print = () => enhanced.forEach(show);
    document.addEventListener("focusin", focus);
    window.addEventListener("beforeprint", print);
    return () => {
      observer.disconnect();
      mutations.disconnect();
      document.removeEventListener("focusin", focus);
      window.removeEventListener("beforeprint", print);
      enhanced.forEach((el) => {
        delete el.dataset["motionState"];
        el.style.removeProperty("--motion-delay");
      });
    };
  }, [ready, reducedMotion, lowSpec]);
  return null;
}
