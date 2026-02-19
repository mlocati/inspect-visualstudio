import { findVisualStudioInstallationPath } from "./visualstudio-finder";
import * as fs from "node:fs";
import * as log from "./log";
import * as path from "node:path";
import {
  type VisualStudioVersion,
  type LatestVersion,
} from "./visualstudio-versions";

export async function findVcvarsallByVisualStudioVersion(
  version: VisualStudioVersion | LatestVersion,
): Promise<string> {
  const vsPath = await findVisualStudioInstallationPath(version);
  return findVcvarsallByVisualStudioPath(vsPath);
}

export function findVcvarsallByVisualStudioPath(
  visualStudioPath: string,
): string {
  log.startDebugGroup("Finding vcvarsall.bat");
  try {
    const tryPath = path.join(
      visualStudioPath,
      "VC",
      "Auxiliary",
      "Build",
      "vcvarsall.bat",
    );
    if (fs.statSync(tryPath).isFile()) {
      const realPath = fs.realpathSync.native(tryPath);
      log.debug(`vcvarsall.bat found at: ${realPath}`);
      return realPath;
    }
    throw new Error(
      `vcvarsall.bat not found in Visual Studio installation at: ${visualStudioPath}`,
    );
  } finally {
    log.endDebugGroup();
  }
}
