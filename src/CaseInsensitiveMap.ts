/**
 * A Map implementation that treats keys as case-insensitive strings.
 * This is useful for example for environment variables on Windows, which are case-insensitive.
 * Intentionally NOT locale-aware: matches Windows behavior.
 * The first inserted key casing is preserved (Windows-like behavior):
 *   map.set("FOO", 'bar');
 *   map.set("Foo", 'bar');
 *   map.keys(); // ["FOO"]
 * @author Michele Locati <michele@locati.it>
 * @license MIT
 * @see https://gist.github.com/mlocati/4f17341b03998831d11d00226c7d2275
 */
export default class CaseInsensitiveMap<V> implements Map<string, V> {
  private data = new Map<string, { key: string; value: V }>();

  public constructor(entries?: Iterable<readonly [string, V]> | null) {
    if (entries) {
      for (const [key, value] of entries) {
        this.set(key, value);
      }
    }
  }

  readonly [Symbol.toStringTag] = "CaseInsensitiveMap";

  public [Symbol.iterator](): IterableIterator<[string, V]> {
    return this.entries();
  }

  public clear(): void {
    this.data.clear();
  }

  public delete(key: string): boolean {
    return this.data.delete(this.normalizeKey(key));
  }

  public *entries(): IterableIterator<[string, V]> {
    for (const { key, value } of this.data.values()) {
      yield [key, value];
    }
  }

  public forEach(
    callbackfn: (value: V, key: string, map: Map<string, V>) => void,
    thisArg?: any,
  ): void {
    for (const { key, value } of this.data.values()) {
      callbackfn.call(thisArg, value, key, this);
    }
  }

  public get(key: string): V | undefined {
    return this.data.get(this.normalizeKey(key))?.value;
  }

  public getOrInsert(key: string, defaultValue: V): V {
    const normalizedKey = this.normalizeKey(key);
    const entry = this.data.get(normalizedKey);
    if (entry !== undefined) {
      return entry.value;
    }
    this.data.set(normalizedKey, { key, value: defaultValue });
    return defaultValue;
  }

  public getOrInsertComputed(key: string, defaultValueFactory: () => V): V {
    const normalizedKey = this.normalizeKey(key);
    const entry = this.data.get(normalizedKey);
    if (entry !== undefined) {
      return entry.value;
    }
    const value = defaultValueFactory();
    this.data.set(normalizedKey, { key, value });
    return value;
  }

  public has(key: string): boolean {
    return this.data.has(this.normalizeKey(key));
  }

  public *keys(): IterableIterator<string> {
    for (const { key } of this.data.values()) {
      yield key;
    }
  }

  public set(key: string, value: V): this {
    const normalizedKey = this.normalizeKey(key);
    const actualKey = this.data.get(normalizedKey)?.key ?? key;
    this.data.set(normalizedKey, { key: actualKey, value });
    return this;
  }

  public get size(): number {
    return this.data.size;
  }

  public *values(): IterableIterator<V> {
    for (const { value } of this.data.values()) {
      yield value;
    }
  }

  /**
   * Windows semantics - invariant culture, case-insensitive.
   */
  private normalizeKey(key: string): string {
    return key.toUpperCase();
  }
}

export class CaseInsensitiveStringMap extends CaseInsensitiveMap<string> {}
