export type CuttingOperation = "drilling" | "milling" | "turning";
export type CuttingProfile = "conservative" | "standard" | "productive";
export type FeedMode = "per-revolution" | "per-tooth";

export type MaterialId =
  | "n-plastic"
  | "n-aluminium"
  | "n-alsi"
  | "n-brass"
  | "p-500"
  | "p-750"
  | "p-900"
  | "p-1100"
  | "p-1400"
  | "m-900"
  | "m-hard"
  | "k-cast"
  | "s-titanium"
  | "h-55"
  | "h-65";

export type RangeValue = number | [number, number];

export type MaterialRecommendation = {
  vc: RangeValue;
  feed?: RangeValue;
  ap?: RangeValue;
  ae?: string;
};

export type DiameterFeedPoint = {
  diameter: number;
  feed: number;
};

export type CuttingPreset = {
  id: string;
  operation: CuttingOperation;
  family: string;
  name: string;
  article: string;
  toolMaterial: string;
  coating: string;
  page: number;
  feedMode: FeedMode;
  defaultTeeth?: number;
  diameterMin?: number;
  diameterMax?: number;
  diameterFeed?: DiameterFeedPoint[];
  materials: Partial<Record<MaterialId, MaterialRecommendation>>;
  note: string;
};

export const materialLabels: Record<MaterialId, string> = {
  "n-plastic": "N · Plastiche / materiali non ferrosi",
  "n-aluminium": "N · Alluminio",
  "n-alsi": "N · Alluminio pressofuso > 10% Si",
  "n-brass": "N · Ottone / CuZn",
  "p-500": "P · Acciaio < 500 N/mm²",
  "p-750": "P · Acciaio < 750 N/mm²",
  "p-900": "P · Acciaio < 900 N/mm²",
  "p-1100": "P · Acciaio < 1.100 N/mm²",
  "p-1400": "P · Acciaio < 1.400 N/mm²",
  "m-900": "M · Inox < 900 N/mm²",
  "m-hard": "M · Inox > 900 N/mm²",
  "k-cast": "K · Ghisa",
  "s-titanium": "S · Titanio",
  "h-55": "H · Temprato < 55 HRC",
  "h-65": "H · Temprato < 65 HRC",
};

export const operationLabels: Record<CuttingOperation, string> = {
  drilling: "Foratura",
  milling: "Fresatura",
  turning: "Tornitura",
};

export const profileLabels: Record<CuttingProfile, string> = {
  conservative: "Prudente",
  standard: "Catalogo",
  productive: "Produttivo",
};

const drillHssFeed: DiameterFeedPoint[] = [
  { diameter: 1, feed: 0.03 },
  { diameter: 3.5, feed: 0.03 },
  { diameter: 5, feed: 0.05 },
  { diameter: 7.5, feed: 0.07 },
  { diameter: 10.5, feed: 0.1 },
  { diameter: 15.5, feed: 0.16 },
  { diameter: 20, feed: 0.2 },
];

const drillCarbideFeed: DiameterFeedPoint[] = [
  { diameter: 2.5, feed: 0.07 },
  { diameter: 3, feed: 0.09 },
  { diameter: 4, feed: 0.11 },
  { diameter: 5, feed: 0.13 },
  { diameter: 6, feed: 0.15 },
  { diameter: 7, feed: 0.17 },
  { diameter: 8, feed: 0.19 },
  { diameter: 9, feed: 0.2 },
  { diameter: 10, feed: 0.22 },
  { diameter: 12, feed: 0.24 },
  { diameter: 14, feed: 0.26 },
  { diameter: 15.8, feed: 0.27 },
];

const millHssFeed: DiameterFeedPoint[] = [
  { diameter: 1, feed: 0.005 },
  { diameter: 3, feed: 0.007 },
  { diameter: 5, feed: 0.012 },
  { diameter: 7, feed: 0.016 },
  { diameter: 8, feed: 0.02 },
  { diameter: 10, feed: 0.03 },
  { diameter: 12, feed: 0.035 },
  { diameter: 14, feed: 0.042 },
  { diameter: 16, feed: 0.048 },
  { diameter: 20, feed: 0.06 },
  { diameter: 25, feed: 0.065 },
  { diameter: 40, feed: 0.072 },
];

const millCarbideSlotFeed: DiameterFeedPoint[] = [
  { diameter: 3, feed: 0.02 },
  { diameter: 4, feed: 0.02 },
  { diameter: 5, feed: 0.03 },
  { diameter: 6, feed: 0.04 },
  { diameter: 8, feed: 0.05 },
  { diameter: 10, feed: 0.06 },
  { diameter: 12, feed: 0.07 },
  { diameter: 14, feed: 0.08 },
  { diameter: 16, feed: 0.08 },
  { diameter: 18, feed: 0.1 },
  { diameter: 20, feed: 0.1 },
  { diameter: 25, feed: 0.12 },
];

