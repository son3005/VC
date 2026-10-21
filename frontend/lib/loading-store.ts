export interface LoadingSnapshot {
  visible: boolean;
  message: string;
}

type Listener = () => void;

const MIN_VISIBLE_MS = 350;

let count = 0;
let message = 'Đang xử lý...';
let visible = false;
let minVisibleUntil = 0;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let snapshot: LoadingSnapshot = { visible, message };

const listeners = new Set<Listener>();

function notify(): void {
  snapshot = { visible, message };
  listeners.forEach((listener) => listener());
}

function clearHideTimer(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
}

export function beginLoading(nextMessage = 'Đang xử lý...'): void {
  if (typeof window === 'undefined') return;

  clearHideTimer();
  count += 1;
  message = nextMessage;
  visible = true;
  minVisibleUntil = Math.max(minVisibleUntil, Date.now() + MIN_VISIBLE_MS);
  notify();
}

export function endLoading(): void {
  if (typeof window === 'undefined') return;

  count = Math.max(0, count - 1);
  if (count > 0) return;

  const remaining = Math.max(0, minVisibleUntil - Date.now());
  if (remaining > 0) {
    clearHideTimer();
    hideTimer = setTimeout(() => {
      if (count === 0) {
        visible = false;
        hideTimer = null;
        notify();
      }
    }, remaining);
    return;
  }

  visible = false;
  notify();
}

export function updateLoadingMessage(nextMessage: string): void {
  if (count === 0) return;
  message = nextMessage;
  notify();
}

export function subscribeLoading(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLoadingSnapshot(): LoadingSnapshot {
  return snapshot;
}

export function getLoadingServerSnapshot(): LoadingSnapshot {
  return { visible: false, message: 'Đang xử lý...' };
}
