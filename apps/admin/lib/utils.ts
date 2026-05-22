import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString("mn-MN")}₮`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("mn-MN", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("mn-MN", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
