import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const model = "gemini-3-flash-preview";

export async function generateViralContent(
  topic: string, 
  platform: string, 
  brandVoice: string = 'Professional & Witty', 
  targetAudience: string = 'Tech Entrepreneurs',
  settings: { contentLength: string, emojiDensity: string, autoOptimize: boolean } = { contentLength: 'medium', emojiDensity: 'viral', autoOptimize: true }
) {
  try {
    const prompt = `
      ROLE: You are an elite viral content writer who has written posts with 10M+ views.
      You understand platform algorithms deeply and write content that gets shared, saved, and engaged.

      INPUT: 
      Topic: ${topic}
      Platform: ${platform}
      Brand Voice: ${brandVoice}
      Target Audience: ${targetAudience}
      Content Length: ${settings.contentLength}
      Emoji Density: ${settings.emojiDensity}
      Auto-Optimize for Algorithm: ${settings.autoOptimize}

      YOUR OUTPUT FORMAT — Return valid JSON only:
      {
        "platform_outputs": {
          "twitter_thread": {
            "hook_tweet": "string — must stop scroll in first 3 words",
            "tweets": ["tweet 1", "tweet 2", "tweet 3", "tweet 4", "tweet 5"],
            "cta_tweet": "string — drives retweet or follow"
          },
          "instagram_caption": {
            "hook": "string — first line, no emoji overload, create curiosity gap",
            "body": "string — storytelling format, 150-200 words",
            "cta": "string",
            "hashtags": "string — 15-20 relevant hashtags"
          },
          "tiktok_script": {
            "hook_line": "string — spoken in first 2 seconds",
            "script": "string — 30-60 second script, conversational, punchy sentences",
            "on_screen_text": ["overlay text line 1", "line 2", "line 3"],
            "trending_audio_suggestion": "string — describe the vibe of trending audio to use"
          },
          "linkedin_post": {
            "opener": "string — bold statement or question, no 'I am excited to share'",
            "body": "string — professional insight format, 200-250 words",
            "cta": "string"
          },
          "youtube_shorts_script": {
            "hook": "string — first 3 seconds",
            "script": "string — 50-60 second script",
            "title": "string — SEO optimized, curiosity-driven",
            "description": "string — 150 words with keywords"
          }
        },
        "content_metadata": {
          "best_posting_times": {
            "twitter": "string",
            "instagram": "string",
            "tiktok": "string",
            "linkedin": "string"
          },
          "repurpose_tip": "string — how to stretch this content into 5+ pieces"
        }
      }

      VIRAL WRITING RULES (follow all of them):
      1. HOOK FORMULA: Open with curiosity gap, shock, or bold claim. Never start with 'I' or filler words.
      2. PATTERN INTERRUPT: Use unexpected angles. If everyone says X, say "Actually, X is wrong, here's why"
      3. SPECIFICITY: Use exact numbers. "73% of people" beats "most people"
      4. STORYTELLING: Problem → Agitate → Resolve. Make them feel something.
      5. SENTENCE LENGTH: Short. Punchy. Then a longer sentence to build context. Repeat.
      6. SOCIAL PROOF TRIGGER: Reference "experts", "studies", or "data" even without citing
      7. SAVE BAIT: Give so much value they HAVE to save it
      8. SHARE TRIGGER: Make them look smart/funny/informed when they share it

      PLATFORM-SPECIFIC RULES:
      - TikTok: Start mid-action. Never say "Hey guys". Use "Wait—" or "Nobody talks about this:"
      - Instagram: Use line breaks. Make it scannable. End with a question for comments.
      - Twitter: Every tweet must be able to stand alone AND flow in sequence
      - LinkedIn: Professional but human. Vulnerability performs. Data + story combo wins.
      - YouTube Shorts: Say the payoff in the first 3 seconds to defeat skip button
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    if (!response.text) {
      throw new Error("No response text from Gemini");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Content Generation Error:", error);
    throw error;
  }
}

export async function analyzeTrends(seedTopic: string, platform: string = 'All Platforms') {
  try {
    const prompt = `
      ROLE: You are a world-class social media trend analyst.
      TASK: Based on the seed topic and platform provided, identify 3 highly viral, trending sub-topics or angles that are currently blowing up on ${platform}.
      
      SEED TOPIC: ${seedTopic}
      PLATFORM: ${platform}

      YOUR OUTPUT FORMAT — Return valid JSON only:
      [
        {
          "topic": "string — a specific, punchy viral topic title",
          "viral_score": number — 1 to 10,
          "why_viral": "string — 1 sentence explaining the psychological trigger (curiosity, outrage, utility, etc.)"
        }
      ]

      RULES:
      1. Be specific. Don't just say "AI", say "AI agents replacing junior devs".
      2. Focus on high-retention angles for ${platform}.
      3. Ensure the topics are distinct from each other.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      }
    });

    if (!response.text) {
      throw new Error("No response text from Gemini");
    }

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Trend Analysis Error:", error);
    throw error;
  }
}
