import * as fs from "node:fs";
import * as path from "node:path";
import { findProgram } from "./program-finder";
import * as log from "./log";

let vsWherePath: string | Error | undefined;

export async function findVsWhere(): Promise<string> {
  if (vsWherePath !== undefined) {
    if (vsWherePath instanceof Error) {
      throw vsWherePath;
    }
    return vsWherePath;
  }
  try {
    vsWherePath = await findProgram("vswhere.exe");
    return vsWherePath;
  } catch (err) {
    log.debug(
      `Failed to find vswhere.exe with where.exe (${err instanceof Error ? err.message : err}), let's try with some known paths`,
    );
  }
  const programsPath = path.join(
    process.env["ProgramFiles(x86)"] ||
      "C:\\Program Files (x86)" ||
      "C:\\Program Files",
  );
  const p = path.join(
    programsPath,
    "Microsoft Visual Studio",
    "Installer",
    "vswhere.exe",
  );
  try {
    vsWherePath = fs.realpathSync.native(p);
    log.debug(`vswhere.exe at expected location ${vsWherePath}`);
    return vsWherePath;
  } catch {
    vsWherePath = new Error(
      "vswhere.exe not found at expected locations: " + p,
    );
    log.error(vsWherePath);
    throw vsWherePath;
  }
}
