export type Version = `${number}.${number}.${number}.${number}`;

export type LatestVersion = "latest";

function compareVersionNumbers(a: Version, b: Version): -1 | 0 | 1 {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);

  for (let i = 0; i < 4; i++) {
    if (partsA[i] < partsB[i]) return -1;
    if (partsA[i] > partsB[i]) return 1;
  }
  return 0;
}

export interface VisualStudioVersion {
  readonly year: string;
  readonly minVersion: Version;
  readonly maxVersion: Version;
}

export const versions: ReadonlyArray<VisualStudioVersion> = [
  { year: "2005", minVersion: "8.0.0.0", maxVersion: "8.999.999.999" },
  { year: "2008", minVersion: "9.0.0.0", maxVersion: "9.999.999.999" },
  { year: "2010", minVersion: "10.0.0.0", maxVersion: "10.999.999.999" },
  { year: "2012", minVersion: "11.0.0.0", maxVersion: "11.999.999.999" },
  { year: "2013", minVersion: "12.0.0.0", maxVersion: "12.999.999.999" },
  { year: "2015", minVersion: "14.0.0.0", maxVersion: "14.999.999.999" },
  { year: "2017", minVersion: "15.0.0.0", maxVersion: "15.999.999.999" },
  { year: "2019", minVersion: "16.0.0.0", maxVersion: "16.999.999.999" },
  { year: "2022", minVersion: "17.0.0.0", maxVersion: "17.999.999.999" },
  { year: "2026", minVersion: "18.0.0.0", maxVersion: "18.999.999.999" },
];

/**
 * Parse a Visual Studio version from a string or number. Accepts either a year (e.g. "2022"), a version number (e.g. "17", "17.0"), or "latest"/undefined/null for the latest version.
 * @throws Error if the version is invalid or not recognized
 */
export function resolveVisualStudioVersion(
  version: string | number | undefined | null,
): VisualStudioVersion | LatestVersion {
  if (typeof version === "string") {
    version = version.trim();
  }
  if (
    version === undefined ||
    version === null ||
    version === "" ||
    (typeof version === "string" && version.toLowerCase() === "latest")
  ) {
    return "latest";
  }
  const versionStr = String(version);
  const byYear = versions.find((v) => v.year === versionStr);
  if (byYear) {
    return byYear;
  }
  if (/^\d+(\.\d+){0,3}$/.test(versionStr)) {
    const parts = versionStr.split(".").map(Number);
    while (parts.length < 4) {
      parts.push(0);
    }
    const normalizedVersion = parts.join(".") as Version;
    console.debug(`normalizedVersion=${normalizedVersion}`);
    const byVersion = versions.find(
      (v) =>
        compareVersionNumbers(normalizedVersion, v.minVersion) >= 0 &&
        compareVersionNumbers(normalizedVersion, v.maxVersion) <= 0,
    );
    if (byVersion) {
      return byVersion;
    }
  }
  throw new Error(`Invalid Visual Studio version: ${version}`);
}
