// מצב קטן שמשותף לכל הממשק (לא נשמר במסד)
type Listener = () => void;

function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => value,
    set(next: T) {
      value = next;
      listeners.forEach((l) => l());
    },
    subscribe(l: Listener) {
      listeners.add(l);
      return () => listeners.delete(l);
    }
  };
}

export interface ToastState {
  id: number;
  message: string;
  undo?: () => Promise<void> | void;
}

export const toastStore = createStore<ToastState | null>(null);
/** פונקציה שמפעילה את הגרסה החדשה, כשיש כזו (3.6) */
export const updateStore = createStore<null | (() => void)>(null);

let seq = 0;
/** הודעה עם "בטל" ל-5 שניות (3.7) */
export function showToast(message: string, undo?: ToastState['undo']): void {
  toastStore.set({ id: ++seq, message, undo });
}

import { useEffect, useState } from 'preact/hooks';
export function useStore<T>(store: { get: () => T; subscribe: (l: Listener) => () => boolean | void }): T {
  const [v, setV] = useState(store.get());
  useEffect(() => {
    setV(store.get());
    const un = store.subscribe(() => setV(() => store.get()));
    return () => {
      un();
    };
  }, [store]);
  return v;
}
