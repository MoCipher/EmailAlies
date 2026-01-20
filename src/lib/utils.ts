import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Runtime detection for Cloudflare environments
export const isCloudflarePages = () => {
  return typeof globalThis !== 'undefined' &&
         'caches' in globalThis &&
         'KVNamespace' in globalThis;
}

export const isCloudflareWorkers = () => {
  return typeof globalThis !== 'undefined' &&
         'WebSocketPair' in globalThis &&
         'fetch' in globalThis;
}

export const isProduction = () => {
  return process.env.NODE_ENV === 'production' ||
         process.env.CF_PAGES === '1' ||
         typeof globalThis !== 'undefined' && 'caches' in globalThis;
}

export const getRuntimeInfo = () => {
  return {
    isPages: isCloudflarePages(),
    isWorkers: isCloudflareWorkers(),
    isProduction: isProduction(),
    environment: process.env.NODE_ENV || 'development',
    cfPages: process.env.CF_PAGES,
  };
}