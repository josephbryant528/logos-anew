import { put, del } from "@vercel/blob";

// Feedback from inside the app. Each submission becomes a GitHub issue labeled
// "feedback", with any screenshots stored in Vercel Blob and linked in the issue.
// Sits behind the passcode lock (see proxy.ts) like every other /api route.
//
// Needs these environment variables:
//   BLOB_READ_WRITE_TOKEN   added automatically when a Blob store is connected
//   GITHUB_FEEDBACK_TOKEN   fine-grained token with Issues: read & write on the repo
//   FEEDBACK_REPO           optional, "owner/name"; defaults to the app's own repo

const DEFAULT_REPO = "josephbryant528/logos-anew";
const MAX_MESSAGE = 5000;
const MAX_NAME = 80;
const MAX_CONTEXT = 300;
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024; // Vercel functions accept ~4.5 MB per request
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};

// 5 submissions per minute per visitor.
const recent = new Map<string, { count: number; resetAt: number }>();
const MAX_PER_WINDOW = 5;
const WINDOW_MS = 60 * 1000;

function allow(ip: string) {
  const now = Date.now();
  const entry = recent.get(ip);
  if (!entry || now > entry.resetAt) {
    recent.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_PER_WINDOW) return false;
  entry.count++;
  return true;
}

function field(form: FormData, key: string, max: number) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// Keep pasted text from pinging GitHub users or closing issues by reference.
function defang(text: string) {
  return text.replace(/@(?=\w)/g, "@​").replace(/#(?=\d)/g, "#​");
}

function quote(text: string) {
  return text.split(/\r?\n/).map((line) => `> ${line}`).join("\n");
}

function oneLine(text: string, max: number) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function deviceLabel(ua: string) {
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "Unknown device";
}

export async function POST(request: Request) {
  const token = process.env.GITHUB_FEEDBACK_TOKEN;
  if (!token || !process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: "Feedback isn't set up yet. Please try again later." }, { status: 503 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
  if (!allow(ip)) {
    return Response.json({ error: "That's a lot of feedback at once. Wait a minute and try again." }, { status: 429 });
  }

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_TOTAL_BYTES + 64 * 1024) {
    return Response.json({ error: "Those pictures are too large. Try fewer or smaller ones." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const message = field(form, "message", MAX_MESSAGE);
  const name = field(form, "name", MAX_NAME);
  const context = field(form, "context", MAX_CONTEXT);
  if (!message) {
    return Response.json({ error: "Please write a little about what you noticed." }, { status: 400 });
  }

  const files = form.getAll("images").filter((f): f is File => typeof f !== "string" && f.size > 0);
  if (files.length > MAX_IMAGES) {
    return Response.json({ error: `Please attach ${MAX_IMAGES} pictures or fewer.` }, { status: 400 });
  }
  let total = 0;
  for (const file of files) {
    if (!IMAGE_TYPES[file.type]) {
      return Response.json({ error: "Only pictures (JPEG, PNG, WebP, GIF or HEIC) can be attached." }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return Response.json({ error: "One of the pictures is too large." }, { status: 413 });
    }
    total += file.size;
  }
  if (total > MAX_TOTAL_BYTES) {
    return Response.json({ error: "Those pictures are too large together. Try fewer." }, { status: 413 });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const uploaded: { url: string }[] = [];
  try {
    for (const [i, file] of files.entries()) {
      const blob = await put(`feedback/${stamp}/screenshot-${i + 1}.${IMAGE_TYPES[file.type]}`, file, {
        access: "public",
        addRandomSuffix: true,
        contentType: file.type,
      });
      uploaded.push(blob);
    }
  } catch (err) {
    console.error("feedback: image upload failed", err);
    if (uploaded.length) await del(uploaded.map((b) => b.url)).catch(() => {});
    return Response.json({ error: "Couldn't save the pictures. Please try again." }, { status: 502 });
  }

  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
  const env = process.env.VERCEL_ENV ?? "local";
  const lines = [
    quote(defang(message)),
    "",
    `**From:** ${name ? defang(name) : "_not given_"}`,
    `**Where:** ${context ? defang(context) : "_unknown_"}`,
    `**Device:** ${deviceLabel(request.headers.get("user-agent") ?? "")}`,
    `**App:** ${env}${commit ? ` (${commit})` : ""}`,
  ];
  if (uploaded.length) {
    lines.push("", "### Screenshots", "");
    uploaded.forEach((b, i) => lines.push(`![Screenshot ${i + 1}](${b.url})`));
  }
  lines.push("", "<sub>Sent from the in-app feedback form.</sub>");

  const title = `Feedback${name ? ` from ${oneLine(name, 40)}` : ""}: ${oneLine(message, 70)}`;
  const repo = process.env.FEEDBACK_REPO || DEFAULT_REPO;

  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "logos-anew-feedback",
    },
    body: JSON.stringify({ title: defang(title), body: lines.join("\n"), labels: ["feedback"] }),
  });

  if (!res.ok) {
    console.error("feedback: GitHub issue failed", res.status, await res.text().catch(() => ""));
    if (uploaded.length) await del(uploaded.map((b) => b.url)).catch(() => {});
    return Response.json({ error: "Couldn't send your feedback just now. Please try again." }, { status: 502 });
  }

  return Response.json({ ok: true });
}
