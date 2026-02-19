import { findVsWhere } from "./vswhere-finder";
import * as fs from "node:fs";
import * as log from "./log";
import * as path from "node:path";
import * as runner from "./runner";
import {
  type VisualStudioVersion,
  type LatestVersion,
  versions as visualStudioVersions,
} from "./visualstudio-versions";

/**
 * Generates the version filter for vswhere.exe based on the provided Visual Studio version.
 * @returns {string[]} The arguments to be passed to vswhere.exe for filtering by version.
 */
function getVSWhereVersionArguments(
  version: VisualStudioVersion | LatestVersion,
) {
  if (version === "latest") {
    return ["-latest"];
  }
  return ["-version", `${version.minVersion},${version.maxVersion}`];
}

async function findVisualStudioInstallationPathWithVSWhere(
  version: VisualStudioVersion | LatestVersion,
  vsWherePath: string,
): Promise<string> {
  const args: string[] = [
    "-products",
    "*",
    ...getVSWhereVersionArguments(version),
    "-requires",
    "Microsoft.VisualStudio.Component.VC.Tools.x86.x64",
    "-property",
    "installationPath",
  ];
  const result = await runner.run(`"${vsWherePath}"`, args, {
    throwIfNonZeroExitCode: true,
  });
  const paths = result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
  for (const p of paths) {
    try {
      if (fs.statSync(p).isDirectory()) {
        const realPath = fs.realpathSync.native(p);
        log.debug(
          `Visual Studio installation found by vswhere.exe at: ${realPath}`,
        );
        return realPath;
      }
    } catch (err) {
      log.debug(`Error checking path ${p}: ${err}`);
    }
  }
  if (version !== "latest") {
    throw new Error(
      `Unable to find Visual Studio ${version.year} installation`,
    );
  }
  throw new Error(`No valid Visual Studio installation found`);
}

function findVisualStudioInstallationPathDefaults(
  version: VisualStudioVersion | LatestVersion,
): string {
  const programFilesPaths = [
    process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
    process.env["ProgramFiles"] || "C:\\Program Files",
  ];
  const editions = ["Enterprise", "Professional", "Community", "BuildTools"];
  const versions =
    version === "latest" ? [...visualStudioVersions].reverse() : [version];
  for (const visualStudioVersion of versions) {
    for (const programFilesPath of programFilesPaths) {
      for (const edition of editions) {
        const defaultPath = path.join(
          programFilesPath,
          "Microsoft Visual Studio",
          visualStudioVersion.year,
          edition,
        );
        if (fs.statSync(defaultPath).isDirectory()) {
          const realPath = fs.realpathSync.native(defaultPath);
          log.debug(
            `Visual Studio installation found at default path: ${realPath}`,
          );
          return realPath;
        }
      }
    }
  }
  if (version === "latest") {
    throw new Error(`No valid Visual Studio installation found`);
  }
  throw new Error(`Unable to find Visual Studio ${version.year} installation`);
}

export async function findVisualStudioInstallationPath(
  version: VisualStudioVersion | LatestVersion,
): Promise<string> {
  let vsWherePath: string | undefined;
  try {
    vsWherePath = await findVsWhere();
  } catch {
  }
  log.startDebugGroup("Finding Visual Studio")
  try {
    if (vsWherePath) {
      try {
        return await findVisualStudioInstallationPathWithVSWhere(version, vsWherePath);
      } catch (err) {
        log.debug(
          `Failed to find Visual Studio installation with vswhere.exe: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    try {
      return findVisualStudioInstallationPathDefaults(version);
    } catch (err) {
      log.debug(
        `Failed to find Visual Studio installation with default paths: ${err instanceof Error ? err.message : err}`,
      );
    }
    throw new Error(
      `Unable to find Visual Studio installation for version ${version === "latest" ? version : version.year}`,
    );
  } finally {
    log.endDebugGroup();
  }
}
