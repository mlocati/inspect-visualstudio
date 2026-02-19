import { CaseInsensitiveStringMap } from "./CaseInsensitiveMap";
import * as log from "./log";

function pathListKeyNormalizer(value: string): string {
  return value.toUpperCase();
}

function isPathListKey(key: string): boolean {
  return PATH_LISTS.includes(pathListKeyNormalizer(key));
}

const PATH_LISTS: ReadonlyArray<string> = [
  '__VSCMD_PREINIT_PATH',
  'EXTERNAL_INCLUDE',
  'INCLUDE',
  'LIB',
  'LIBPATH',
  'Path',
  'WindowsLibPath',
].map(s => pathListKeyNormalizer(s));

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
    if (!isPathListKey(key)) {
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