export const cuttingPresets: CuttingPreset[] = [
  {
    id: "hoffmann-114001",
    operation: "drilling",
    family: "Punta HSS",
    name: "GARANT punta elicoidale con 3 superfici di serraggio",
    article: "11 4001",
    toolMaterial: "HSS-E",
    coating: "Non rivestita",
    page: 43,
    feedMode: "per-revolution",
    diameterMin: 1,
    diameterMax: 20,
    diameterFeed: drillHssFeed,
    materials: {
      "n-plastic": { vc: 70 },
      "n-aluminium": { vc: 45 },
      "n-alsi": { vc: 40 },
      "n-brass": { vc: 80 },
      "p-500": { vc: 40 },
      "p-750": { vc: 30 },
      "p-900": { vc: 25 },
      "p-1100": { vc: 10 },
      "p-1400": { vc: 8 },
      "m-900": { vc: 12 },
      "m-hard": { vc: 8 },
      "k-cast": { vc: 25 },
    },
    note:
      "Avanzamento tabellato per acciaio < 900 N/mm²; profondità massima consigliata L2 = Lc − 1,5 × D.",
  },
  {
    id: "hoffmann-122450",
    operation: "drilling",
    family: "Punta HM",
    name: "GARANT Uni Hero, punta ad alte prestazioni",
    article: "12 2450",
    toolMaterial: "Metallo duro integrale",
    coating: "TiAlSiN",
    page: 96,
    feedMode: "per-revolution",
    diameterMin: 2.5,
    diameterMax: 15.8,
    diameterFeed: drillCarbideFeed,
    materials: {
      "n-plastic": { vc: 190 },
      "n-aluminium": { vc: 200 },
      "n-alsi": { vc: 160 },
      "p-500": { vc: 150 },
      "p-750": { vc: 140 },
      "p-900": { vc: 110 },
      "p-1100": { vc: 90 },
      "p-1400": { vc: 90 },
      "m-900": { vc: 80 },
      "m-hard": { vc: 40 },
      "s-titanium": { vc: 130 },
    },
    note:
      "Avanzamento tabellato per acciaio < 1.100 N/mm²; adduzione interna fino a 25 bar.",
  },
  {
    id: "hoffmann-191050",
    operation: "milling",
    family: "Fresa HSS",
    name: "GARANT fresa per cave",
    article: "19 1050",
    toolMaterial: "HSS-PM",
    coating: "TiAlN",
    page: 395,
    feedMode: "per-tooth",
    defaultTeeth: 2,
    diameterMin: 1,
    diameterMax: 40,
    diameterFeed: millHssFeed,
    materials: {
      "n-plastic": { vc: 138 },
      "n-aluminium": { vc: 110 },
      "n-alsi": { vc: 83 },
      "n-brass": { vc: 110 },
      "p-500": { vc: 83 },
      "p-750": { vc: 64 },
      "p-900": { vc: 64 },
      "p-1100": { vc: 37 },
      "p-1400": { vc: 32 },
      "m-900": { vc: 23 },
      "m-hard": { vc: 18 },
      "k-cast": { vc: 46 },
    },
    note:
      "Fresa per cave e tasche dal pieno. L’avanzamento fz è riferito alla lavorazione di acciaio.",
  },
  {
    id: "hoffmann-203034",
    operation: "milling",
    family: "Fresa HM",
    name: "GARANT Master Steel, sgrossatura e finitura HPC",
    article: "20 3034",
    toolMaterial: "Metallo duro integrale",
    coating: "TiAlN",
    page: 470,
    feedMode: "per-tooth",
    defaultTeeth: 4,
    diameterMin: 3,
    diameterMax: 25,
    diameterFeed: millCarbideSlotFeed,
    materials: {
      "p-500": { vc: 260, ae: "0,5 × D" },
      "p-750": { vc: 240, ae: "0,5 × D" },
      "p-900": { vc: 190, ae: "0,5 × D" },
      "p-1100": { vc: 180, ae: "0,5 × D" },
      "p-1400": { vc: 150, ae: "0,5 × D" },
      "m-900": { vc: 80, ae: "0,5 × D" },
      "m-hard": { vc: 70, ae: "0,5 × D" },
      "k-cast": { vc: 250, ae: "0,5 × D" },
    },
    note:
      "Valori fz per scanalatura piena su acciaio < 900 N/mm². Versione 20 3034 fino a 1 × D dal pieno.",
  },
  {
    id: "hoffmann-212552-hb4015",
    operation: "milling",
    family: "Placchetta fresa",
    name: "GARANT CPHX 060205 ER HB4015",
    article: "21 2552",
    toolMaterial: "Metallo duro rivestito",
    coating: "HB4015",
    page: 601,
    feedMode: "per-tooth",
    defaultTeeth: 3,
    materials: {
      "p-500": { vc: 400, feed: 0.25, ap: [0.2, 1] },
      "p-750": { vc: 380, feed: 0.25, ap: [0.2, 1] },
      "p-900": { vc: 360, feed: 0.25, ap: [0.2, 1] },
      "p-1100": { vc: 340, feed: 0.25, ap: [0.2, 1] },
      "p-1400": { vc: 320, feed: 0.25, ap: [0.2, 1] },
    },
    note:
      "Inserto Wiper per finitura di precisione; valori indicativi con ae = 0,2 mm. In spianatura ridurre Vc del 30%.",
  },
  {
    id: "hoffmann-250158-hb7020",
    operation: "turning",
    family: "Placchetta tornio",
    name: "GARANT CNMG 120408 SM HB7020-2",
    article: "25 0158",
    toolMaterial: "Metallo duro rivestito",
    coating: "HB7020-2",
    page: 731,
    feedMode: "per-revolution",
    materials: {
      "p-900": { vc: [130, 370], feed: [0.2, 0.5], ap: [0.3, 4] },
    },
    note:
      "Rompitruciolo SM per lavorazione media dell’acciaio.",
  },
  {
    id: "hoffmann-250158-hb7130",
    operation: "turning",
    family: "Placchetta tornio",
    name: "GARANT CNMG 120408 VM HB7130-2",
    article: "25 0158",
    toolMaterial: "Metallo duro rivestito",
    coating: "HB7130-2",
    page: 731,
    feedMode: "per-revolution",
    materials: {
      "m-900": { vc: [70, 240], feed: [0.1, 0.4], ap: [0.5, 4] },
    },
    note:
      "Rompitruciolo VM per lavorazione media dell’acciaio inossidabile.",
  },
  {
    id: "hoffmann-250158-hb7210",
    operation: "turning",
    family: "Placchetta tornio",
    name: "GARANT CNMG 120408 GM HB7210-1",
    article: "25 0158",
    toolMaterial: "Metallo duro rivestito",
    coating: "HB7210-1",
    page: 731,
    feedMode: "per-revolution",
    materials: {
      "k-cast": { vc: [100, 450], feed: [0.3, 0.7], ap: [0.4, 6.5] },
    },
    note:
      "Rompitruciolo GM per lavorazione media della ghisa.",
  },
  {
    id: "hoffmann-250158-hu7305",
    operation: "turning",
    family: "Placchetta tornio",
    name: "GARANT CNMG 120408 AM1 HU7305-1",
    article: "25 0158",
    toolMaterial: "Metallo duro",
    coating: "HU7305-1",
    page: 731,
    feedMode: "per-revolution",
    materials: {
      "n-aluminium": { vc: [400, 700], feed: [0.05, 0.6], ap: [0.2, 5] },
    },
    note:
      "Geometria AM1 per materiali non ferrosi e alluminio.",
  },
  {
    id: "hoffmann-250158-hb7415",
    operation: "turning",
    family: "Placchetta tornio",
    name: "GARANT CNMG 120408 TIM HB7415-1",
    article: "25 0158",
    toolMaterial: "Metallo duro rivestito",
    coating: "HB7415-1",
    page: 731,
    feedMode: "per-revolution",
    materials: {
      "s-titanium": { vc: [40, 90], feed: [0.1, 0.3], ap: [0.5, 4] },
    },
    note:
      "Geometria TIM per titanio e leghe resistenti al calore.",
  },
  {
    id: "hoffmann-260052-hb7020",
    operation: "turning",
    family: "Placchetta tornio positiva",
    name: "GARANT CCMT 060204 SS HB7020-2",
    article: "26 0052",
    toolMaterial: "Metallo duro rivestito",
    coating: "HB7020-2",
    page: 770,
    feedMode: "per-revolution",
    materials: {
      "p-900": { vc: [140, 400], feed: [0.07, 0.25], ap: [0.2, 1.5] },
    },
    note:
      "Inserto positivo CCMT, rompitruciolo SS per finitura e lavorazione media.",
  },
];

