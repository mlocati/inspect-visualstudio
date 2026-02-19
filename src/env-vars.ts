import { CaseInsensitiveStringMap } from "./CaseInsensitiveMap";
import * as log from "./log";
import { processExistingPath, ProcessStyle } from "./path-processor";

function envNameNormalizer(value: string): string {
  return value.toUpperCase();
}

const SINGLE_PATH_ENV_VARS: ReadonlyArray<string> = [
  'DevEnvDir',
  'FrameworkDir',
  'FrameworkDir64',
  'FSHARPINSTALLDIR',
  'IFCPATH',
  'NETFXSDKDir',
  'UniversalCRTSdkDir',
  'VCIDEInstallDir',
  'VCINSTALLDIR',
  'VCPKG_ROOT',
  'VCToolsInstallDir',
  'VCToolsRedistDir',
  'VS170COMNTOOLS',
  'VSINSTALLDIR',
  'VSSDK150INSTALL',
  'VSSDKINSTALL',
  'WindowsSdkBinPath',
  'WindowsSdkDir',
  'WindowsSdkVerBinPath',
  'WindowsSDK_ExecutablePath_x64',
  'WindowsSDK_ExecutablePath_x86',
].map(s => envNameNormalizer(s));

function isSinglePathEnvVar(name: string): boolean {
  return SINGLE_PATH_ENV_VARS.includes(envNameNormalizer(name));
}

const MULTI_PATH_ENV_VARS: ReadonlyArray<string> = [
  'EXTERNAL_INCLUDE',
  'INCLUDE',
  'LIB',
  'LIBPATH',
  'Path',
  'WindowsLibPath',
  '__VSCMD_PREINIT_PATH',
].map(s => envNameNormalizer(s));

function isMultiPathEnvVar(name: string): boolean {
  return MULTI_PATH_ENV_VARS.includes(envNameNormalizer(name));
}

const pathsAreSame: (path1: string, path2: string) => boolean = (function() {
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
  const delta = new CaseInsensitiveStringMap();

  for (const [key, afterValue] of after) {
    const beforeValue = before.get(key);
    if (beforeValue === undefined) {
      log.debug(`- new: ${key}=${afterValue}`);
      delta.set(key, afterValue);
      continue;
    }
    if (afterValue === beforeValue) {
      log.debug(`- unchanged: ${key}=${afterValue}`);
      continue;
    }
    if (!isMultiPathEnvVar(key)) {
      log.debug(`- changed: ${key}=${afterValue} (was ${beforeValue})`);
      delta.set(key, afterValue);
      continue;
    }
    log.debug(`- computing delta for path-list: ${key}`);
    const beforeValues = beforeValue.split(';').map(s => s.trim()).filter(s => s.length > 0);
    const afterValues = afterValue.split(';').map(s => s.trim()).filter(s => s.length > 0);
    const newAfterValues = afterValues.filter(av => {
      if (beforeValues.some(bv => pathsAreSame(bv, av))) {
        log.debug(`  - path same as before, skipping: ${av}`);
        return false;
      }
      log.debug(`  - new path, including in delta: ${av}`);
      return true;
    });
    if (newAfterValues.length === 0) {
      log.debug('  - no new paths found, skipping environment variable');
    } else {
      delta.set(key, newAfterValues.join(';'));
    }
  }
  return delta;
}

export function processPaths(vars: CaseInsensitiveStringMap, processStyle: ProcessStyle): CaseInsensitiveStringMap {
  log.debug(`Processing environment variables with process style ${processStyle}`);
  const result = new CaseInsensitiveStringMap();
  for (const [key, value] of vars) {
    if (isSinglePathEnvVar(key)) {
      const path = processExistingPath(value, processStyle);
      log.debug(`- single path "${key}": ${value} -> ${value === path ? '(unchanged)' : path}`);
      if (path) {
        result.set(key, path);
      }
      continue
    }
    if (isMultiPathEnvVar(key)) {
      log.debug(`- multi path "${key}"`);
      const paths = value
        .split(';')
        .map(s => {
          const processed = processExistingPath(s, processStyle);
          log.debug(`  - ${s} -> ${s === processed ? '(unchanged)' : processed}`);
          return processed;
        })
        .filter(s => s !== '')
      ;
      if (paths.length === 0) {
        log.debug('  - no valid paths found, skipping environment variable');
        continue;
      }
      switch (processStyle) {
        case ProcessStyle.Windows:
          result.set(key, paths.join(';'));
          break;
        case ProcessStyle.Cygwin:
        case ProcessStyle.MSYS2:
          result.set(key, paths.join(':'));
          break;
        default:
          throw new Error(`Unsupported process style: ${processStyle}`);
      }
      continue;
    }
    log.debug(`- not path "${key}": ${value}`);
    result.set(key, value);
  }
  return result;
}
