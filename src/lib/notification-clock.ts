/** Keep relative notification timestamps current, including after a suspended tab. */
export function watchNotificationClock(onTick: (now: number) => void) {
  const update = () => onTick(Date.now());
  const onVisible = () => {
    if (document.visibilityState === "visible") update();
  };
  update();
  const timer = window.setInterval(update, 30_000);
  window.addEventListener("focus", update);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("focus", update);
    document.removeEventListener("visibilitychange", onVisible);
  };
}