export function materialsForPreset(preset: CuttingPreset) {
  return Object.keys(preset.materials) as MaterialId[];
}

export function valueForProfile(
  value: RangeValue,
  profile: CuttingProfile,
) {
  if (Array.isArray(value)) {
    const [minimum, maximum] = value;
    const share =
      profile === "conservative"
        ? 0
        : profile === "standard"
          ? 0.5
          : 1;

    return minimum + (maximum - minimum) * share;
  }

  const multiplier =
    profile === "conservative"
      ? 0.85
      : profile === "productive"
        ? 1.1
        : 1;

  return value * multiplier;
}

export function feedForDiameter(
  points: DiameterFeedPoint[] | undefined,
  diameter: number,
) {
  if (!points?.length) {
    return null;
  }

  if (diameter <= points[0].diameter) {
    return points[0].feed;
  }

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];

    if (diameter <= current.diameter) {
      const span = current.diameter - previous.diameter;
      const share = span
        ? (diameter - previous.diameter) / span
        : 0;

      return previous.feed + (current.feed - previous.feed) * share;
    }
  }

  return points[points.length - 1].feed;
}

export function formatRange(
  value: RangeValue | undefined,
  suffix = "",
) {
  if (value === undefined) {
    return "—";
  }

  if (Array.isArray(value)) {
    return `${formatCuttingNumber(value[0])}–${formatCuttingNumber(
      value[1],
    )}${suffix}`;
  }

  return `${formatCuttingNumber(value)}${suffix}`;
}

export function formatCuttingNumber(
  value: number,
  maximumFractionDigits = 2,
) {
  return new Intl.NumberFormat("it-IT", {
    maximumFractionDigits,
  }).format(value);
}
