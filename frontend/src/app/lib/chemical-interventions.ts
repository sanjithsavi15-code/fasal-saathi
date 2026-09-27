/**
 * Disease-Specific Chemical Interventions Database
 *
 * Precise pesticide/fungicide recommendations sourced from:
 *  - ICAR-IIHR / ICAR-SBI disease management guides
 *  - Maharashtra State Agriculture Department advisories
 *  - CIB&RC approved formulations for Indian agriculture
 *
 * Each entry maps a normalised disease key to exact products,
 * dosages, and application methods.
 */

export interface ChemicalIntervention {
  /** Commercial/generic product name */
  product: string;
  /** Active ingredient + formulation (e.g. "Mancozeb 75% WP") */
  activeIngredient: string;
  /** Dosage per litre / per hectare */
  dosage: string;
  /** Application method (foliar spray, seed treatment, etc.) */
  method: string;
  /** Pre-harvest interval in days (if applicable) */
  phi?: number;
}

export interface DiseaseChemicalPlan {
  /** Display name of the disease */
  diseaseName: string;
  /** Primary recommended intervention */
  primary: ChemicalIntervention;
  /** Optional alternates */
  alternates: ChemicalIntervention[];
  /** Additional cultural practice notes */
  notes: string[];
}

/**
 * Normalise a raw disease string into a lookup key.
 */
function normKey(raw: string): string {
  const k = raw.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  if (k.includes("late_blight") || k.includes("phytophthora")) return "late_blight";
  if (k.includes("early_blight") || k.includes("alternaria")) return "early_blight";
  if (k.includes("powdery_mildew")) return "powdery_mildew";
  if (k.includes("bacterial_wilt") || k === "wilt") return "bacterial_wilt";
  if (k.includes("red_rot") || k.includes("colletotrichum_falcatum")) return "red_rot";
  if (k.includes("smut") || k.includes("sporisorium")) return "smut";
  if (k.includes("rust") || k.includes("puccinia")) return "rust";
  if (k.includes("mosaic")) return "mosaic_disease";
  if (k.includes("anthracnose")) return "anthracnose";
  if (k.includes("downy_mildew") || k.includes("downy")) return "downy_mildew";
  return k;
}

