import type { Nade } from "./types";
import raw from "../csnades-catalog.json";

type CatalogFile = {
  nades: Array<{
    map: string;
    type: string;
    to: string;
    from: string;
    slug: string;
    url: string;
    team?: string;
    label?: string;
  }>;
};

const file = raw as CatalogFile;

export const NADE_CATALOG: Nade[] = (file.nades || []).map((n) => ({
  map: n.map,
  type: n.type,
  to: n.to || "",
  from: n.from || "",
  slug: n.slug,
  url: n.url,
  team: n.team,
  label: n.label || "",
}));

export const CATALOG_SIZE = NADE_CATALOG.length;
