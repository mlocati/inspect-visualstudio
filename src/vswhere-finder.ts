import * as fs from "node:fs";
import * as path from "node:path";
import { findProgram } from "./program-finder";
import * as log from "./log";

export async function findVsWhere(): Promise<string> {
  let vsWherePath: string | undefined;
  log.startDebugGroup("Finding vswhere.exe");
  try {
    vsWherePath = await findProgram("vswhere.exe");
  } catch (err) {
    log.debug(
      `Failed to find vswhere.exe with where.exe (${err instanceof Error ? err.message : err}), let's try with some known paths`,
    );
  }
  if (vsWherePath) {
    log.debug(`Found vswhere.exe at ${vsWherePath}`);
    log.endDebugGroup();
    return vsWherePath;
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
  } catch {
    log.debug(`vswhere.exe not found at expected location ${p}`);
  }
  if (vsWherePath) {
    log.debug(`Found vswhere.exe at ${vsWherePath}`);
    log.endDebugGroup();
    return vsWherePath;
  }
  log.endDebugGroup();
  throw new Error("Unable to find vswhere.exe");
}
