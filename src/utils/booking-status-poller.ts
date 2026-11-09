export const BOOKING_STATUS_POLL_INTERVAL_MS = 3000;

export function startBookingStatusPoller<T>(
  fetchStatus: (signal: AbortSignal) => Promise<T>,
  onUpdate: (value: T) => void,
  onError: (error: unknown) => void,
) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();

  async function poll() {
    try {
      const value = await fetchStatus(controller.signal);
      if (!stopped) onUpdate(value);
    } catch (error) {
      if (!stopped) onError(error);
    } finally {
      if (!stopped) {
        timer = setTimeout(() => void poll(), BOOKING_STATUS_POLL_INTERVAL_MS);
      }
    }
  }

  void poll();

  return () => {
    stopped = true;
    controller.abort();
    if (timer) clearTimeout(timer);
  };
}
