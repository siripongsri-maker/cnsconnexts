import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { OrbitScene } from "@/components/orbit-scene";
import { ThailandNetwork } from "@/components/thailand-network";
import { useMotionSettings } from "@/lib/motion";
import missionSatellite from "@/assets/mission-satellite.jpg";

const CHAPTERS = [
  { label: "เริ่มที่เรา", href: "#welcome-title" },
  { label: "สิ่งที่ท้าทาย", href: "#challenge" },
  { label: "พลังที่เติมกัน", href: "#story-connection" },
  { label: "ไปด้วยกัน", href: "#story-together" },
  { label: "บอกพลัง", href: "#story-define" },
  { label: "พบคน", href: "#story-discover" },
  { label: "เชื่อมต่อ", href: "#story-connect" },
  { label: "ลงมือทำ", href: "#story-act" },
  { label: "ประเทศไทย", href: "#story-thailand" },
  { label: "เครือข่าย", href: "#explore-network" },
] as const;
const CHAPTER_COUNT = CHAPTERS.length;
const SLOT = 1 / CHAPTER_COUNT;
const STEPS = [
  { en: "Define", th: "บอกพลังของคุณ", description: "สิ่งที่มี · สิ่งที่มองหา", to: "/onboarding" },
  {
    en: "Discover",
    th: "เจอคนที่ใช่",
    description: "คนที่เติมกัน พร้อมเหตุผลที่ควรเจอ",
    to: "/matches",
  },
  {
    en: "Connect",
    th: "เชื่อมและนัดคุย",
    description: "แชท นัดหมาย วางก้าวต่อไป",
    to: "/commitments",
  },
  { en: "Act", th: "ลงมือด้วยกัน", description: "แลกไอเดีย สร้างงาน ติดตามผล", to: "/marketplace" },
] as const;

