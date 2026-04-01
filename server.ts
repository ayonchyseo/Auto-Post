import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { TwitterApi } from "twitter-api-v2";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
