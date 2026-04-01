import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { TwitterApi } from "twitter-api-v2";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/twitter/publish", async (req, res) => {
    try {
      const { text, credentials } = req.body;
      const { appKey, appSecret, accessToken, accessSecret } = credentials;

      if (!appKey || !appSecret || !accessToken || !accessSecret) {
        return res.status(400).json({ error: "Missing Twitter API credentials" });
      }

      if (!text) {
        return res.status(400).json({ error: "Missing tweet text" });
      }

      const client = new TwitterApi({
        appKey,
        appSecret,
        accessToken,
        accessSecret,
      });

      const rwClient = client.readWrite;
      const tweet = await rwClient.v2.tweet(text);

      res.json({ success: true, data: tweet });
    } catch (error: any) {
      console.error("Twitter API Error:", error);
      res.status(500).json({ error: error.message || "Failed to publish to Twitter" });
    }
  });

  app.post("/api/linkedin/publish", async (req, res) => {
    try {
      const { text, accessToken, authorUrn } = req.body;

      if (!accessToken || !authorUrn) {
        return res.status(400).json({ error: "Missing LinkedIn API credentials" });
      }

      if (!text) {
        return res.status(400).json({ error: "Missing post text" });
      }

      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          author: authorUrn,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: {
                text: text
              },
              shareMediaCategory: "NONE"
            }
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to publish to LinkedIn");
      }

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("LinkedIn API Error:", error);
      res.status(500).json({ error: error.message || "Failed to publish to LinkedIn" });
    }
  });

  app.post("/api/youtube/publish", upload.single('video'), async (req, res) => {
    try {
      const { title, description, accessToken } = req.body;
      const videoFile = req.file;

      if (!accessToken) {
        return res.status(400).json({ error: "Missing YouTube Access Token" });
      }

      if (!videoFile) {
        return res.status(400).json({ error: "Missing video file" });
      }

      // YouTube Data API v3 upload endpoint (multipart)
      const metadata = {
        snippet: {
          title: title || "ViralFlow Video",
          description: description || "",
          categoryId: "22" // People & Blogs
        },
        status: {
          privacyStatus: "public"
        }
      };

      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      const body = Buffer.concat([
        Buffer.from(delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata)),
        Buffer.from(delimiter + 'Content-Type: video/mp4\r\n\r\n'),
        videoFile.buffer,
        Buffer.from(close_delim)
      ]);

      const response = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': body.length.toString()
        },
        body: body
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to publish to YouTube");
      }

      res.json({ success: true, data });
    } catch (error: any) {
      console.error("YouTube API Error:", error);
      res.status(500).json({ error: error.message || "Failed to publish to YouTube" });
    }
  });

  app.post("/api/validate", async (req, res) => {
    try {
      const { type, credentials } = req.body;

      if (type === 'twitter') {
        const { appKey, appSecret, accessToken, accessSecret } = credentials;
        const client = new TwitterApi({ appKey, appSecret, accessToken, accessSecret });
        await client.v2.me();
        return res.json({ valid: true });
      }

      if (type === 'telegram') {
        const { token } = credentials;
        const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        const data = await response.json();
        return res.json({ valid: data.ok, message: data.description });
      }

      if (type === 'linkedin') {
        const { token } = credentials;
        const response = await fetch('https://api.linkedin.com/v2/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        return res.json({ valid: response.ok, message: data.message });
      }

      if (type === 'youtube') {
        const { token } = credentials;
        const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=id&mine=true', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        return res.json({ valid: response.ok, message: data.error?.message });
      }

      if (type === 'pexels') {
        const { token } = credentials;
        const response = await fetch('https://api.pexels.com/v1/curated?per_page=1', {
          headers: { 'Authorization': token }
        });
        return res.json({ valid: response.ok });
      }

      if (type === 'elevenlabs') {
        const { token } = credentials;
        const response = await fetch('https://api.elevenlabs.io/v1/user', {
          headers: { 'xi-api-key': token }
        });
        return res.json({ valid: response.ok });
      }

      res.status(400).json({ error: "Unknown validation type" });
    } catch (error: any) {
      res.json({ valid: false, message: error.message || "Validation failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
