import type { DlcFlag, Region } from "./types";
import raw from "./catalog/spirits.json";

export type SpiritAsh = {
  id: string;
  name: string;
  region?: Region;
  loc: string;
  dlc: DlcFlag;
  notes?: string;
  legendary?: boolean;
};

export const SPIRITS = raw as SpiritAsh[];
