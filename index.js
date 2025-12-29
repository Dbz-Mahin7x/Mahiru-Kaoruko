const express = require('express');
const path = require('path');
const { spawn } = require("child_process");
const fs = require("fs-extra");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

// Storage for logs
if (!fs.existsSync("./cache")) fs.mkdirSync("./cache");
const logPath = path.join(__dirname, "cache", "logs.txt");
fs.writeFileSync(logPath, "", { flag: "a" });

let clients = [];

// High-quality Console Interceptor
const originalLog = console.log;
console.log = (...args) => {
  const logMsg = args.map(arg => (typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg))).join(" ");
  originalLog(logMsg);
  clients.forEach(ws => ws.readyState === 1 && ws.send(logMsg));
};

// WebSocket for real-time dashboard
const wss = new WebSocket.Server({ server });
wss.on("connection", ws => {
  clients.push(ws);
  ws.send("[Connected] ✅ **Mahiru-kaoruko** log viewer active");
  ws.on("close", () => { clients = clients.filter(c => c !== ws); });
});

app.get('/', (req, res) => res.send('**Mahiru-kaoruko** System is Online. Use /logs to view data.'));

// Enhanced /logs UI
app.get("/logs", (req, res) => {
  res.send(`<html><head><title>Mahiru-kaoruko Logs</title><style>body{background:#000;color:#ff69b4;font-family:monospace;padding:20px;}#log{height:80vh;overflow-y:auto;border:1px solid #ff69b4;padding:10px;}</style></head>
  <body><h2>🌸 Mahiru-kaoruko Realtime Logs</h2><div id="log">Loading system output...</div>
  <script>const log=document.getElementById("log");const ws=new WebSocket("wss://"+location.host);ws.onmessage=e=>{log.innerHTML+="<div>"+e.data+"</div>";log.scrollTop=log.scrollHeight;};</script></body></html>`);
});

server.listen(port, () => {
  console.log(`🎀 Mahiru-kaoruko Server running at port ${port}`);
});

function startProject() {
  // Launches Goat.js (The Main Bot Logic)
  const child = spawn("node", ["Goat.js"], {
    cwd: __dirname,
    stdio: "inherit",
    shell: true
  });

  child.on("close", (code) => {
    console.log(`[𝐌𝐚𝐡𝐢𝐫𝐮-𝐊𝐚𝐨𝐫𝐮𝐤𝐮] Exited with code ${code}. Restarting...`);
    setTimeout(startProject, 3000);
  });
}

startProject();
