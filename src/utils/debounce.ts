export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  cooldownMs = 500
) {
  let ready = true;
  return (...args: Parameters<T>) => {
    if (!ready) return;
    ready = false;
    try {
      fn(...args);
    } finally {
      setTimeout(() => (ready = true), cooldownMs);
    }
  };
}
