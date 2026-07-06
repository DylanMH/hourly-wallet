import { useCallback, useSyncExternalStore } from "react";
import { AppState } from "react-native";

type Listener = () => void;

type Subscription = {
  listener: Listener;
  intervalMs: number;
};

class NowStore {
  now = new Date();
  private subscriptions: Subscription[] = [];
  private intervalId: ReturnType<typeof setInterval> | undefined;
  private appStateSubscription = AppState.addEventListener(
    "change",
    (state) => {
      if (state === "active") {
        this.now = new Date();
        this.notify();
      }
    },
  );

  private getIntervalMs() {
    if (this.subscriptions.length === 0) return undefined;
    return Math.min(...this.subscriptions.map((s) => s.intervalMs));
  }

  private schedule() {
    if (this.intervalId !== undefined) clearInterval(this.intervalId);
    const intervalMs = this.getIntervalMs();
    if (intervalMs === undefined) return;
    this.intervalId = setInterval(() => {
      this.now = new Date();
      this.notify();
    }, intervalMs);
  }

  private notify() {
    this.subscriptions.forEach((s) => s.listener());
  }

  subscribe(listener: Listener, intervalMs: number): () => void {
    // Refresh the snapshot immediately when the subscription starts so the UI
    // does not start from a stale time when the ticker becomes active.
    this.now = new Date();
    this.subscriptions.push({ listener, intervalMs });
    this.schedule();
    return () => {
      this.subscriptions = this.subscriptions.filter(
        (s) => s.listener !== listener,
      );
      this.schedule();
    };
  }

  getSnapshot() {
    return this.now;
  }
}

const globalStore = new NowStore();

/**
 * Returns a live `Date` that ticks every `intervalMs` while `enabled` is true.
 * Also refreshes immediately when the app returns to the foreground, so the
 * UI does not stay stale while the app was backgrounded.
 */
export function useNowTicker(enabled: boolean, intervalMs = 60000): Date {
  return useSyncExternalStore(
    useCallback(
      (callback) => {
        if (!enabled) return () => {};
        return globalStore.subscribe(callback, intervalMs);
      },
      [enabled, intervalMs],
    ),
    () => globalStore.getSnapshot(),
    () => new Date(),
  );
}
