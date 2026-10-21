const { spawn } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const children = [
  spawn(process.execPath, [path.join(__dirname, "index.js")], { cwd: root, stdio: "inherit" }),
  spawn(process.execPath, [path.join(root, "node_modules", "vite", "bin", "vite.js")], { cwd: root, stdio: "inherit" })
];

function stopChildren() {
  for (const child of children) if (!child.killed) child.kill();
}

process.on("SIGINT", () => { stopChildren(); process.exit(0); });
process.on("SIGTERM", () => { stopChildren(); process.exit(0); });
for (const child of children) {
  child.on("exit", code => {
    if (code && code !== 0) {
      stopChildren();
      process.exitCode = code;
    }
  });
}
