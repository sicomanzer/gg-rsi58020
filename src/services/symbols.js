import fs from "fs/promises";

/**
 * @typedef {{ mtimeMs: number, symbols: string[] }} SymbolsCache
 */

export class SymbolsService {
  /** @type {SymbolsCache | null} */
  #cache = null;

  /**
   * @param {{ set100File: string }} deps
   */
  constructor(deps) {
    this.set100File = deps.set100File;
  }

  /**
   * @returns {Promise<{ symbols: string[], mtimeMs: number }>}
   */
  async loadSet100() {
    const st = await fs.stat(this.set100File);
    if (this.#cache && this.#cache.mtimeMs === st.mtimeMs) {
      return { symbols: this.#cache.symbols, mtimeMs: this.#cache.mtimeMs };
    }

    const raw = await fs.readFile(this.set100File, "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('data/set100.json ต้องเป็น array ของ symbol เช่น ["ADVANC","AOT",...]');
    }

    const symbols = parsed
      .map((s) => String(s).trim().toUpperCase())
      .filter(Boolean);

    this.#cache = { mtimeMs: st.mtimeMs, symbols };
    return { symbols, mtimeMs: st.mtimeMs };
  }
}

