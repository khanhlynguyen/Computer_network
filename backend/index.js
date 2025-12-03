import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const STORAGE_ROOT = process.env.STORAGE_PATH || "storage";
const TIMEZONE = "Asia/Bangkok";
const TOKEN_LIST = (process.env.TOKEN_LIST || "demo123,abc456").split(",").map(s => s.trim()).filter(Boolean);
const MAX_Q = 5;

ensureDir(STORAGE_ROOT);

// ====== Utils ======
function ensureDir(dir) {
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sanitizeName(s = "") {
return s.toLowerCase()
.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
.replace(/[^a-z0-9]+/g, "")
.replace(/^+|_+$/g, "")
.slice(0, 40) || "user";
}

function formatFolderName(userName) {
const parts = new Intl.DateTimeFormat("en-GB", {
timeZone: TIMEZONE,
year: "numeric", month: "2-digit", day: "2-digit",
hour: "2-digit", minute: "2-digit", hour12: false
}).formatToParts(new Date());
const get = t => parts.find(p => p.type === t)?.value || "";
return ${get("day")}_${get("month")}_${get("year")}_${get("hour")}_${get("minute")}_${sanitizeName(userName)};
}

function mergeMeta(folderAbs, updater) {
const metaPath = path.join(folderAbs, "meta.json");
let meta = {};
try { meta = JSON.parse(fs.readFileSync(metaPath, "utf8")); } catch {}
fs.writeFileSync(metaPath, JSON.stringify(updater(meta), null, 2));
}

function clampQ(i) {
const n = parseInt(i, 10);
return Number.isNaN(n) ? null : Math.max(1, Math.min(MAX_Q, n));
}

function getIndexFromOriginalName(name) {
const m = /Q(\d+).webm$/i.exec(name || "");
return m ? clampQ(parseInt(m[1], 10)) : null;
}

function fileExists(filePath) {
try { return fs.existsSync(filePath); } catch { return false; }
}

// ====== Middleware ======
const verifyToken = (req, res, next) => {
const token = req.body?.token;
if (!token || !TOKEN_LIST.includes(token)) return res.status(401).json({ ok: false, error: "invalid token" });
next();
};

function enforceSequential(req, res, next) {
const folder = req.body?.folder;
if (!folder) return res.status(400).json({ ok: false, error: "missing folder" });

const q = clampQ(req.body?.questionIndex ?? getIndexFromOriginalName(req.file?.originalname) ?? 1);
const folderAbs = path.join(STORAGE_ROOT, folder);

for (let k = 1; k < q; k++) {
if (!fileExists(path.join(folderAbs, Q${k}.webm))) {
return res.status(409).json({
ok: false,
error: "sequential_violation",
message: Q${q} bị từ chối vì thiếu Q${k}. Hãy upload tuần tự.,
missing: k
});
}
}

req._targetQ = q;
next();
}

// ====== Multer ======
const storage = multer.diskStorage({
destination: (req, file, cb) => {
const folderAbs = path.join(STORAGE_ROOT, req.body.folder);
ensureDir(folderAbs);
cb(null, folderAbs);
},
filename: (req, file, cb) => {
const q = getIndexFromOriginalName(file.originalname) ?? clampQ(req.body?.questionIndex) ?? 1;
cb(null, Q${q}.webm);
}
});

const upload = multer({
storage,
limits: { fileSize: (Number(process.env.MAX_SIZE_MB || 50)) * 1024 * 1024 },
fileFilter: (req, file, cb) => cb(null, file.mimetype === "video/webm")
});

// ====== Routes ======
app.get("/api/health", (req, res) => res.json({ ok: true, service: "backend", time: new Date().toISOString() }));

app.post("/api/verify-token", verifyToken, (req, res) => res.json({ ok: true }));

app.post("/api/session/start", verifyToken, (req, res) => {
const userName = req.body.userName || "user";
const folder = formatFolderName(userName);
const folderAbs = path.join(STORAGE_ROOT, folder);
ensureDir(folderAbs);

mergeMeta(folderAbs, prev => ({
userName,
timeZone: TIMEZONE,
uploaded: prev.uploaded || [],
startedAt: new Date().toISOString(),
finishedAt: null,
questionsCount: prev.questionsCount || null
}));

res.json({ ok: true, folder });
});

app.post("/api/upload-one", upload.single("video"), enforceSequential, verifyToken, (req, res) => {
if (!req.file) return res.status(400).json({ ok: false, error: "no file" });

const folderAbs = path.join(STORAGE_ROOT, req.body.folder);
const q = req._targetQ;

mergeMeta(folderAbs, prev => {
const uploaded = Array.isArray(prev.uploaded) ? prev.uploaded : [];
const entry = { q, file: Q${q}.webm, uploadedAt: new Date().toISOString() };
return { ...prev, uploaded: [...uploaded.filter(x => x.q !== q), entry].sort((a, b) => a.q - b.q) };
});

res.json({ ok: true, savedAs: Q${q}.webm });
});

app.post("/api/session/finish", verifyToken, (req, res) => {
const { folder, questionsCount } = req.body;
if (!folder) return res.status(400).json({ ok: false, error: "missing folder" });

const folderAbs = path.join(STORAGE_ROOT, folder);
if (!fs.existsSync(folderAbs)) return res.status(400).json({ ok: false, error: "folder not found" });

mergeMeta(folderAbs, prev => ({
...prev,
questionsCount: Number(questionsCount || prev.questionsCount || 0),
finishedAt: new Date().toISOString()
}));

res.json({ ok: true });
});

app.use("/uploads", express.static(STORAGE_ROOT));

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => console.log(Backend http://localhost:${PORT}));
