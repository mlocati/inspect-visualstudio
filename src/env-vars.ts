import { CaseInsensitiveStringMap } from "./CaseInsensitiveMap";
import * as log from "./log";
import { processExistingPath, ProcessStyle } from "./path-processor";

function envNameNormalizer(value: string): string {
  return value.toUpperCase();
}

class PathChecker {
  private readonly cases: ReadonlyArray<string | RegExp>;
  public constructor(cases: ReadonlyArray<string | RegExp>) {
    this.cases = cases.map((item) =>
      item instanceof RegExp ? item : envNameNormalizer(item),
    );
  }
  public test(name: string): boolean {
    return (
      this.cases.includes(envNameNormalizer(name)) ||
      this.cases.some((s) => s instanceof RegExp && s.test(name))
    );
  }
}

const singlePathChecker = new PathChecker([
  "DevEnvDir",
  /^FrameworkDir(32|64)?$/i,
  "FSHARPINSTALLDIR",
  "IFCPATH",
  /^llvm(Arm64|X64|X86)$/i,
  "NETFXSDKDir",
  "UniversalCRTSdkDir",
  "VCIDEInstallDir",
  "VCINSTALLDIR",
  "VCPKG_ROOT",
  "VCToolsInstallDir",
  "VCToolsRedistDir",
  /^VS\d*COMNTOOLS$/i,
  "VSINSTALLDIR",
  /^VSSDK\d*INSTALL$/i,
  "VSSDKINSTALL",
  "WindowsSdkBinPath",
  "WindowsSdkDir",
  "WindowsSdkVerBinPath",
  /^WindowsSDK_ExecutablePath(_x86|_x64)?$/i,
]);

const multiPathChecker = new PathChecker([
  "EXTERNAL_INCLUDE",
  "INCLUDE",
  "LIB",
  "LIBPATH",
  "Path",
  "WindowsLibPath",
  "__VSCMD_PREINIT_PATH",
]);

const pathsAreSame: (path1: string, path2: string) => boolean = (function () {
  function getComparablePath(path: string): string {
    path = path.trim().toLocaleLowerCase();
    if (!/^[a-zA-Z]:[/\\]/.test(path)) {
      return path;
    }
    path = path
      .replace(/\//g, '\\')
      .replace(/\\+/g, '\\')
      .replace(/\\$/, '')
      ;
    if (path[2] === undefined) {
      path += '\\';
    }
    return path;
  }
  return function (path1: string, path2: string): boolean {
    return getComparablePath(path1) === getComparablePath(path2);
  };
})();

export function parseSetOutput(setOutput: string): CaseInsensitiveStringMap {
  const result = new CaseInsensitiveStringMap();
  setOutput.split('\n').forEach(line => {
    const match = line.replace(/\r+$/, '').match(/^([^=]+)=(.*)$/);
    if (match) {
      result.set(match[1].trim(), match[2]);
    }
  });
  return result;
}

export function computeEnvDelta(before: CaseInsensitiveStringMap, after: CaseInsensitiveStringMap): CaseInsensitiveStringMap {
  log.startDebugGroup(`Computing environment variable delta`);
  try {
    const delta = new CaseInsensitiveStringMap();
    for (const [key, afterValue] of after) {
      const beforeValue = before.get(key);
      if (beforeValue === undefined) {
        log.debug(`new: ${key}=${afterValue}`);
        delta.set(key, afterValue);
        continue;
      }
      if (afterValue === beforeValue) {
        log.debug(`unchanged: ${key}=${afterValue}`);
        continue;
      }
      if (!multiPathChecker.test(key)) {
        log.debug(`changed: ${key}=${afterValue} (was ${beforeValue})`);
        delta.set(key, afterValue);
        continue;
      }
      log.debug(`computing delta for path-list: ${key}`);
      const beforeValues = beforeValue.split(';').map(s => s.trim()).filter(s => s.length > 0);
      const afterValues = afterValue.split(';').map(s => s.trim()).filter(s => s.length > 0);
      const newAfterValues = afterValues.filter(av => {
        if (beforeValues.some(bv => pathsAreSame(bv, av))) {
          log.debug(`- path same as before, skipping: ${av}`);
          return false;
        }
        log.debug(`- new path, including in delta: ${av}`);
        return true;
      });
      if (newAfterValues.length === 0) {
        log.debug('- no new paths found, skipping environment variable');
      } else {
        delta.set(key, newAfterValues.join(';'));
      }
    }
    return delta;
  } finally {
    log.endDebugGroup();
  }
}

function getProcessStyleForVar(varName: string, defaultProcessStyle?: ProcessStyle | null, byVarProcessStyle?: Map<ProcessStyle, string[]> | null): [ProcessStyle | null, boolean] {
  if (byVarProcessStyle) {
    for (const [style, varNames] of byVarProcessStyle.entries()) {
      if (varNames.some(vn => envNameNormalizer(vn) === envNameNormalizer(varName))) {
        return [style, true];
      }
    }
  }
  return [defaultProcessStyle ?? null, false];
}


export function processPaths(vars: CaseInsensitiveStringMap, defaultProcessStyle?: ProcessStyle | null, byVarProcessStyle?: Map<ProcessStyle, string[]> | null): CaseInsensitiveStringMap {
  log.startDebugGroup(`Processing environment variables`);
  try {
    const result = new CaseInsensitiveStringMap();
    for (const [key, value] of vars) {
      const [processStyleForVar, styleForSpecificVar] = getProcessStyleForVar(key, defaultProcessStyle, byVarProcessStyle);
      if (processStyleForVar === null) {
        log.debug(`no process style for "${key}"`);
        result.set(key, value);
        continue;
      }
      if (singlePathChecker.test(key)) {
        const path = processExistingPath(value, processStyleForVar);
        log.debug(`single path "${key}" as ${processStyleForVar}: ${value} -> ${value === path ? '(unchanged)' : path}`);
        if (path) {
          result.set(key, path);
        }
        continue;
      }
      if (multiPathChecker.test(key)) {
        log.debug(`multi path "${key}" as ${processStyleForVar}:`);
        const paths = value
          .split(';')
          .map(s => {
            const processed = processExistingPath(s, processStyleForVar);
            log.debug(`- ${s} -> ${s === processed ? '(unchanged)' : processed}`);
            return processed;
          })
          .filter(s => s !== '')
          ;
        if (paths.length === 0) {
          log.debug('- no valid paths found, skipping environment variable');
          continue;
        }
        switch (processStyleForVar) {
          case ProcessStyle.Windows:
            result.set(key, paths.join(';'));
            break;
          case ProcessStyle.Cygwin:
          case ProcessStyle.MSYS2:
            result.set(key, paths.join(':'));
            break;
          default:
            throw new Error(`Unsupported process style: ${processStyleForVar}`);
        }
        continue;
      }
      if (styleForSpecificVar) {
        throw new Error(`Can't apply ${JSON.stringify(processStyleForVar)} process style to environment variable "${key}" because it is not recognized as single-path or multi-path variable`);
      }
      log.debug(`"${key}" doesn't contain paths, so we won't apply the default ${processStyleForVar} process style`);
      result.set(key, value);
    }
    return result;
  } finally {
    log.endDebugGroup();
  }
}
