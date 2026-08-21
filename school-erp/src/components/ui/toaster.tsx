"use client";
import * as React from "react";
import { create } from "zustand";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "destructive";
interface Toast { id: string; title: string; description?: string; variant?: ToastVariant }

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((s) => ({ toasts: [...s.toasts, { ...toast, id: crypto.randomUUID() }] })),
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export function toast(toast: Omit<Toast, "id">) {
  useToastStore.getState().addToast(toast);
  setTimeout(() => {
    const last = useToastStore.getState().toasts.at(-1);
    if (last) useToastStore.getState().removeToast(last.id);
  }, 4000);
}

const icons: Record<ToastVariant, React.ReactNode> = {
  default: <Info className="h-5 w-5 text-blue-500" />,
  success: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  destructive: <AlertCircle className="h-5 w-5 text-red-500" />,
};

export function Toaster() {
  const { toasts, removeToast } = useToastStore();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-start gap-3 rounded-lg border bg-white dark:bg-neutral-900 p-4 shadow-lg animate-in slide-in-from-bottom-2"
          )}
        >
          {icons[t.variant ?? "default"]}
          <div className="flex-1">
            <p className="text-sm font-medium">{t.title}</p>
            {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
          </div>
          <button onClick={() => removeToast(t.id)}>
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      ))}
    </div>
  );
}
