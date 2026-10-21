import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { OrbitScene } from "@/components/orbit-scene";
import { useMotionSettings } from "@/lib/motion";
import missionSatellite from "@/assets/mission-satellite.jpg";

const CHAPTERS = [
  "เริ่มที่เรา",
  "สิ่งที่ท้าทาย",
  "พลังที่เติมกัน",
  "ไปด้วยกัน",
  "บอกพลัง",
  "พบคน",
  "เชื่อมต่อ",
  "ลงมือทำ",
];
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
  const { ready, reducedMotion, lowSpec } = useMotionSettings();
  const [enhanced, setEnhanced] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [shortViewport, setShortViewport] = useState(false);
  const disabled = !ready || reducedMotion || lowSpec || shortViewport;
  const sceneLoaded = useCallback(() => setSceneReady(true), []);

  useEffect(() => {
    const media = window.matchMedia("(max-height: 540px)");
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
        el.getBoundingClientRect().top + window.scrollY + (index / 8 + (index ? 0.045 : 0)) * range;
      const event = new CustomEvent("connexts:scroll-to", { detail: { top }, cancelable: true });
      if (window.dispatchEvent(event))
        window.scrollTo({ top, behavior: disabled ? "auto" : "smooth" });
    },
    [enhanced, disabled],
  );

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
              onUpdate: (self) => {
                progressRef.current = self.progress;
                el.style.setProperty("--story-progress", String(self.progress));
                const next = Math.min(7, Math.floor(self.progress * 8));
                if (next !== active) {
                  active = next;
                  setChapter(next);
                }
              },
            },
          });
          gsap.set(scenes, { opacity: 0, pointerEvents: "none" });
          gsap.set(scenes[0]!, { opacity: 1, pointerEvents: "auto" });
          scenes.forEach((scene, index) => {
            const start = index / 8;
            if (index) {
              timeline.fromTo(
                scene,
                { opacity: 0, y: 34 },
                { opacity: 1, y: 0, duration: 0.035, pointerEvents: "auto" },
                start,
              );
              timeline.fromTo(
                scene.querySelectorAll(".story-line > span"),
                { yPercent: 105 },
                { yPercent: 0, stagger: 0.007, duration: 0.045, ease: "power3.out" },
                start,
              );
            }
            const ink = scene.querySelector<HTMLElement>(".story-ink");
            if (ink)
              timeline.fromTo(
                ink,
                { "--ink": "0%" },
                { "--ink": "100%", duration: 0.068 },
                start + 0.018,
              );
            if (index < 7)
              timeline.to(
                scene,
                { opacity: 0, y: -24, duration: 0.025, pointerEvents: "none" },
                start + 0.102,
              );
          });
          timeline.to({}, { duration: 0.01 }, 0.99);
        }, el);
        setEnhanced(true);
        ScrollTrigger.refresh();
        clean = () => {
          context.revert();
          delete el.dataset["storyEnhanced"];
          el.style.removeProperty("--story-progress");
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
      className={`mission-story${sceneReady && !disabled ? " scene-ready" : ""}`}
      data-chapters-visible={chapter >= 3 ? "true" : undefined}
      aria-label="เรื่องราวของพลังที่เชื่อมกัน"
    >
      <a className="story-skip" href="#explore-network">
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
          <OrbitScene progressRef={progressRef} disabled={disabled} onReady={sceneLoaded} />
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
        </div>
        <nav className="story-chapters" aria-label="ช่วงของเรื่องราว">
          {CHAPTERS.map((label, index) => (
            <a
              key={label}
              href={
                index === 0
                  ? "#welcome-title"
                  : index === 1
                    ? "#challenge"
                    : index === 2
                      ? "#story-connection"
                      : index === 3
                        ? "#story-together"
                        : `#story-${STEPS[index - 4]!.en.toLowerCase()}`
              }
              aria-current={chapter === index ? "step" : undefined}
              aria-label={`0${index + 1} ${label}`}
              className={chapter === index ? "is-active" : ""}
              onClick={(event) => {
                if (enhanced) {
                  event.preventDefault();
                  event.stopPropagation();
                  jump(index);
                }
              }}
            >
              <span>0{index + 1}</span>
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
                jump(Math.min(7, chapter + 1));
              }
            }}
          >
            <ArrowDown size={16} aria-hidden="true" />
            <span>เลื่อนเพื่อรู้จักเรา</span>
          </a>
          <Link to="/onboarding" className="mission-action">
            เริ่มเชื่อมพลัง
            <span className="mission-action-icon">
              <ArrowUpRight aria-hidden="true" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
