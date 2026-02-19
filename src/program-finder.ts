import * as fs from "node:fs";
import * as log from "./log";
import * as path from "node:path";
import * as runner from "./runner";

let whereExePath: string | Error | undefined;

/**
 * Get the absolute path to where.exe
 * @throws Error if where.exe cannot be found
 */
function getWhereExePath(): string {
  if (whereExePath !== undefined) {
    if (whereExePath instanceof Error) {
      throw whereExePath;
    }
    return whereExePath;
  }
  const system32Path = path.join(
    process.env.SystemRoot || process.env.windir || "C:\\Windows",
    "System32",
  );
  const p = path.join(system32Path, "where.exe");
  try {
    whereExePath = fs.realpathSync.native(p);
    log.debug(`where.exe found at ${whereExePath}`);
    return whereExePath;
  } catch {}
  throw new Error(`where.exe not found at expected location: ${p}`);
}

/**
 * Find the absolute path to a program in the system PATH environment variable using where.exe
 * @param program The name of the program to find (eg vswhere, vswhere.exe, script.bat, ...)
 * @throws Error if the program cannot be found
 * @returns The absolute path to the program
 */
export async function findProgram(program: string): Promise<string> {
  const whereExe = getWhereExePath();
  let whereOutput: string;
  const tmpDir = fs.mkdtempSync("ivs-");
  let result: runner.Result;
  try {
    result = await runner.run(`"${whereExe}"`, [`"${program}"`], { cwd: tmpDir });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  if (result.exitCode !== 0) {
    throw new Error(
      `where.exe failed to find ${program}\nExit code: ${result.exitCode}\nOutput: ${result.stdout}\nError: ${result.stderr}`,
    );
  }
  let found = result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.toLowerCase().includes(program.toLowerCase()) &&
        line.toLowerCase(),
    )[0];
  if (!found) {
    throw new Error(`where.exe did not return a valid path for ${program}`);
  }
  found = fs.realpathSync.native(found);
  log.debug(`${program} found by where.exe at ${found}`);
  return found;
}
