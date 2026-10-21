import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight, Compass, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { useAuth } from "@/lib/auth";
import { useMotionSettings } from "@/lib/motion";
import { TOUR_EVENT } from "@/components/guided-tour";

const LINKS = [
  { to: "/matches", label: "คนที่ควรเจอ" },
  { to: "/map", label: "แผนที่พลัง" },
  { to: "/marketplace", label: "ตลาดพลัง" },
  { to: "/commitments", label: "ทำอะไรต่อ" },
  { to: "/dashboard", label: "สดในงาน" },
  { to: "/submit", label: "ส่งผลงาน" },
  { to: "/ebook", label: "รวมผลงาน" },
  { to: "/guide", label: "คู่มือ" },
  { to: "/update", label: "โปรไฟล์" },
  { to: "/scan", label: "สแกนเข้าร่วม" },
] as const;

const MENU_ENTER_MS = 650;
const MENU_EXIT_MS = 220;
type MenuPhase = "closed" | "opening" | "open" | "closing";

export function SpaceNav() {
  const [phase, setPhase] = useState<MenuPhase>("closed");
  const { mode, displayName, signOut } = useAuth();
  const { reducedMotion, lowSpec } = useMotionSettings();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const open = phase === "opening" || phase === "open";
  const present = phase !== "closed";

  const canAnimate = useCallback(
    () =>
      !reducedMotion &&
      !lowSpec &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !document.documentElement.hasAttribute("data-lowspec"),
    [reducedMotion, lowSpec],
  );

  const openMenu = () => setPhase(canAnimate() ? "opening" : "open");
  const closeMenu = useCallback(
    ({ restoreFocus = true }: { restoreFocus?: boolean } = {}) => {
      setPhase(canAnimate() ? "closing" : "closed");
      if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
    },
    [canAnimate],
  );

  useEffect(() => {
    if (phase !== "opening" && phase !== "closing") return;
    if (!canAnimate()) {
      setPhase(phase === "opening" ? "open" : "closed");
      return;
    }
    const timer = window.setTimeout(
      () => setPhase(phase === "opening" ? "open" : "closed"),
      phase === "opening" ? MENU_ENTER_MS : MENU_EXIT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [phase, canAnimate]);

  // Keep the document locked through the exit, and always release it on route unmount.
  useEffect(() => {
    if (!present) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [present]);

  useEffect(() => {
    if (!open) return;
    if (!menuRef.current?.contains(document.activeElement)) {
      menuRef.current?.querySelector<HTMLAnchorElement>("a")?.focus({ preventScroll: true });
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = menuRef.current?.querySelectorAll<HTMLElement>(
        "a[href],button:not([disabled])",
      );
      if (!controls?.length) return;
      const first = controls[0]!;
      const last = controls[controls.length - 1]!;
      const active = document.activeElement;
      if (!menuRef.current?.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, [open, closeMenu]);

  return (
    <>
      <a href="#main-content" className="mission-skip">
        ข้ามไปเนื้อหา
      </a>
      <header className="space-nav">
        <Link to="/" aria-label="คนส. Connexts หน้าแรก" className="space-nav-brand">
          <Wordmark size="sm" withMark />
        </Link>
        <nav aria-label="เมนูด้านบน" className="hidden items-center gap-9 lg:flex">
          {LINKS.slice(0, 3).map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="space-nav-link nav-roll-target"
              activeProps={{ className: "is-active", "aria-current": "page" }}
            >
              <RollLabel text={link.label} />
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 sm:gap-6">
          <Button
            asChild
            variant="outline"
            className="nav-motion-cta nav-roll-target hidden h-11 rounded-none sm:inline-flex"
          >
            <Link to={mode === "anon" ? "/onboarding" : "/update"}>
              <RollLabel text={mode === "anon" ? "เชื่อมพลัง" : "โปรไฟล์"} />
              <NavArrow />
            </Link>
          </Button>
          <Button
            ref={triggerRef}
            variant="ghost"
            size="icon"
            className="space-menu-trigger h-11 w-11 rounded-none"
            aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
            aria-expanded={open}
            aria-controls="space-menu"
            onClick={() => (open ? closeMenu() : openMenu())}
          >
            <MenuLines open={open} />
          </Button>
        </div>
      </header>
      {present && (
        <nav
          ref={menuRef}
          id="space-menu"
          role="dialog"
          aria-modal={open || undefined}
          aria-hidden={!open || undefined}
          inert={!open}
          aria-label="เมนูทั้งหมด"
          className="space-menu"
          data-phase={phase}
          data-lenis-prevent
        >
          <div className="space-menu-top">
            <Wordmark size="sm" withMark />
            <Button
              variant="ghost"
              size="icon"
              className="space-menu-trigger space-menu-dismiss h-11 w-11 rounded-none"
              aria-label="ปิดเมนู"
              onClick={() => closeMenu()}
            >
              <MenuLines open />
            </Button>
          </div>
          <div className="space-menu-grid">
            <div className="space-menu-primary" role="group" aria-label="เส้นทางหลัก">
              {LINKS.slice(0, 5).map((link, index) => (
                <MenuRouteLink
                  key={link.to}
                  link={link}
                  index={index}
                  onNavigate={() => closeMenu({ restoreFocus: false })}
                />
              ))}
            </div>
            <div className="space-menu-secondary" role="group" aria-label="เมนูเพิ่มเติม">
              <p className="space-menu-secondary-label">สำรวจเพิ่มเติม</p>
              {LINKS.slice(5).map((link, index) => (
                <MenuRouteLink
                  key={link.to}
                  link={link}
                  index={index + 5}
                  onNavigate={() => closeMenu({ restoreFocus: false })}
                />
              ))}
            </div>
          </div>
          <div className="space-menu-footer">
            <Button
              variant="ghost"
              className="nav-roll-target"
              onClick={() => {
                closeMenu();
                window.dispatchEvent(new Event(TOUR_EVENT));
              }}
            >
              <Compass aria-hidden />
              <RollLabel text="แนะนำการใช้งาน" />
            </Button>
            {mode === "anon" ? (
              <Button asChild variant="outline" className="nav-roll-target nav-motion-cta">
                <Link to="/auth" onClick={() => closeMenu({ restoreFocus: false })}>
                  <RollLabel text="เข้าสู่ระบบ / สมัคร" />
                  <NavArrow />
                </Link>
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm text-muted-foreground">{displayName}</span>
                <Button
                  variant="ghost"
                  className="nav-roll-target"
                  onClick={() => {
                    closeMenu();
                    void signOut();
                  }}
                >
                  <LogOut aria-hidden />
                  <RollLabel text="ออกจากระบบ" />
                </Button>
              </div>
            )}
          </div>
        </nav>
      )}
    </>
  );
}

function MenuRouteLink({
  link,
  index,
  onNavigate,
}: {
  link: (typeof LINKS)[number];
  index: number;
  onNavigate: () => void;
}) {
  return (
    <Link
      to={link.to}
      onClick={onNavigate}
      className="space-menu-item nav-roll-target"
      activeProps={{ className: "is-active", "aria-current": "page" }}
      style={{ "--nav-order": index } as CSSProperties}
    >
      <span aria-hidden className="space-menu-number font-tech text-xs text-muted-foreground">
        {String(index + 1).padStart(2, "0")}
      </span>
      <RollLabel text={link.label} className="space-menu-label" />
      <NavArrow className="space-menu-arrow" />
    </Link>
  );
}

function RollLabel({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`nav-roll ${className}`}>
      <span className="nav-roll-text">{text}</span>
      <span className="nav-roll-echo" aria-hidden="true">
        {text}
      </span>
    </span>
  );
}

function NavArrow({ className = "" }: { className?: string }) {
  return (
    <span className={`nav-arrow-motion ${className}`} aria-hidden="true">
      <ArrowUpRight />
      <ArrowUpRight />
    </span>
  );
}

function MenuLines({ open }: { open: boolean }) {
  return (
    <span className={`space-menu-lines${open ? " is-open" : ""}`} aria-hidden="true">
      <span />
      <span />
    </span>
  );
}
