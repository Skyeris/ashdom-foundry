import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../assets/icons/items"
);
const rarities = ["common", "uncommon", "rare", "radical", "atomic"];
const star = '<path d="m232 10 3.2 6.5 7.2 1-5.2 5 1.2 7.1-6.4-3.4-6.4 3.4 1.2-7.1-5.2-5 7.2-1z"/>';

for (const filename of fs.readdirSync(directory)) {
  if (!filename.endsWith(".svg") || rarities.some(rarity => filename.endsWith(`-${rarity}.svg`))) continue;

  const source = fs.readFileSync(path.join(directory, filename), "utf8");
  const basename = filename.slice(0, -4);

  rarities.forEach((rarity, rarityIndex) => {
    const stars = Array.from({ length: rarityIndex + 1 }, (_, index) =>
      `<g transform="translate(0 ${index * 43}) translate(232 20) scale(2) translate(-232 -20)">${star}</g>`
    ).join("");
    const badge = `<g fill="#fff" stroke="#000" stroke-width="2" stroke-linejoin="round">${stars}</g>`;
    const result = source.replace("</svg>", `${badge}</svg>`);
    fs.writeFileSync(path.join(directory, `${basename}-${rarity}.svg`), result);
  });
}
