import { cpSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function copyDir(from, to) {
  mkdirSync(path.dirname(to), { recursive: true });
  cpSync(path.join(root, from), path.join(root, to), { recursive: true });
}

copyDir("src/abi", "dist/abi");
copyDir(
  "src/services/certificate-pdf/assets",
  "dist/services/certificate-pdf/assets"
);