/** One scroll-controlled scene, with the complete reading flow available without motion. */
export function MissionStory() {
  const host = useRef<HTMLElement>(null);
  const progressRef = useRef(0);
  const chapterRail = useRef<HTMLElement>(null);
  const { ready, reducedMotion, lowSpec } = useMotionSettings();
  const [enhanced, setEnhanced] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [shortViewport, setShortViewport] = useState(false);
  const disabled = !ready || reducedMotion || lowSpec || shortViewport;
  const sceneLoaded = useCallback(() => setSceneReady(true), []);

  useEffect(() => {
    if (disabled) setSceneReady(false);
  }, [disabled]);

  useEffect(() => {
    const rail = chapterRail.current;
    const item = rail?.children[chapter] as HTMLElement | undefined;
    if (!rail || !item || rail.scrollWidth <= rail.clientWidth) return;
    rail.scrollTo({
      left: item.offsetLeft - (rail.clientWidth - item.offsetWidth) / 2,
      behavior: disabled ? "auto" : "smooth",
    });
  }, [chapter, disabled]);

  useEffect(() => {
    const media = window.matchMedia(
      "(max-height: 540px), (max-width: 700px) and (max-height: 600px)",
    );
    const update = () => setShortViewport(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const el = host.current;
    const failed = () => setSceneReady(false);
    el?.addEventListener("orbit-scene-error", failed);
    return () => el?.removeEventListener("orbit-scene-error", failed);
  }, []);

  const jump = useCallback(
    (index: number) => {
      const el = host.current;
      if (!el || !enhanced) return;
      const range = Math.max(1, el.offsetHeight - window.innerHeight);
      const top =
        el.getBoundingClientRect().top +
        window.scrollY +
        (index * SLOT + (index ? SLOT * 0.36 : 0)) * range;
      const event = new CustomEvent("connexts:scroll-to", { detail: { top }, cancelable: true });
      if (window.dispatchEvent(event))
        window.scrollTo({ top, behavior: disabled ? "auto" : "smooth" });
    },
    [enhanced, disabled],
  );

  useEffect(() => {
    if (!enhanced) return;
    const revealHash = () => {
      const index = CHAPTERS.findIndex(({ href }) => href === window.location.hash);
      if (index >= 0) jump(index);
    };
    revealHash();
    window.addEventListener("hashchange", revealHash);
    return () => window.removeEventListener("hashchange", revealHash);
  }, [enhanced, jump]);

  useEffect(() => {
    const el = host.current;
    if (!el || disabled) return;
    let disposed = false;
    let clean: (() => void) | undefined;
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")])
      .then(([{ gsap }, { ScrollTrigger }]) => {
        if (disposed) return;
        gsap.registerPlugin(ScrollTrigger);
        const scenes = Array.from(el.querySelectorAll<HTMLElement>("[data-story-scene]"));
        let active = 0;
        el.dataset["storyEnhanced"] = "true";
        const context = gsap.context(() => {
          const timeline = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: el,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.65,
              invalidateOnRefresh: true,
            },
          });
          gsap.set(scenes, { opacity: 0, pointerEvents: "none" });
          const intro = scenes[0];
          if (intro) gsap.set(intro, { opacity: 1 });
          gsap.set(el.querySelectorAll(".story-copy-stack a"), { pointerEvents: "none" });
          scenes.forEach((scene, index) => {
            const start = index * SLOT;
            const links = scene.querySelectorAll("a");
            if (index) {
              timeline.fromTo(
                scene,
                { opacity: 0, y: 34 },
                { opacity: 1, y: 0, duration: SLOT * 0.28 },
                start,
              );
              timeline.fromTo(
                scene.querySelectorAll(".story-line > span"),
                { yPercent: 105 },
                {
                  yPercent: 0,
                  stagger: SLOT * 0.056,
                  duration: SLOT * 0.36,
                  ease: "power3.out",
                },
                start,
              );
            }
            if (links.length) timeline.set(links, { pointerEvents: "auto" }, start + SLOT * 0.28);
            const ink = scene.querySelector<HTMLElement>(".story-ink");
            if (ink)
              timeline.fromTo(
                ink,
                { "--ink": "0%" },
                { "--ink": "100%", duration: SLOT * 0.544 },
                start + SLOT * 0.144,
              );
            if (index < CHAPTER_COUNT - 1) {
              if (links.length)
                timeline.set(links, { pointerEvents: "none" }, start + SLOT * 0.816);
              timeline.to(
                scene,
                { opacity: 0, y: -24, duration: SLOT * 0.2 },
                start + SLOT * 0.816,
              );
            }
          });
          timeline.to({}, { duration: 0.01 }, 0.99);
          // One scrubbed playhead keeps the camera, map and copy in the same frame.
          timeline.eventCallback("onUpdate", () => {
            const progress = timeline.progress();
            progressRef.current = progress;
            el.style.setProperty("--story-progress", String(progress));
            el.style.setProperty(
              "--thailand-reveal",
              String(Math.max(0, Math.min(1, (progress - 0.82) / 0.08))),
            );
            el.style.setProperty(
              "--network-progress",
              String(Math.max(0, Math.min(1, (progress - 0.9) / 0.075))),
            );
            const next = Math.min(CHAPTER_COUNT - 1, Math.floor(progress * CHAPTER_COUNT));
            if (next !== active) {
              active = next;
              setChapter(next);
            }
          });
        }, el);
        setEnhanced(true);
        ScrollTrigger.refresh();
        clean = () => {
          context.revert();
          delete el.dataset["storyEnhanced"];
          el.style.removeProperty("--story-progress");
          el.style.removeProperty("--thailand-reveal");
          el.style.removeProperty("--network-progress");
          progressRef.current = 0;
          setEnhanced(false);
        };
      })
      .catch(() => {
        /* The static reading layout remains complete. */
      });
    return () => {
      disposed = true;
      clean?.();
    };
  }, [disabled]);

  return (
    <section
      ref={host}
      className={`mission-story${sceneReady && enhanced && !disabled ? " scene-ready" : ""}`}
      data-chapters-visible={chapter >= 3 ? "true" : undefined}
      aria-label="เรื่องราวของพลังที่เชื่อมกัน"
    >
      <a
        className="story-skip"
        href="#explore-network"
        onClick={(event) => {
          if (!enhanced) return;
          event.preventDefault();
          event.stopPropagation();
          jump(CHAPTER_COUNT - 1);
        }}
      >
        ข้ามเรื่องราว ไปสำรวจเครือข่าย
      </a>
      <div className="story-stage">
        <div className="story-visual" aria-hidden="true">
          <img
            className="story-fallback"
            src={missionSatellite}
            alt=""
            width={1920}
            height={1088}
            fetchPriority="high"
          />
          <OrbitScene
            progressRef={progressRef}
            disabled={disabled}
            onReady={sceneLoaded}
          />
          {enhanced && <ThailandNetwork progressRef={progressRef} disabled={disabled} />}
          <div className="story-vignette" />
        </div>
        <div
          className="story-copy-stack"
          onFocusCapture={(event) => {
            const scene = (event.target as HTMLElement).closest<HTMLElement>("[data-story-scene]");
            const index = Number(scene?.dataset["storyScene"] ?? 0);
            if (enhanced && index !== chapter) jump(index);
          }}
        >
          <section
            data-story-scene="0"
            className="story-scene story-intro"
            aria-labelledby="welcome-title"
          >
            <p className="mission-eyebrow" lang="en">
              People. Ideas. Action.
            </p>
            <h1 id="welcome-title" className="story-title" lang="en">
              <span className="story-line">
                <span>CONNECTING</span>
              </span>
              <span className="story-line">
                <span>
                  POWER<span className="mission-period">.</span>
                </span>
              </span>
            </h1>
            <p className="story-description">
              เชื่อมคน ไอเดีย และพื้นที่
              <br />
              สู่การลงมือทำด้วยกัน
            </p>
          </section>
          <section id="challenge" data-story-scene="1" className="story-scene story-statement">
            <p className="mission-eyebrow story-warm" lang="en">
              01 / The challenge
            </p>
            <h2 className="story-ink">
              <span>เจอคนมากมาย</span>
              <span>แต่ยังไม่เจอคนที่ใช่</span>
            </h2>
          </section>
          <section
            id="story-connection"
            data-story-scene="2"
            className="story-scene story-statement"
          >
            <p className="mission-eyebrow" lang="en">
              02 / The connection
            </p>
            <h2 className="story-ink">
              <span>เชื่อมสิ่งที่คุณมี</span>
              <span>กับสิ่งที่ใครสักคนต้องการ</span>
            </h2>
          </section>
          <section id="story-together" data-story-scene="3" className="story-scene story-together">
            <p className="mission-eyebrow" lang="en">
              Different powers. One network.
            </p>
            <h2>
              <span className="story-line">
                <span>พลังของคุณ</span>
              </span>
              <span className="story-line">
                <span>พลังของเรา</span>
              </span>
            </h2>
            <p className="story-description">รู้จัก เชื่อมต่อ แล้วไปต่อด้วยกัน</p>
          </section>
          {STEPS.map((step, index) => (
            <section
              id={`story-${step.en.toLowerCase()}`}
              data-story-scene={index + 4}
              className={`story-scene story-step story-step-${index + 1}`}
              key={step.en}
            >
              <p className="mission-eyebrow" lang="en">
                0{index + 1} / Your next move
              </p>
              <h2 className="story-step-title" lang="en">
                <span className="story-line">
                  <span>{step.en}</span>
                </span>
              </h2>
              <p className="story-step-th">{step.th}</p>
              <p className="story-description">{step.description}</p>
              <Link to={step.to} className="story-step-link">
                {step.th}
                <ArrowUpRight size={20} aria-hidden="true" />
              </Link>
            </section>
          ))}
          <section id="story-thailand" data-story-scene="8" className="story-scene story-place">
            <p className="mission-eyebrow" lang="en">
              From the world. To Thailand.
            </p>
            <h2 className="story-place-title">
              <span className="story-line">
                <span>จากโลกกว้าง</span>
              </span>
              <span className="story-line">
                <span>
                  สู่ประเทศไทย<span className="mission-period">.</span>
                </span>
              </span>
            </h2>
            <p className="story-description">เริ่มจากพื้นที่ที่เราอยู่</p>
          </section>
          <section
            id="explore-network"
            data-story-scene="9"
            className="story-scene story-place story-network"
          >
            <p className="mission-eyebrow" lang="en">
              One connected network
            </p>
            <h2 className="story-place-title">
              <span className="story-line">
                <span>ต่างพื้นที่</span>
              </span>
              <span className="story-line">
                <span>
                  พลังเดียวกัน<span className="mission-period">.</span>
                </span>
              </span>
            </h2>
            <p className="story-description">เชื่อมคน เชื่อมไอเดีย ข้ามพื้นที่</p>
            {!enhanced && (
              <div className="story-static-map" aria-hidden="true">
                <ThailandNetwork progressRef={progressRef} disabled />
              </div>
            )}
            <Link to="/map" className="story-step-link">
              สำรวจแผนที่พลัง <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
            <p className="story-map-note">ภาพแนวคิดการเชื่อมโยงพื้นที่</p>
          </section>
        </div>
        <nav
          ref={chapterRail}
          className="story-chapters"
          aria-label="ช่วงของเรื่องราว"
          data-lenis-prevent
        >
          {CHAPTERS.map(({ label, href }, index) => (
            <a
              key={label}
              href={href}
              aria-current={chapter === index ? "step" : undefined}
              aria-label={`${String(index + 1).padStart(2, "0")} ${label}`}
              className={chapter === index ? "is-active" : ""}
              onClick={(event) => {
                if (enhanced) {
                  event.preventDefault();
                  event.stopPropagation();
                  jump(index);
                }
              }}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="story-bottom">
          <a
            href="#challenge"
            className="story-scroll"
            aria-label="เลื่อนเพื่อรู้จักเรา"
            onClick={(event) => {
              if (enhanced) {
                event.preventDefault();
                event.stopPropagation();
                jump(Math.min(CHAPTER_COUNT - 1, chapter + 1));
              }
            }}
          >
            <ArrowDown size={16} aria-hidden="true" />
            <span>เลื่อนเพื่อรู้จักเรา</span>
          </a>
          <Link
            to={enhanced && chapter === CHAPTER_COUNT - 1 ? "/map" : "/onboarding"}
            className="mission-action"
          >
            {enhanced && chapter === CHAPTER_COUNT - 1 ? "สำรวจแผนที่พลัง" : "เริ่มเชื่อมพลัง"}
            <span className="mission-action-icon">
              <ArrowUpRight aria-hidden="true" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
