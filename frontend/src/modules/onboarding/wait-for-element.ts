/** Poll until selector matches or timeout (ms). */
export function waitForElement(
  selector: string,
  timeoutMs = 8000,
  intervalMs = 80
): Promise<Element | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const el = document.querySelector(selector);
      if (el) {
        resolve(el);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(null);
        return;
      }
      window.setTimeout(tick, intervalMs);
    };
    tick();
  });
}
