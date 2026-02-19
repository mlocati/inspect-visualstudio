import { computeEnvDelta, parseSetOutput, processPaths } from "./env-vars";
import * as os from "node:os";
import * as log from "./log";
import * as path from "node:path";
import * as runner from "./runner";
import { v4 as uuidV4 } from "uuid";
import { type CaseInsensitiveStringMap } from "./CaseInsensitiveMap";
import { ProcessStyle } from "./path-processor";
interface Options {
  architecture?: Architecture | string;
  platformType?: "" | "store" | "uwp" | string;
  windowsSDKVersion?:
  | ""
  | `${number}.${number}`
  | `${number}.${number}.${number}.${number}`
  | string;
  spectreMode?: boolean;
  processPaths?: "" | "windows" | "cygwin" | "msys2" | string;
}

enum Architecture {
  /**
   * Host: x86 or x64
   * Target: x86
   */
  x86 = "x86",
  /**
   * Host: x64
   * Target: x64
   */
  amd64 = "amd64",
  /**
   * Host: x86 or x64
   * Target: x64
   */
  x86_amd64 = "x86_amd64",
  /**
   * Host: x86 or x64
   * Target: ARM
   */
  x86_arm = "x86_arm",
  /**
   * Host: x86 or x64
   * Target: ARM64
   */
  x86_arm64 = "x86_arm64",
  /**
   * Host: x64
   * Target: x86
   */
  amd64_x86 = "amd64_x86",
  /**
   * Host: x64
   * Target: ARM
   */
  amd64_arm = "amd64_arm",
  /**
   * Host: x64
   * Target: ARM64
   */
  amd64_arm64 = "amd64_arm64",
}

function parseArchitecture(arch: string): Architecture {
  arch = arch.trim();
  if (arch === "") {
    arch = os.machine();
  }
  switch (arch.toLowerCase().replace(/-/g, "_") || "") {
    case "32":
    case "i386":
    case "i686":
    case "ia32":
    case "win32":
    case "x86":
      return Architecture.x86;
    case "64":
    case "amd64":
    case "win64":
    case "x64":
    case "x86_64":
      return Architecture.amd64;
    case "x86_amd64":
      return Architecture.x86_amd64;
    case "x86_arm":
      return Architecture.x86_arm;
    case "x86_arm64":
      return Architecture.x86_arm64;
    case "amd64_x86":
      return Architecture.amd64_x86;
    case "amd64_arm":
      return Architecture.amd64_arm;
    case "amd64_arm64":
      return Architecture.amd64_arm64;
    default:
      throw new Error(`Unsupported architecture: ${arch}`);
  }
}

function parsePlatformType(
  platformType: string,
): "" | "store" | "uwp" {
  switch (platformType.trim().toLowerCase()) {
    case "":
      return "";
    case "store":
      return "uwp";
    case "uwp":
      return "uwp";
  }
  throw new Error(`Unsupported platform type: ${platformType}`);
}

function parseWindowsSDKVersion(
  version: string,
): "" | `${number}.${number}` | `${number}.${number}.${number}.${number}` {
  version = version.trim();
  if (version === '') {
    return "";
  }
  if (/^\d+\.\d+$/.test(version)) {
    return version as `${number}.${number}`;
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(version)) {
    return version as `${number}.${number}.${number}.${number}`;
  }
  throw new Error(`Invalid Windows SDK version: ${version}`);
}

/**
 * @see https://learn.microsoft.com/en-us/cpp/build/building-on-the-command-line?view=msvc-170#vcvarsall-syntax
 */
function getArgumentsFromOptions(options?: Options): string[] {
  const args: string[] = [];
  args.push(parseArchitecture(options?.architecture || ""));
  const platformType = parsePlatformType(options?.platformType || "");
  if (platformType !== "") {
    args.push(platformType);
  }
  const sdkVersion = parseWindowsSDKVersion(options?.windowsSDKVersion || "");
  if (sdkVersion !== "") {
    args.push(sdkVersion);
  }
  if (options?.spectreMode) {
    args.push("-vcvars_spectre_libs=spectre");
  }
  return args;
}

function parseProcessPathsOption(option: string): ProcessStyle | null {
  switch (option.trim().toLowerCase()) {
    case "":
      return null;
    case "windows":
      return ProcessStyle.Windows;
    case "cygwin":
      return ProcessStyle.Cygwin;
    case "msys2":
      return ProcessStyle.MSYS2;
    default:
      throw new Error(`Unsupported process paths option: ${option}`);
  }
}

export async function inspectVCVarsAllEnvironmentVariables(
  vcVarsAllPath: string,
  options?: Options,
): Promise<CaseInsensitiveStringMap> {
  const processStyle = parseProcessPathsOption(options?.processPaths || "");
  const sep = "[----------SEPARATOR-" + uuidV4() + "----------]";
  log.startDebugGroup("Running vcvarsall.bat");
  let result: runner.Result;
  try {
    const args = getArgumentsFromOptions(options);
    log.debug(`vcvarsall.bat arguments: ${JSON.stringify(args)}`);
    result = await runner.run(
      'cmd.exe',
      ['/c', `set && echo ${sep} && "${vcVarsAllPath}" ${args.join(" ")} && echo ${sep} && set`],
      {
        env: {
          ComSpec:
            process.env.ComSpec ||
            path.join(
              process.env.SystemRoot || process.env.windir || "C:\\Windows",
              "System32",
              "cmd.exe",
            ),
          Path: [
            path.join(
              process.env.SystemRoot || process.env.windir || "C:\\Windows",
              "System32",
            ),
            process.env.SystemRoot || process.env.windir || "C:\\Windows",
          ].join(";"),
          SystemRoot: process.env.SystemRoot || process.env.windir || "C:\\Windows",
          windir: process.env.SystemRoot || process.env.windir || "C:\\Windows",
        },
      },
    );
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to get environment variables: ${result.stderr || result.stdout || `Exited with code ${result.exitCode}`}`,
      );
    }
  } finally {
    log.endDebugGroup();
  }
  const [rawEnvBefore, _, rawEnvAfter] = result.stdout
    .split(sep)
    .map((s) => s.trim());
  if (!rawEnvBefore || !rawEnvAfter) {
    throw new Error(`Failed to parse environment variables: ${result.stdout}`);
  }
  log.startDebugGroup("Environment variables before vcvarsall.bat");
  log.debug(rawEnvBefore);
  log.endDebugGroup();
  const envBefore = parseSetOutput(rawEnvBefore);
  log.startDebugGroup("Environment variables after vcvarsall.bat");
  log.debug(rawEnvAfter);
  log.endDebugGroup();
  const envAfter = parseSetOutput(rawEnvAfter);
  let delta: CaseInsensitiveStringMap = computeEnvDelta(envBefore, envAfter);
  if (processStyle !== null) {
    delta = processPaths(delta, processStyle);
  }
  return delta;
}
