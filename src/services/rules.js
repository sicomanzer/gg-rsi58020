import fs from "fs/promises";
import path from "path";

export class RulesService {
  /**
   * @param {{ rulesDir: string }} deps
   */
  constructor(deps) {
    this.rulesDir = deps.rulesDir;
  }

  /**
   * @returns {Promise<{ id: string, name: string, description?: string, timeframe?: string }[]>}
   */
  async listRules() {
    const entries = await fs.readdir(this.rulesDir, { withFileTypes: true });
    const rules = [];
    for (const e of entries) {
      if (!e.isFile()) continue;
      if (!e.name.endsWith(".json")) continue;
      const id = e.name.replace(/\.json$/i, "");
      try {
        const rule = await this.loadRule(id);
        rules.push({ id, name: rule.name ?? id, description: rule.description, timeframe: rule.timeframe });
      } catch {
        rules.push({ id, name: id, description: "โหลด rule ไม่สำเร็จ (ไฟล์อาจผิดรูปแบบ)" });
      }
    }
    rules.sort((a, b) => a.id.localeCompare(b.id));
    return rules;
  }

  /**
   * @param {string} id
   */
  async loadRule(id) {
    const file = path.join(this.rulesDir, `${id}.json`);
    const raw = await fs.readFile(file, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") throw new Error("rule ต้องเป็น object");
    return parsed;
  }
}

