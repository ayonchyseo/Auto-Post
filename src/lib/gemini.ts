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
      You are a viral social media strategist with 10+ years of experience growing accounts to 1M+ followers. 
      Your specialty is writing content that triggers the "stop-scroll" reflex.

      TASK: Given the TOPIC below, generate a viral post for the specified PLATFORM.

      TOPIC: ${topic}
      PLATFORM: ${platform}
      BRAND VOICE: ${brandVoice}
      TARGET AUDIENCE: ${targetAudience}

      VIRAL POST FORMULA per platform:

      TWITTER/X:
      - Hook: Bold statement, question, or controversial take (1 line, max 12 words)
      - Body: 3-5 punchy lines, each standalone readable
      - CTA: Engagement bait (ask opinion, retweet prompt, or cliffhanger)
      - Format: Thread if complex, single tweet if punchy
      - Tone: Direct, slightly provocative, no fluff

      LINKEDIN:
      - Hook: Personal story opener OR shocking stat (2 lines)
      - Body: 5-7 short paragraphs with line breaks (no walls of text)
      - Lesson/Insight: 1 clear takeaway
      - CTA: "What do you think?" or "Save this post"
      - Tone: Professional but human, vulnerable = viral

      INSTAGRAM (Caption):
      - Hook: First line must stop scroll (question or bold claim)
      - Body: Storytelling format, emoji-enhanced
      - CTA: "Comment [WORD] for more" or tag a friend
      - Hashtags: 5 niche + 5 medium + 3 trending (15 max)
      - Tone: Relatable, aspirational, conversational

      TIKTOK/REELS (Script):
      - Hook: 3-second pattern interrupt
      - Body: Fast-paced value or entertainment
      - CTA: Follow for more or check bio
      - Tone: High energy, authentic

      OUTPUT FORMAT (Strict JSON):
      {
        "virality_score": number (0-100),
        "virality_reason": "string explaining why this will go viral",
        "platform_outputs": {
          "twitter_thread": { "hook_tweet": "string", "tweets": ["string"], "cta_tweet": "string" },
          "instagram_caption": { "hook": "string", "body": "string", "cta": "string", "hashtags": "string" },
          "linkedin_post": { "opener": "string", "body": "string", "cta": "string" },
          "tiktok_script": { "hook_line": "string", "script": "string", "on_screen_text": ["string"], "trending_audio_suggestion": "string" },
          "youtube_shorts_script": { "title": "string", "hook": "string", "script": "string", "description": "string" }
        },
        "content_metadata": {
          "hooks_ab_test": ["string", "string", "string"],
          "repurpose_tip": "string",
          "best_posting_times": { "twitter": "string", "instagram": "string", "linkedin": "string" }
        }
      }

      RULES:
      - Never use corporate jargon.
      - Every post must have a "pattern interrupt" — something unexpected.
      - Virality comes from emotion: awe, anger, inspiration, or humor.
      - Shorter sentences = more shareable.
      - Return ONLY the JSON object.
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

export async function generateVideo(prompt: string, aspectRatio: '16:9' | '9:16' = '9:16') {
  // For Veo models, we MUST use the user-selected API key from process.env.API_KEY
  // If it's not available, we fall back to GEMINI_API_KEY but this will likely fail for Veo
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
  
  if (!apiKey) {
    throw new Error("No API key found. Please select a paid API key.");
  }

  const videoAi = new GoogleGenAI({ apiKey });

  try {
    let operation = await videoAi.models.generateVideos({
      model: 'veo-3.1-lite-generate-preview',
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: aspectRatio
      }
    });

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await videoAi.operations.getVideosOperation({ operation: operation });
    }

    if (operation.error) {
      throw new Error(JSON.stringify(operation.error));
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed - no download link");

    // Fetch the video blob using the API key in headers
    const response = await fetch(downloadLink, {
      method: 'GET',
      headers: {
        'x-goog-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to download video: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Gemini Video Generation Error:", error);
    throw error;
  }
}

export async function generateImage(prompt: string, aspectRatio: '1:1' | '16:9' | '9:16' = '1:1') {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        imageConfig: {
          aspectRatio: aspectRatio
        }
      }
    });

    let imageUrl = "";
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) throw new Error("Image generation failed - no image data returned");
    return imageUrl;
  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    throw error;
  }
}

export async function generateFreeVideoAssets(topic: string) {
  try {
    const prompt = `
      TASK: Generate assets for a 30-second viral video about: ${topic}
      
      OUTPUT FORMAT (JSON):
      {
        "voiceover_script": "string — the full script to be read by TTS",
        "b_roll_search_terms": ["string", "string", "string"],
        "on_screen_captions": [
          { "time": "0:00", "text": "string" },
          { "time": "0:05", "text": "string" }
        ],
        "thumbnail_concept": "string — description for image generation"
      }
      
      RULES:
      - Script must be engaging and fast-paced.
      - Search terms should be optimized for stock video sites like Pexels.
      - Return ONLY JSON.
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
    console.error("Gemini Free Video Asset Error:", error);
    throw error;
  }
}