const PLANS: Record<string, DiseaseChemicalPlan> = {
  late_blight: {
    diseaseName: "Late Blight",
    primary: {
      product: "Ridomil Gold MZ 68 WG",
      activeIngredient: "Metalaxyl-M 4% + Mancozeb 64% WG",
      dosage: "2.5 g/L water (spray volume 500 L/ha)",
      method: "Foliar spray at first symptoms; repeat every 7–10 days",
      phi: 14,
    },
    alternates: [
      {
        product: "Curzate M8",
        activeIngredient: "Cymoxanil 8% + Mancozeb 64% WP",
        dosage: "3 g/L water",
        method: "Preventive foliar spray pre-canopy closure",
        phi: 7,
      },
      {
        product: "Infinito",
        activeIngredient: "Fluopicolide 6% + Propamocarb 66.7% SC",
        dosage: "1.6 mL/L water",
        method: "Foliar spray; alternate with contact fungicide",
        phi: 7,
      },
    ],
    notes: [
      "Remove and destroy infected plant debris immediately.",
      "Avoid overhead irrigation; use drip to reduce leaf wetness.",
      "Rotate fungicide modes of action to prevent resistance.",
    ],
  },
  early_blight: {
    diseaseName: "Early Blight",
    primary: {
      product: "Score 250 EC",
      activeIngredient: "Difenoconazole 25% EC",
      dosage: "0.5 mL/L water",
      method: "Foliar spray at first appearance of concentric ring spots",
      phi: 7,
    },
    alternates: [
      {
        product: "Dithane M-45",
        activeIngredient: "Mancozeb 75% WP",
        dosage: "2.5 g/L water",
        method: "Preventive foliar spray every 7 days",
        phi: 7,
      },
      {
        product: "Amistar Top",
        activeIngredient: "Azoxystrobin 18.2% + Difenoconazole 11.4% SC",
        dosage: "1 mL/L water",
        method: "Curative + preventive foliar spray",
        phi: 7,
      },
    ],
    notes: [
      "Maintain adequate plant spacing for air circulation.",
      "Apply balanced NPK; avoid excess nitrogen.",
    ],
  },
  powdery_mildew: {
    diseaseName: "Powdery Mildew",
    primary: {
      product: "Karathane Gold",
      activeIngredient: "Meptyldinocap 35% EC",
      dosage: "0.5 mL/L water",
      method: "Foliar spray covering both leaf surfaces",
      phi: 14,
    },
    alternates: [
      {
        product: "Contaf Plus",
        activeIngredient: "Hexaconazole 5% SC",
        dosage: "2 mL/L water",
        method: "Foliar spray; repeat at 15-day intervals",
        phi: 14,
      },
      {
        product: "Sulfex",
        activeIngredient: "Sulphur 80% WP (Wettable Sulphur)",
        dosage: "3 g/L water",
        method: "Preventive dusting or spray in dry conditions (avoid >35°C)",
      },
    ],
    notes: [
      "Do NOT apply sulphur when temperature exceeds 35°C — phytotoxic.",
      "Prune dense canopy to improve air circulation.",
    ],
  },
  bacterial_wilt: {
    diseaseName: "Bacterial Wilt",
    primary: {
      product: "Streptocycline + Copper Oxychloride",
      activeIngredient: "Streptomycin sulphate 9:1 + COC 50% WP",
      dosage: "0.5 g Streptocycline + 3 g COC per litre water",
      method: "Soil drench around base of infected plants",
    },
    alternates: [
      {
        product: "Blitox-50",
        activeIngredient: "Copper Oxychloride 50% WP",
        dosage: "3 g/L water",
        method: "Soil drench; also foliar spray for secondary infections",
      },
    ],
    notes: [
      "No effective chemical cure once infection is systemic — prevention is key.",
      "Uproot and destroy infected plants. Do NOT compost them.",
      "Apply Trichoderma viride (4 g/kg seed) as biocontrol.",
      "Improve field drainage to reduce waterlogging.",
    ],
  },
  red_rot: {
    diseaseName: "Red Rot (Sugarcane)",
    primary: {
      product: "Bavistin 50% WP",
      activeIngredient: "Carbendazim 50% WP",
      dosage: "1 g/L water — sett soaking for 30 min or stalk drench",
      method: "Sett treatment before planting + stalk drench at detection",
    },
    alternates: [
      {
        product: "Trichoderma viride formulation",
        activeIngredient: "Trichoderma viride 1% WP (biocontrol)",
        dosage: "4 g/kg seed cane",
        method: "Sett treatment — soak setts for 15 min before planting",
      },
      {
        product: "Thiophanate-methyl 70% WP",
        activeIngredient: "Thiophanate-methyl 70% WP",
        dosage: "1 g/L water",
        method: "Stalk drench at early symptom stage",
      },
    ],
    notes: [
      "Use only disease-free seed cane (ICAR-certified).",
      "Hot water treatment (52°C for 30 min) of seed cane before planting.",
      "Avoid waterlogged conditions — improve field drainage.",
      "Do NOT ratoon heavily infected fields; plough and replant.",
    ],
  },
  smut: {
    diseaseName: "Smut (Sugarcane)",
    primary: {
      product: "Vitavax 200 WP",
      activeIngredient: "Carboxin 37.5% + Thiram 37.5% WP",
      dosage: "2 g/L water — sett treatment for 30 min",
      method: "Sett soaking before planting",
    },
    alternates: [
      {
        product: "Propiconazole 25% EC",
        activeIngredient: "Propiconazole 25% EC",
        dosage: "1 mL/L water",
        method: "Foliar spray at whip emergence stage (secondary control)",
      },
    ],
    notes: [
      "Uproot and burn all whip-bearing clumps immediately.",
      "Hot water treatment (52°C for 30 min) of all seed cane.",
      "Do NOT use ratoon from infected fields.",
      "Plant resistant varieties: CoC 671, Co 86032 (moderately resistant).",
    ],
  },
  rust: {
    diseaseName: "Rust (Sugarcane / General)",
    primary: {
      product: "Tilt 25% EC",
      activeIngredient: "Propiconazole 25% EC",
      dosage: "1 mL/L water",
      method: "Foliar spray at first pustule appearance; repeat at 14-day intervals",
      phi: 21,
    },
    alternates: [
      {
        product: "Dithane M-45",
        activeIngredient: "Mancozeb 75% WP",
        dosage: "2.5 g/L water",
        method: "Preventive foliar spray every 10 days during humid weather",
        phi: 7,
      },
      {
        product: "Nativo 75% WG",
        activeIngredient: "Tebuconazole 50% + Trifloxystrobin 25% WG",
        dosage: "0.5 g/L water",
        method: "Curative + preventive foliar spray",
        phi: 14,
      },
    ],
    notes: [
      "Reduce irrigation frequency to lower leaf wetness period.",
      "Remove lower infected leaves to slow spore buildup.",
      "Consider early harvest if infection exceeds 40% leaf area.",
    ],
  },
  mosaic_disease: {
    diseaseName: "Mosaic Disease (Sugarcane / Viral)",
    primary: {
      product: "Imidacloprid 17.8% SL",
      activeIngredient: "Imidacloprid 17.8% SL (vector control)",
      dosage: "0.3 mL/L water",
      method: "Foliar spray to control aphid vectors transmitting the virus",
      phi: 14,
    },
    alternates: [
      {
        product: "Thiamethoxam 25% WG",
        activeIngredient: "Thiamethoxam 25% WG",
        dosage: "0.2 g/L water",
        method: "Soil application or foliar spray for vector management",
        phi: 14,
      },
    ],
    notes: [
      "No direct chemical cure for viral infections.",
      "Control aphid / leafhopper vectors aggressively.",
      "Use virus-free seed cane from certified nurseries.",
      "Rogue out infected plants early to limit reservoir.",
    ],
  },
  anthracnose: {
    diseaseName: "Anthracnose",
    primary: {
      product: "Amistar 25% SC",
      activeIngredient: "Azoxystrobin 25% SC",
      dosage: "1 mL/L water",
      method: "Foliar spray at first lesion appearance; repeat at 10-day intervals",
      phi: 7,
    },
    alternates: [
      {
        product: "Bavistin 50% WP",
        activeIngredient: "Carbendazim 50% WP",
        dosage: "1 g/L water",
        method: "Foliar spray",
        phi: 7,
      },
      {
        product: "Copper Oxychloride 50% WP",
        activeIngredient: "Copper Oxychloride 50% WP",
        dosage: "3 g/L water",
        method: "Preventive spray during rainy season",
      },
    ],
    notes: [
      "Remove and destroy infected plant parts.",
      "Avoid working in wet fields to limit mechanical spread.",
      "Ensure good air circulation by proper spacing.",
    ],
  },
  downy_mildew: {
    diseaseName: "Downy Mildew",
    primary: {
      product: "Ridomil Gold MZ 68 WG",
      activeIngredient: "Metalaxyl-M 4% + Mancozeb 64% WG",
      dosage: "2.5 g/L water",
      method: "Foliar spray at first symptoms; repeat at 7-day intervals",
      phi: 14,
    },
    alternates: [
      {
        product: "Fosetyl-Al 80% WP",
        activeIngredient: "Fosetyl-Aluminium 80% WP",
        dosage: "2.5 g/L water",
        method: "Systemic foliar spray",
      },
    ],
    notes: [
      "Improve drainage; avoid waterlogging.",
      "Ensure proper plant spacing for air circulation.",
    ],
  },
};

/**
 * Get the disease-specific chemical intervention plan.
 * Returns null if no matching plan exists.
 */
export function getChemicalPlan(disease: string): DiseaseChemicalPlan | null {
  const key = normKey(disease);
  return PLANS[key] ?? null;
}

/**
 * Format the full plan into a single readable text string (for TTS).
 */
export function formatPlanForSpeech(plan: DiseaseChemicalPlan): string {
  const parts: string[] = [];
  parts.push(`Chemical interventions for ${plan.diseaseName}.`);
  parts.push(
    `Primary treatment: ${plan.primary.product}, active ingredient ${plan.primary.activeIngredient}. ` +
    `Dosage: ${plan.primary.dosage}. ${plan.primary.method}.`,
  );
  if (plan.alternates.length > 0) {
    parts.push("Alternate options:");
    plan.alternates.forEach((alt, i) => {
      parts.push(
        `Option ${i + 1}: ${alt.product}, ${alt.activeIngredient}. Dosage: ${alt.dosage}. ${alt.method}.`,
      );
    });
  }
  if (plan.notes.length > 0) {
    parts.push("Additional notes: " + plan.notes.join(" "));
  }
  return parts.join(" ");
}
