import type { PosAPI } from '../../preload/index';

declare global {
  interface Window {
    posAPI: PosAPI;
  }
}

export {};
