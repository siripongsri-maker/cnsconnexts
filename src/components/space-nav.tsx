import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X, Compass, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";
import { useAuth } from "@/lib/auth";
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

export function SpaceNav() {
  const [open, setOpen] = useState(false);
  const { mode, displayName, signOut } = useAuth();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    menuRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
      if (event.key !== "Tab") return;
      const controls = menuRef.current?.querySelectorAll<HTMLElement>("a[href],button");
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", keydown);
    };
  }, [open]);

  return (
    <>
      <header className="space-nav">
        <Link to="/" aria-label="คนส. Connexts หน้าแรก" className="space-nav-brand">
          <Wordmark size="sm" withMark />
        </Link>
        <nav aria-label="เมนูด้านบน" className="hidden items-center gap-9 lg:flex">
          {LINKS.slice(0, 3).map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="space-nav-link"
              activeProps={{ className: "text-foreground" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 sm:gap-6">
          <Button asChild variant="outline" className="hidden h-11 rounded-none sm:inline-flex">
            <Link to={mode === "anon" ? "/onboarding" : "/update"}>
              {mode === "anon" ? "เชื่อมพลัง" : "โปรไฟล์"}
              <ArrowUpRight aria-hidden />
            </Link>
          </Button>
          <Button
            ref={triggerRef}
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-none"
            aria-label="เปิดเมนู"
            aria-expanded={open}
            aria-controls="space-menu"
            onClick={() => setOpen(true)}
          >
            <Menu aria-hidden />
          </Button>
        </div>
      </header>
      {open && (
        <nav
          ref={menuRef}
          id="space-menu"
          role="dialog"
          aria-modal="true"
          aria-label="เมนูทั้งหมด"
          className="space-menu"
        >
          <div className="space-menu-top">
            <Wordmark size="sm" withMark />
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-none"
              aria-label="ปิดเมนู"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              <X aria-hidden />
            </Button>
          </div>
          <div className="space-menu-grid">
            {LINKS.map((link, index) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className="space-menu-item"
              >
                <span aria-hidden className="font-tech text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">{link.label}</span>
                <ArrowUpRight className="ml-auto h-5 w-5 shrink-0" aria-hidden />
              </Link>
            ))}
          </div>
          <div className="space-menu-footer">
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
                window.dispatchEvent(new Event(TOUR_EVENT));
              }}
            >
              <Compass aria-hidden />
              แนะนำการใช้งาน
            </Button>
            {mode === "anon" ? (
              <Button asChild variant="outline">
                <Link to="/auth" onClick={() => setOpen(false)}>
                  เข้าสู่ระบบ / สมัคร
                </Link>
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm text-muted-foreground">{displayName}</span>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setOpen(false);
                    void signOut();
                  }}
                >
                  <LogOut aria-hidden />
                  ออกจากระบบ
                </Button>
              </div>
            )}
          </div>
        </nav>
      )}
    </>
  );
}
