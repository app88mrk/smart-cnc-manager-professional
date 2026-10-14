export type CuttingOperation = "milling" | "drilling" | "turning";

export type MaterialIsoGroup = "P" | "M" | "K" | "N" | "S" | "H";

const powerCoefficients: Record<MaterialIsoGroup, number> = {
  P: 0.055,
  M: 0.075,
  K: 0.04,
  N: 0.02,
  S: 0.09,
  H: 0.08,
};

export function calculateRpm(cuttingSpeed: number, diameter: number) {
  if (cuttingSpeed <= 0 || diameter <= 0) {
    return 0;
  }

  return Math.round((1000 * cuttingSpeed) / (Math.PI * diameter));
}

export function calculateFeed(
  operation: CuttingOperation,
  rpm: number,
  feedValue: number,
  teeth = 1
) {
  if (rpm <= 0 || feedValue <= 0) {
    return 0;
  }

  const multiplier = operation === "milling" ? Math.max(teeth, 1) : 1;
  return Math.round(rpm * feedValue * multiplier);
}

export function calculateMachiningTime(
  length: number,
  feed: number,
  passes = 1
) {
  if (length <= 0 || feed <= 0) {
    return 0;
  }

  return (length * Math.max(passes, 1)) / feed;
}

export function calculateMrr(
  operation: CuttingOperation,
  diameter: number,
  axialDepth: number,
  radialWidth: number,
  feed: number
) {
  if (feed <= 0) {
    return 0;
  }

  if (operation === "milling") {
    return Math.max(axialDepth, 0) * Math.max(radialWidth, 0) * feed / 1000;
  }

  if (operation === "drilling") {
    return Math.PI * Math.pow(Math.max(diameter, 0), 2) * feed / 4000;
  }

  return Math.PI * Math.max(diameter, 0) * Math.max(axialDepth, 0) * feed / 1000;
}

export function estimatePowerKw(
  materialGroup: MaterialIsoGroup,
  mrr: number
) {
  return Math.max(mrr, 0) * powerCoefficients[materialGroup];
}

export function calculateMaximumChipThickness(
  diameter: number,
  radialWidth: number,
  feedPerTooth: number,
  approachAngle: number
) {
  if (diameter <= 0 || feedPerTooth <= 0) {
    return 0;
  }

  const ratio = clamp(radialWidth / diameter, 0, 1);
  const radialFactor =
    ratio >= 0.5 ? 1 : 2 * Math.sqrt(ratio * (1 - ratio));
  const angleFactor = Math.sin(
    degreesToRadians(clamp(approachAngle, 0, 90))
  );

  return feedPerTooth * radialFactor * angleFactor;
}

export function calculateFeedForTargetChipThickness(
  diameter: number,
  radialWidth: number,
  targetThickness: number,
  approachAngle: number
) {
  if (diameter <= 0 || targetThickness <= 0) {
    return 0;
  }

  const ratio = clamp(radialWidth / diameter, 0, 1);
  const radialFactor =
    ratio >= 0.5 ? 1 : 2 * Math.sqrt(ratio * (1 - ratio));
  const angleFactor = Math.sin(
    degreesToRadians(clamp(approachAngle, 0, 90))
  );
  const totalFactor = radialFactor * angleFactor;

  return totalFactor > 0 ? targetThickness / totalFactor : 0;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function degreesToRadians(value: number) {
  return value * Math.PI / 180;
}
