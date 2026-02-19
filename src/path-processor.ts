import * as fs from "node:fs";
import * as path from "node:path";

export enum ProcessStyle {
  Windows = "windows",
  Cygwin = "cygwin",
  MSYS2 = "msys2",
}

enum DriveLetterStyle {
  UpperCase,
  LowerCase,
}

/**
 * Takes a path and normalizes it.
 * @returns an empty string if the path does not exist, otherwise the normalized and absolute path.
 */
export function normalizeExistingWindowsPath(inputPath: string): string {
  if (!inputPath) {
    return "";
  }
  try {
    const absolute = path.resolve(inputPath);
    return fs.realpathSync.native(absolute);
  } catch {
    return "";
  }
}

function normalizeExistingPathForPosix(
  prefix: string,
  inputPath: string,
  driveLetterCase: DriveLetterStyle,
): string {
  const normalized = normalizeExistingWindowsPath(inputPath);
  if (!normalized) {
    return "";
  }
  const driveLetterMatch = normalized.match(/^([a-zA-Z]):\\/);
  if (!driveLetterMatch) {
    return "";
  }
  let driveLetter = driveLetterMatch[1];
  if (driveLetterCase === DriveLetterStyle.LowerCase) {
    driveLetter = driveLetter.toLowerCase();
  } else if (driveLetterCase === DriveLetterStyle.UpperCase) {
    driveLetter = driveLetter.toUpperCase();
  }
  const restOfPath = normalized
    .substring(3)
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/");
  return `${prefix}${driveLetter}/${restOfPath}`;
}

export function normalizeExistingPathForCygwin(inputPath: string): string {
  return normalizeExistingPathForPosix(
    "/cygdrive/",
    inputPath,
    DriveLetterStyle.LowerCase,
  );
}

export function normalizeExistingPathForMSYS2(inputPath: string): string {
  return normalizeExistingPathForPosix(
    "/",
    inputPath,
    DriveLetterStyle.LowerCase,
  );
}

export function processExistingPath(
  inputPath: string,
  style: ProcessStyle,
): string {
  switch (style) {
    case ProcessStyle.Windows:
      return normalizeExistingWindowsPath(inputPath);
    case ProcessStyle.Cygwin:
      return normalizeExistingPathForCygwin(inputPath);
    case ProcessStyle.MSYS2:
      return normalizeExistingPathForMSYS2(inputPath);
    default:
      return "";
  }
}
