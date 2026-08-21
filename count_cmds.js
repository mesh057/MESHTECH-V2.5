const fs = require("fs");
const path = require("path");
const dir = "/home/ubuntu/MESHTECH-V2.5/commands";
let total = 0;
let categories = {};

fs.readdirSync(dir).forEach(file => {
  if (!file.endsWith(".js")) return;
  try {
    const content = fs.readFileSync(path.join(dir, file), "utf8");
    const match = content.match(/commands:\s*\[([^\]]+)\]/);
    if (match) {
      const cmds = match[1].split(",").map(c => c.trim().replace(/["\']/g, "")).filter(Boolean);
      const catMatch = content.match(/category:\s*["\']([^"\']+)["\']/);
      const cat = catMatch ? catMatch[1] : "General";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(...cmds);
      total += cmds.length;
    }
  } catch (e) {}
});

console.log("Total Commands:", total);
console.log("Categories:", JSON.stringify(categories, null, 2));
