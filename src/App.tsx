/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  PenTool, 
  Video, 
  Image as ImageIcon,
  Share2, 
  Search, 
  Zap, 
  ChevronRight, 
  Twitter, 
  Instagram, 
  Linkedin, 
  Facebook,
  Loader2,
  Sparkles,
  ArrowRight,
  Settings,
  ShieldCheck,
  Globe,
  Clock,
  Calendar,
  X,
  Youtube,
  Play,
  Download,
  AlertCircle,
  Key,
  Image,
  Send,
  Repeat,
  MessageSquare
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { analyzeTrends, generateViralContent, generateVideo, generateImage, generateFreeVideoAssets, analyzeBrandVoice, repurposeContent } from './lib/gemini';
import { cn } from './lib/utils';
import { FreeVideoPlayer } from './components/FreeVideoPlayer';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

type Platform = 'Twitter' | 'Instagram' | 'LinkedIn' | 'Facebook' | 'Telegram' | 'YouTube';

interface Trend {
  topic: string;
  viral_score: number;
  why_viral: string;
}

interface ViralContent {
  virality_score: number;
  virality_reason: string;
  posts: {
    twitter: { hook: string; body: string; cta: string; hashtags: string[] };
    linkedin: { hook: string; body: string; cta: string };
    instagram: { hook: string; body: string; cta: string; hashtags: string[] };
    facebook: { hook: string; body: string; cta: string };
    telegram: { hook: string; body: string; cta: string };
  };
  video_script: {
    hook_3sec: string;
    body_30sec: string;
    cta_5sec: string;
    b_roll_suggestions: string[];
  };
  thumbnail_text: string;
  best_posting_time: string;
}

export default function App() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [seedTopic, setSeedTopic] = useState('');
  const [scoutPlatform, setScoutPlatform] = useState('All Platforms');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('Twitter');
  const [generatedContent, setGeneratedContent] = useState<ViralContent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'scout' | 'write' | 'repurpose' | 'video' | 'image' | 'preview' | 'settings' | 'trends'>('scout');
  const [isPublished, setIsPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Settings State
  const [brandVoice, setBrandVoice] = useState('Professional & Witty');
  const [targetAudience, setTargetAudience] = useState('Tech Entrepreneurs');
  const [contentLength, setContentLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [emojiDensity, setEmojiDensity] = useState<'none' | 'minimal' | 'viral'>('viral');
  const [autoOptimize, setAutoOptimize] = useState(true);

  // Verification State
  const [checklist, setChecklist] = useState({
    hook: false,
    pattern: false,
    data: false,
    cta: false,
    voice: false,
    mobile: false
  });

  // Archive State
  const [archive, setArchive] = useState<{topic: string, platform: string, date: string, content: ViralContent}[]>([]);

  // Scheduling State
  const [scheduledPosts, setScheduledPosts] = useState<{id: string, topic: string, platform: string, scheduledDate: string, status: 'scheduled' | 'published'}[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');

  // Video Generation State
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoDuration, setVideoDuration] = useState<5 | 12 | 30>(5);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [videoMode, setVideoMode] = useState<'premium' | 'free'>('free');
  const [freeVideoAssets, setFreeVideoAssets] = useState<{
    voiceover_script: string;
    b_roll_search_terms: string[];
    on_screen_captions: { time: string; text: string }[];
    thumbnail_concept: string;
  } | null>(null);

  // Image Generation State (Free)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageAspectRatio, setImageAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');

  // Repurpose State
  const [sourceText, setSourceText] = useState('');
  const [isRepurposing, setIsRepurposing] = useState(false);
  const [repurposedPosts, setRepurposedPosts] = useState<{platform: string, topic: string, content: string}[]>([]);

  // Voice Trainer State
  const [voiceSamples, setVoiceSamples] = useState('');
  const [isTrainingVoice, setIsTrainingVoice] = useState(false);

  // API Keys State
  const [apiKeys, setApiKeys] = useState({
    telegramBotToken: '',
    telegramChatId: '',
    twitterApiKey: '',
    twitterApiSecret: '',
    twitterAccessToken: '',
    twitterAccessSecret: '',
    linkedinAccessToken: '',
    linkedinAuthorUrn: '',
    youtubeAccessToken: '',
    youtubeChannelId: '',
    pexelsApiKey: '',
    elevenLabsApiKey: ''
  });

  const [validationStatus, setValidationStatus] = useState<Record<string, { status: 'idle' | 'validating' | 'valid' | 'invalid', message?: string }>>({});
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const savedKeys = localStorage.getItem('viralflow_api_keys');
    if (savedKeys) {
      try {
        setApiKeys(JSON.parse(savedKeys));
      } catch (e) {}
    }
  }, []);

  const updateApiKey = (key: keyof typeof apiKeys, value: string) => {
    setApiKeys(prev => ({ ...prev, [key]: value }));
    // Reset validation status when key changes
    if (validationStatus[key]) {
      setValidationStatus(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validateKeys = async () => {
    setIsValidating(true);
    const newStatus: typeof validationStatus = {};

    const validate = async (type: string, credentials: any) => {
      try {
        const res = await fetch('/api/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, credentials })
        });
        const data = await res.json();
        return data.valid ? { status: 'valid' as const } : { status: 'invalid' as const, message: data.message || 'Invalid Credentials' };
      } catch (e) {
        return { status: 'invalid' as const, message: 'Connection Error' };
      }
    };

    // 1. Telegram Validation
    if (apiKeys.telegramBotToken) {
      newStatus.telegramBotToken = { status: 'validating' };
      setValidationStatus({ ...newStatus });
      newStatus.telegramBotToken = await validate('telegram', { token: apiKeys.telegramBotToken });
    }

    // 2. Twitter Validation
    if (apiKeys.twitterApiKey && apiKeys.twitterApiSecret && apiKeys.twitterAccessToken && apiKeys.twitterAccessSecret) {
      newStatus.twitterApiKey = { status: 'validating' };
      setValidationStatus({ ...newStatus });
      newStatus.twitterApiKey = await validate('twitter', { 
        appKey: apiKeys.twitterApiKey, 
        appSecret: apiKeys.twitterApiSecret, 
        accessToken: apiKeys.twitterAccessToken, 
        accessSecret: apiKeys.twitterAccessSecret 
      });
    }

    // 3. LinkedIn Validation
    if (apiKeys.linkedinAccessToken) {
      newStatus.linkedinAccessToken = { status: 'validating' };
      setValidationStatus({ ...newStatus });
      newStatus.linkedinAccessToken = await validate('linkedin', { token: apiKeys.linkedinAccessToken });
    }

    // 4. YouTube Validation
    if (apiKeys.youtubeAccessToken) {
      newStatus.youtubeAccessToken = { status: 'validating' };
      setValidationStatus({ ...newStatus });
      newStatus.youtubeAccessToken = await validate('youtube', { token: apiKeys.youtubeAccessToken });
    }

    // 5. Pexels Validation
    if (apiKeys.pexelsApiKey) {
      newStatus.pexelsApiKey = { status: 'validating' };
      setValidationStatus({ ...newStatus });
      newStatus.pexelsApiKey = await validate('pexels', { token: apiKeys.pexelsApiKey });
    }

    // 6. ElevenLabs Validation
    if (apiKeys.elevenLabsApiKey) {
      newStatus.elevenLabsApiKey = { status: 'validating' };
      setValidationStatus({ ...newStatus });
      newStatus.elevenLabsApiKey = await validate('elevenlabs', { token: apiKeys.elevenLabsApiKey });
    }

    setValidationStatus(newStatus);
    setIsValidating(false);
    return Object.values(newStatus).every(s => s.status === 'valid');
  };

  const saveApiKeys = async () => {
    const allValid = await validateKeys();
    localStorage.setItem('viralflow_api_keys', JSON.stringify(apiKeys));
    if (allValid) {
      alert("API Keys validated and saved successfully!");
    } else {
      alert("API Keys saved, but some failed validation. Please check the errors.");
    }
  };

  useEffect(() => {
    const checkApiKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkApiKey();
  }, []);

  const handleOpenKeyDialog = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleGenerateVideo = async () => {
    if (!videoPrompt) return;
    setIsGeneratingVideo(true);
    setError(null);
    try {
      if (videoMode === 'premium') {
        const videoUrl = await generateVideo(videoPrompt, '9:16', videoDuration);
        setGeneratedVideoUrl(videoUrl);
      } else {
        const assets = await generateFreeVideoAssets(videoPrompt);
        setFreeVideoAssets(assets);
      }
    } catch (err: any) {
      console.error("Failed to generate video:", err);
      const errorMessage = err.message || "";
      if (errorMessage.includes("Requested entity was not found") || errorMessage.includes("PERMISSION_DENIED")) {
        setHasApiKey(false);
        setError("API Key error: Permission denied. Please ensure you have selected a paid API key from a project with billing enabled.");
      } else {
        setError("Failed to generate video. Please check your API key and try again.");
      }
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt) return;
    setIsGeneratingImage(true);
    setError(null);
    try {
      const imageUrl = await generateImage(imagePrompt, imageAspectRatio);
      setGeneratedImageUrl(imageUrl);
    } catch (err: any) {
      console.error("Failed to generate image:", err);
      setError("Failed to generate image. Please try again.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleRepurpose = async () => {
    if (!sourceText) return;
    setIsRepurposing(true);
    setError(null);
    try {
      const result = await repurposeContent(sourceText);
      setRepurposedPosts(result);
    } catch (err: any) {
      console.error("Failed to repurpose:", err);
      setError("Failed to repurpose content. Please try again.");
    } finally {
      setIsRepurposing(false);
    }
  };

  const handleTrainVoice = async () => {
    if (!voiceSamples) return;
    setIsTrainingVoice(true);
    setError(null);
    try {
      const voice = await analyzeBrandVoice(voiceSamples);
      setBrandVoice(voice);
      setVoiceSamples('');
      alert("Brand Voice successfully trained and updated!");
    } catch (err: any) {
      console.error("Failed to train voice:", err);
      setError("Failed to analyze voice. Please try again.");
    } finally {
      setIsTrainingVoice(false);
    }
  };

  const fetchTrends = async () => {
    if (!seedTopic) {
      setError("Please enter a seed topic to scout trends.");
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeTrends(seedTopic, scoutPlatform);
      setTrends(result);
    } catch (err) {
      console.error("Failed to fetch trends:", err);
      setError("Failed to analyze trends. Please check your API key and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTopic) return;
    setIsGenerating(true);
    setIsPublished(false);
    setChecklist({
      hook: false,
      pattern: false,
      data: false,
      cta: false,
      voice: false,
      mobile: false
    });
    try {
      const result = await generateViralContent(
        selectedTopic, 
        selectedPlatform, 
        brandVoice, 
        targetAudience,
        { contentLength, emojiDensity, autoOptimize }
      );
      setGeneratedContent(result);
      
      // Save to archive
      setArchive(prev => [{
        topic: selectedTopic,
        platform: selectedPlatform,
        date: new Date().toLocaleString(),
        content: result
      }, ...prev]);
    } catch (error) {
      console.error("Failed to generate content:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getPlatformContentString = () => {
    if (!generatedContent) return '';
    const posts = generatedContent.posts;
    
    switch (selectedPlatform) {
      case 'Twitter':
        if (!posts.twitter) return '';
        return `${posts.twitter.hook}\n\n${posts.twitter.body}\n\n${posts.twitter.cta}\n\n${posts.twitter.hashtags.join(' ')}`;
      case 'Instagram':
        if (!posts.instagram) return '';
        return `${posts.instagram.hook}\n\n${posts.instagram.body}\n\n${posts.instagram.cta}\n\n${posts.instagram.hashtags.join(' ')}`;
      case 'LinkedIn':
        if (!posts.linkedin) return '';
        return `${posts.linkedin.hook}\n\n${posts.linkedin.body}\n\n${posts.linkedin.cta}`;
      case 'Facebook':
        if (!posts.facebook) return '';
        return `${posts.facebook.hook}\n\n${posts.facebook.body}\n\n${posts.facebook.cta}`;
      case 'Telegram':
        if (!posts.telegram) return '';
        return `${posts.telegram.hook}\n\n${posts.telegram.body}\n\n${posts.telegram.cta}`;
      default:
        return '';
    }
  };

  const handlePublish = async (isScheduling: boolean = false) => {
    if (isScheduling && !scheduleDate) {
      alert("Please select a date and time for scheduling.");
      return;
    }

    setIsPublished(true);

    if (!isScheduling && selectedPlatform === 'Telegram') {
      if (!apiKeys.telegramBotToken || !apiKeys.telegramChatId) {
        alert("Please configure your Telegram Bot Token and Chat ID in Settings.");
        setIsPublished(false);
        return;
      }
      try {
        const text = getPlatformContentString();
        const res = await fetch(`https://api.telegram.org/bot${apiKeys.telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: apiKeys.telegramChatId,
            text: text
          })
        });
        if (!res.ok) throw new Error("Telegram API Error");
        alert(`Successfully published to Telegram!`);
      } catch (err) {
        alert("Failed to publish to Telegram. Check your Bot Token and Chat ID.");
      }
      setIsPublished(false);
      return;
    }

    if (!isScheduling && selectedPlatform === 'Twitter') {
      if (!apiKeys.twitterApiKey || !apiKeys.twitterApiSecret || !apiKeys.twitterAccessToken || !apiKeys.twitterAccessSecret) {
        alert("Please configure all Twitter API credentials in Settings.");
        setIsPublished(false);
        return;
      }
      try {
        const text = getPlatformContentString();
        const res = await fetch('/api/twitter/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text,
            credentials: {
              appKey: apiKeys.twitterApiKey,
              appSecret: apiKeys.twitterApiSecret,
              accessToken: apiKeys.twitterAccessToken,
              accessSecret: apiKeys.twitterAccessSecret
            }
          })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Twitter API Error");
        alert(`Successfully published to Twitter!`);
      } catch (err: any) {
        alert(`Failed to publish to Twitter: ${err.message}`);
      }
      setIsPublished(false);
      return;
    }

    if (!isScheduling && selectedPlatform === 'LinkedIn') {
      if (!apiKeys.linkedinAccessToken || !apiKeys.linkedinAuthorUrn) {
        alert("Please configure your LinkedIn Access Token and Author URN in Settings.");
        setIsPublished(false);
        return;
      }
      try {
        const text = getPlatformContentString();
        const res = await fetch('/api/linkedin/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text,
            accessToken: apiKeys.linkedinAccessToken,
            authorUrn: apiKeys.linkedinAuthorUrn
          })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "LinkedIn API Error");
        alert(`Successfully published to LinkedIn!`);
      } catch (err: any) {
        alert(`Failed to publish to LinkedIn: ${err.message}`);
      }
      setIsPublished(false);
      return;
    }

    if (!isScheduling && selectedPlatform === 'YouTube') {
      if (!apiKeys.youtubeAccessToken) {
        alert("Please configure your YouTube Access Token in Settings.");
        setIsPublished(false);
        return;
      }
      try {
        const text = getPlatformContentString();
        const formData = new FormData();
        formData.append('title', selectedTopic || "ViralFlow Video");
        formData.append('description', text);
        formData.append('accessToken', apiKeys.youtubeAccessToken);

        if (generatedVideoUrl) {
          const response = await fetch(generatedVideoUrl);
          const blob = await response.blob();
          formData.append('video', blob, 'video.mp4');
        } else {
          alert("No video generated yet. Please generate a video first.");
          setIsPublished(false);
          return;
        }

        const res = await fetch('/api/youtube/publish', {
          method: 'POST',
          body: formData
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "YouTube API Error");
        alert(`Successfully published to YouTube!`);
      } catch (err: any) {
        alert(`Failed to publish to YouTube: ${err.message}`);
      }
      setIsPublished(false);
      return;
    }

    setTimeout(() => {
      if (isScheduling) {
        const newScheduledPost = {
          id: Math.random().toString(36).substr(2, 9),
          topic: selectedTopic,
          platform: selectedPlatform,
          scheduledDate: scheduleDate,
          status: 'scheduled' as const
        };
        setScheduledPosts(prev => [newScheduledPost, ...prev]);
        alert(`Successfully scheduled for ${selectedPlatform} on ${scheduleDate}!`);
      } else {
        alert(`Successfully published to ${selectedPlatform}!`);
      }
      setIsPublished(false);
      setShowScheduleModal(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-bg text-text font-sans selection:bg-accent/30">
      {/* Hero Section */}
      <header className="relative px-6 py-12 lg:py-24 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(124,58,237,0.15)_0%,transparent_50%)] pointer-events-none" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-3xl mx-auto"
        >
          <div className="inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1 mb-4 lg:mb-8 backdrop-blur-sm">
            <span className="font-mono text-[8px] lg:text-[10px] tracking-[0.3em] text-muted uppercase">Intelligence Layer v1.0</span>
          </div>
          <h1 className="font-display text-4xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight mb-4 lg:mb-6 text-gradient">
            ViralFlow AI
          </h1>
          <p className="text-muted text-sm lg:text-xl font-light leading-relaxed">
            The minimal engine for maximum reach. <br className="hidden lg:block" />
            Scout trends, craft stories, and automate your growth.
          </p>
        </motion.div>
      </header>

      {/* Navigation */}
      <nav className="sticky top-4 lg:top-6 z-50 px-4 lg:px-6 mb-6 lg:mb-12">
        <div className="mx-auto max-w-fit glass rounded-full px-2 py-1 flex gap-1 shadow-2xl shadow-black/50 overflow-x-auto no-scrollbar max-w-full">
          {[
            { id: 'scout', label: 'SCOUT', icon: TrendingUp },
            { id: 'trends', label: 'TRENDS', icon: Globe },
            { id: 'write', label: 'WRITE', icon: PenTool },
            { id: 'repurpose', label: 'REPURPOSE', icon: Repeat },
            { id: 'image', label: 'IMAGE (FREE)', icon: ImageIcon },
            { id: 'video', label: 'VIDEO', icon: Video },
            { id: 'preview', label: 'PREVIEW', icon: Share2 },
            { id: 'settings', label: 'SETTINGS', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 lg:px-6 py-2 lg:py-2.5 rounded-full transition-all font-mono text-[9px] lg:text-[10px] tracking-widest whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-white text-black shadow-lg" 
                  : "text-muted hover:text-text hover:bg-white/5"
              )}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <AnimatePresence mode="wait">
          {activeTab === 'scout' && (
            <motion.section
              key="scout"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6 lg:space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex-grow max-w-2xl space-y-4">
                  <div>
                    <h2 className="font-display text-2xl lg:text-3xl font-extrabold mb-2 md:mb-3 tracking-tight">Trend Scout</h2>
                    <p className="text-muted text-xs lg:text-sm font-light">Enter a seed topic and select a platform to discover viral angles.</p>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-grow flex flex-col gap-2">
                      <label className="font-mono text-[8px] lg:text-[9px] text-muted uppercase tracking-[0.2em]">Seed Topic</label>
                      <input 
                        type="text" 
                        value={seedTopic}
                        onChange={(e) => setSeedTopic(e.target.value)}
                        placeholder="e.g. AI Agents, Remote Work..."
                        className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-xl focus:outline-none focus:border-white/30 transition-all text-sm placeholder:text-muted/50"
                      />
                    </div>
                    <div className="flex flex-col gap-2 min-w-[160px] lg:min-w-[200px]">
                      <label className="font-mono text-[8px] lg:text-[9px] text-muted uppercase tracking-[0.2em]">Platform</label>
                      <select 
                        value={scoutPlatform}
                        onChange={(e) => setScoutPlatform(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-xl focus:outline-none focus:border-white/30 transition-all text-sm text-white appearance-none cursor-pointer"
                      >
                        <option value="All Platforms">All Platforms</option>
                        <option value="Twitter">Twitter</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Facebook">Facebook</option>
                        <option value="Telegram">Telegram</option>
                      </select>
                    </div>
                    <div className="flex flex-col justify-end">
                      <button 
                        onClick={fetchTrends}
                        disabled={isAnalyzing || !seedTopic}
                        className="flex items-center justify-center gap-2 bg-white hover:bg-white/90 text-black px-8 lg:px-10 py-4 rounded-xl font-bold transition-all disabled:opacity-50 h-[54px] shadow-xl shadow-white/5 text-[11px] tracking-widest uppercase"
                      >
                        {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                        <span>SCOUT</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-accent/10 border border-accent/30 p-4 rounded-sm text-accent text-sm font-mono">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trends.length > 0 ? (
                  trends.map((trend, i) => (
                    <motion.div
                      key={trend.topic}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="group glass-card p-6 lg:p-8 rounded-2xl cursor-pointer"
                      onClick={() => {
                        setSelectedTopic(trend.topic);
                        setActiveTab('write');
                      }}
                    >
                      <div className="flex items-center justify-between mb-4 lg:mb-6">
                        <div className="bg-white/10 text-white font-mono text-[8px] lg:text-[9px] tracking-widest px-3 py-1 rounded-full border border-white/5">
                          SCORE: {trend.viral_score}/10
                        </div>
                        <Zap size={14} className="text-white opacity-0 group-hover:opacity-100 transition-all transform group-hover:scale-110" />
                      </div>
                      <h3 className="font-display text-xl lg:text-2xl font-bold mb-3 lg:mb-4 group-hover:text-white transition-colors leading-tight">{trend.topic}</h3>
                      <p className="text-muted text-xs lg:text-sm leading-relaxed mb-4 lg:mb-6 font-light">{trend.why_viral}</p>
                      <div className="flex items-center text-white font-mono text-[9px] lg:text-[10px] tracking-widest group-hover:gap-3 transition-all">
                        GENERATE <ArrowRight size={12} />
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-1 md:col-span-2 lg:col-span-3 py-16 lg:py-20 text-center border border-dashed border-border rounded-2xl">
                    <TrendingUp className="mx-auto text-muted/20 mb-4 w-10 h-10 lg:w-12 lg:h-12" />
                    <p className="text-muted text-sm lg:text-base">No trends analyzed yet. Click "Scout Trends" to begin.</p>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {activeTab === 'trends' && (
            <motion.section
              key="trends"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6 lg:space-y-12"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h2 className="font-display text-2xl lg:text-4xl font-extrabold mb-2 md:mb-3 tracking-tight">Trend Scout</h2>
                  <p className="text-muted text-xs lg:text-base font-light">AI-powered global trend analysis for maximum virality.</p>
                </div>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 self-start md:self-auto">
                  <button className="px-4 py-2 rounded-lg bg-white text-black text-[9px] md:text-[10px] font-mono tracking-widest uppercase">GLOBAL</button>
                  <button className="px-4 py-2 rounded-lg text-muted hover:text-white text-[9px] md:text-[10px] font-mono tracking-widest uppercase">LOCAL</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {[
                  { topic: "AI Agents in SaaS", score: 98, trend: "Rising", category: "Tech", color: "text-accent" },
                  { topic: "Quiet Luxury Fashion", score: 84, trend: "Stable", category: "Lifestyle", color: "text-accent2" },
                  { topic: "Sustainable Travel", score: 72, trend: "Rising", category: "Travel", color: "text-accent3" },
                  { topic: "Remote Work 2.0", score: 91, trend: "Viral", category: "Business", color: "text-accent" },
                  { topic: "Biohacking Routines", score: 65, trend: "Rising", category: "Health", color: "text-accent2" },
                  { topic: "Web3 Gaming", score: 58, trend: "Falling", category: "Gaming", color: "text-muted" }
                ].map((trend, i) => (
                  <div key={i} className="glass-card p-6 lg:p-8 rounded-2xl lg:rounded-3xl border-white/5 hover:border-white/20 transition-all group">
                    <div className="flex justify-between items-start mb-4 lg:mb-6">
                      <span className="text-[8px] lg:text-[9px] font-mono uppercase tracking-widest text-muted bg-white/5 px-3 py-1 rounded-full">{trend.category}</span>
                      <div className={cn("flex items-center gap-1.5 font-mono text-[9px] lg:text-[10px] font-bold uppercase tracking-widest", trend.color)}>
                        <TrendingUp className="w-2.5 h-2.5 lg:w-3 lg:h-3" /> {trend.trend}
                      </div>
                    </div>
                    <h4 className="text-lg lg:text-xl font-bold mb-4 lg:mb-6 tracking-tight group-hover:text-accent transition-colors">{trend.topic}</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-[9px] font-mono uppercase tracking-widest text-muted">
                        <span>Virality Potential</span>
                        <span>{trend.score}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${trend.score}%` }}
                          transition={{ duration: 1, delay: i * 0.1 }}
                          className={cn("h-full rounded-full", trend.color.replace('text-', 'bg-'))}
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedTopic(trend.topic);
                        setActiveTab('write');
                      }}
                      className="w-full mt-8 py-4 rounded-2xl border border-white/5 bg-white/2 hover:bg-white/5 text-[10px] font-mono tracking-widest uppercase font-bold transition-all"
                    >
                      GENERATE CONTENT
                    </button>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {activeTab === 'write' && (
            <motion.section
              key="write"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-12"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12">
                {/* Controls */}
                <div className="space-y-6 lg:space-y-8">
                  <div className="glass-card p-6 lg:p-8 rounded-2xl space-y-6 lg:space-y-8">
                    <h3 className="font-display text-lg lg:text-xl font-bold tracking-tight">Configuration</h3>
                    
                    <div className="space-y-3">
                      <label className="font-mono text-[9px] text-muted uppercase tracking-[0.2em]">Topic</label>
                      <input 
                        type="text" 
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
                        placeholder="Enter a topic..."
                        className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-xl focus:outline-none focus:border-white/30 transition-all text-sm placeholder:text-muted/50"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="font-mono text-[9px] text-muted uppercase tracking-[0.2em]">Platform</label>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {(['Twitter', 'Instagram', 'LinkedIn', 'Facebook', 'Telegram'] as Platform[]).map((p) => (
                          <button
                            key={p}
                            onClick={() => setSelectedPlatform(p)}
                            className={cn(
                              "flex items-center gap-2 px-4 py-3 rounded-xl border text-[10px] font-mono tracking-wider transition-all",
                              selectedPlatform === p 
                                ? "bg-white text-black border-white" 
                                : "bg-white/5 border-white/10 text-muted hover:border-white/30"
                            )}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={handleGenerate}
                      disabled={isGenerating || !selectedTopic}
                      className="w-full flex items-center justify-center gap-3 bg-white hover:bg-white/90 text-black py-5 rounded-xl font-bold transition-all disabled:opacity-50 mt-6 shadow-xl shadow-white/5"
                    >
                      {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                      <span className="tracking-widest text-[11px] uppercase">{isGenerating ? 'GENERATING...' : 'WRITE VIRAL POST'}</span>
                    </button>
                  </div>
                </div>

                {/* Output */}
                <div className="lg:col-span-2">
                  <div className="glass-card rounded-2xl min-h-[400px] lg:min-h-[600px] flex flex-col overflow-hidden">
                    <div className="border-b border-white/5 px-6 lg:px-8 py-4 lg:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/5 gap-4 sm:gap-0">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-green shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="font-mono text-[9px] text-muted uppercase tracking-[0.2em]">Output: {selectedPlatform}</span>
                      </div>
                      <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                        {generatedContent && (
                          <>
                            <button 
                              onClick={() => navigator.clipboard.writeText(getPlatformContentString())}
                              className="text-muted hover:text-white text-[10px] font-mono tracking-widest transition-colors"
                            >
                              COPY
                            </button>
                            <button 
                              onClick={() => setActiveTab('preview')}
                              className="text-white hover:opacity-80 text-[10px] font-mono tracking-widest font-bold transition-all flex items-center gap-2"
                            >
                              PREVIEW <ArrowRight size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="p-6 lg:p-10 flex-grow overflow-auto prose prose-invert max-w-none">
                      {isGenerating ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted space-y-6 py-12 lg:py-0">
                          <Loader2 className="animate-spin text-white w-8 h-8 lg:w-10 lg:h-10" />
                          <p className="font-mono text-[10px] tracking-[0.3em] uppercase animate-pulse">Crafting viral narrative</p>
                        </div>
                      ) : generatedContent ? (
                        <div className="space-y-8 lg:space-y-12">
                          {/* Virality Score Card */}
                          <div className="flex flex-col md:flex-row gap-4 lg:gap-6">
                            <div className="glass-card p-5 lg:p-6 rounded-2xl flex-shrink-0 flex flex-col items-center justify-center min-w-[140px] lg:min-w-[160px] border-accent2/20">
                              <div className="text-3xl lg:text-4xl font-display font-black text-accent2 mb-1">{generatedContent.virality_score}%</div>
                              <div className="text-[9px] font-mono uppercase tracking-widest text-muted">Virality Score</div>
                            </div>
                            <div className="glass-card p-5 lg:p-6 rounded-2xl flex-grow bg-white/2 border-white/5">
                              <div className="flex items-center gap-2 mb-2 lg:mb-3">
                                <Zap size={14} className="text-accent2" />
                                <span className="text-[10px] font-mono uppercase tracking-widest text-muted">Strategist Insight</span>
                              </div>
                              <p className="text-xs lg:text-sm text-muted font-light leading-relaxed italic">
                                "{generatedContent.virality_reason}"
                              </p>
                            </div>
                          </div>

                          {/* Main Content */}
                          <div className="markdown-body font-light leading-relaxed text-base lg:text-lg bg-white/2 p-6 lg:p-8 rounded-2xl lg:rounded-3xl border border-white/5">
                            <ReactMarkdown>
                              {getPlatformContentString()}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted/20 text-center space-y-6">
                          <PenTool size={64} strokeWidth={1} />
                          <p className="font-mono text-[10px] tracking-[0.2em] uppercase">Ready for input</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {activeTab === 'repurpose' && (
            <motion.section
              key="repurpose"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-12"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12">
                <div className="space-y-6 lg:space-y-8">
                  <div className="glass-card p-6 lg:p-8 rounded-2xl space-y-6 lg:space-y-8">
                    <h3 className="font-display text-lg lg:text-xl font-bold tracking-tight flex items-center gap-3">
                      <Repeat className="text-accent2" size={20} /> Content Repurposer
                    </h3>
                    
                    <div className="space-y-3">
                      <label className="font-mono text-[9px] text-muted uppercase tracking-[0.2em]">Source Material</label>
                      <textarea 
                        value={sourceText}
                        onChange={(e) => setSourceText(e.target.value)}
                        placeholder="Paste a blog post, article, or video transcript here to generate a 3-post viral campaign..."
                        className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-xl focus:outline-none focus:border-accent2 transition-all text-sm min-h-[200px] resize-none placeholder:text-muted/50"
                      />
                    </div>

                    <button 
                      onClick={handleRepurpose}
                      disabled={isRepurposing || !sourceText}
                      className="w-full flex items-center justify-center gap-3 bg-white hover:bg-white/90 text-black py-5 rounded-xl font-bold transition-all disabled:opacity-50 mt-6 shadow-xl shadow-white/5"
                    >
                      {isRepurposing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                      <span className="tracking-widest text-[11px] uppercase">{isRepurposing ? 'ANALYZING...' : 'GENERATE CAMPAIGN'}</span>
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div className="glass-card rounded-2xl min-h-[400px] lg:min-h-[600px] flex flex-col overflow-hidden">
                    <div className="border-b border-white/5 px-6 lg:px-8 py-4 lg:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/5 gap-4 sm:gap-0">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent2 shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
                        <span className="font-mono text-[9px] text-muted uppercase tracking-[0.2em]">Generated Campaign</span>
                      </div>
                    </div>
                    <div className="p-6 lg:p-10 flex-grow overflow-auto">
                      {isRepurposing ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted space-y-6 py-12 lg:py-0">
                          <Loader2 className="animate-spin text-accent2 w-8 h-8 lg:w-10 lg:h-10" />
                          <p className="font-mono text-[10px] tracking-[0.3em] uppercase animate-pulse">Extracting Insights</p>
                        </div>
                      ) : repurposedPosts.length > 0 ? (
                        <div className="space-y-8">
                          {repurposedPosts.map((post, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                              <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-mono uppercase tracking-widest text-accent2 bg-accent2/10 px-3 py-1 rounded-full">{post.platform}</span>
                                <button 
                                  onClick={() => navigator.clipboard.writeText(post.content)}
                                  className="text-muted hover:text-white text-[10px] font-mono tracking-widest transition-colors"
                                >
                                  COPY
                                </button>
                              </div>
                              <h4 className="font-bold text-lg mb-3">{post.topic}</h4>
                              <div className="whitespace-pre-wrap text-sm text-muted/90 font-light leading-relaxed">
                                {post.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted/20 text-center space-y-6">
                          <Repeat size={64} strokeWidth={1} />
                          <p className="font-mono text-[10px] tracking-[0.2em] uppercase">Paste content to repurpose</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {activeTab === 'image' && (
            <motion.section
              key="image"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-12"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                <div className="space-y-6 lg:space-y-8">
                  <div className="glass-card p-6 lg:p-10 rounded-2xl lg:rounded-3xl space-y-6 lg:space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-accent2/10 flex items-center justify-center">
                        <ImageIcon className="text-accent2 w-5 h-5 lg:w-6 lg:h-6" />
                      </div>
                      <h3 className="font-display text-xl lg:text-2xl font-bold tracking-tight">Free Image Generation</h3>
                    </div>

                    <div className="space-y-4">
                      <label className="font-mono text-[9px] text-muted uppercase tracking-[0.2em]">Image Prompt</label>
                      <textarea 
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        placeholder="Describe the viral image you want to create... (e.g., A futuristic workspace with neon lighting and high-tech gadgets)"
                        className="w-full bg-white/5 border border-white/10 px-5 lg:px-6 py-4 lg:py-5 rounded-xl lg:rounded-2xl focus:outline-none focus:border-accent2 transition-all text-sm min-h-[120px] lg:min-h-[150px] resize-none"
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="font-mono text-[9px] text-muted uppercase tracking-[0.2em]">Aspect Ratio</label>
                      <div className="grid grid-cols-3 gap-4">
                        {(['1:1', '16:9', '9:16'] as const).map((ratio) => (
                          <button
                            key={ratio}
                            onClick={() => setImageAspectRatio(ratio)}
                            className={cn(
                              "py-3 rounded-xl border text-[10px] font-bold tracking-widest transition-all",
                              imageAspectRatio === ratio 
                                ? "bg-white text-black border-white" 
                                : "bg-white/5 text-muted border-white/10 hover:bg-white/10"
                            )}
                          >
                            {ratio}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={handleGenerateImage}
                      disabled={isGeneratingImage || !imagePrompt}
                      className="w-full flex items-center justify-center gap-3 bg-white hover:bg-white/90 text-black py-5 rounded-2xl font-bold transition-all disabled:opacity-50 shadow-xl shadow-white/5"
                    >
                      {isGeneratingImage ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                      <span className="tracking-widest text-[11px] uppercase">{isGeneratingImage ? 'GENERATING...' : 'GENERATE FREE IMAGE'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-6 lg:gap-8">
                  <div className={cn(
                    "glass-card rounded-2xl lg:rounded-3xl overflow-hidden relative flex items-center justify-center bg-black/40 min-h-[300px] lg:min-h-[400px]",
                    imageAspectRatio === '9:16' ? 'aspect-[9/16] max-h-[500px] lg:max-h-[700px]' : imageAspectRatio === '16:9' ? 'aspect-[16/9]' : 'aspect-square'
                  )}>
                    {isGeneratingImage ? (
                      <div className="text-center space-y-4">
                        <Loader2 className="animate-spin text-accent2 mx-auto" size={48} strokeWidth={1} />
                        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-white animate-pulse">Creating Masterpiece</p>
                      </div>
                    ) : generatedImageUrl ? (
                      <img 
                        src={generatedImageUrl} 
                        alt="Generated Viral Content" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-center space-y-6 text-muted/20">
                        <ImageIcon size={80} strokeWidth={1} />
                        <p className="font-mono text-[10px] tracking-[0.2em] uppercase">Image Preview Area</p>
                      </div>
                    )}

                    {generatedImageUrl && !isGeneratingImage && (
                      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                        <a 
                          href={generatedImageUrl} 
                          download="viral-image.png"
                          className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 text-[10px] tracking-widest uppercase"
                        >
                          <Download size={16} /> DOWNLOAD
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.section>
          )}
          {activeTab === 'video' && (
            <motion.section
              key="video"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-12"
            >
              {error && (
                <div className="glass-card border-red-500/20 bg-red-500/5 p-6 rounded-2xl flex items-center gap-4 text-red-400">
                  <AlertCircle size={20} />
                  <p className="text-sm font-light">{error}</p>
                  <button onClick={() => setError(null)} className="ml-auto hover:text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>
              )}
              {!hasApiKey ? (
                <div className="text-center py-16 lg:py-32 glass-card rounded-2xl lg:rounded-3xl border border-white/5 relative overflow-hidden px-6">
                  <div className="absolute inset-0 bg-gradient-to-b from-accent/10 to-transparent pointer-events-none" />
                  <Key strokeWidth={1} className="mx-auto text-accent mb-6 lg:mb-8 w-12 h-12 lg:w-16 lg:h-16" />
                  <h2 className="font-display text-2xl lg:text-4xl font-extrabold mb-4 tracking-tight">API Key Required</h2>
                  <p className="text-muted max-w-lg mx-auto mb-8 lg:mb-12 text-base lg:text-lg font-light leading-relaxed">
                    Video generation requires a paid Google Cloud project API key. Please select your key to continue.
                  </p>
                  <button 
                    onClick={handleOpenKeyDialog}
                    className="bg-white hover:bg-white/90 text-black px-8 lg:px-10 py-4 lg:py-5 rounded-xl lg:rounded-2xl font-bold transition-all inline-flex items-center gap-3 shadow-xl shadow-white/5"
                  >
                    <span className="tracking-widest text-[10px] lg:text-[11px] uppercase">SELECT API KEY</span> <ArrowRight className="w-4 h-4 lg:w-[18px] lg:h-[18px]" />
                  </button>
                  <p className="mt-6 text-xs text-muted">
                    Learn more about <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-white">Gemini API billing</a>.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                  <div className="space-y-6 lg:space-y-8">
                    <div className="glass-card p-6 lg:p-10 rounded-2xl lg:rounded-3xl space-y-6 lg:space-y-8">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-accent3/10 flex items-center justify-center">
                            <Video className="text-accent3 w-5 h-5 lg:w-6 lg:h-6" />
                          </div>
                          <h3 className="font-display text-xl lg:text-2xl font-bold tracking-tight">Video Generation</h3>
                        </div>
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-full sm:w-auto">
                          <button 
                            onClick={() => setVideoMode('free')}
                            className={cn(
                              "flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-mono tracking-widest transition-all",
                              videoMode === 'free' ? "bg-white text-black" : "text-muted hover:text-white"
                            )}
                          >
                            FREE
                          </button>
                          <button 
                            onClick={() => setVideoMode('premium')}
                            className={cn(
                              "flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-mono tracking-widest transition-all",
                              videoMode === 'premium' ? "bg-white text-black" : "text-muted hover:text-white"
                            )}
                          >
                            PREMIUM
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="font-mono text-[9px] text-muted uppercase tracking-[0.2em]">Video Prompt</label>
                        <textarea 
                          value={videoPrompt}
                          onChange={(e) => setVideoPrompt(e.target.value)}
                          placeholder={videoMode === 'free' ? "Describe your viral video topic..." : "Describe the video you want to generate... (e.g., A neon hologram of a cat driving at top speed)"}
                          className="w-full bg-white/5 border border-white/10 px-5 lg:px-6 py-4 lg:py-5 rounded-xl lg:rounded-2xl focus:outline-none focus:border-accent3 transition-all text-sm min-h-[120px] lg:min-h-[150px] resize-none"
                        />
                      </div>

                      {videoMode === 'premium' && (
                        <div className="space-y-4">
                          <label className="font-mono text-[9px] text-muted uppercase tracking-[0.2em]">Video Duration</label>
                          <select 
                            value={videoDuration}
                            onChange={(e) => setVideoDuration(Number(e.target.value) as 5 | 12 | 30)}
                            className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-xl focus:outline-none focus:border-accent3 transition-all text-sm appearance-none text-white cursor-pointer"
                          >
                            <option value={5}>5s (Standard)</option>
                            <option value={12}>12s (Extended)</option>
                            <option value={30}>30s (Viral Length)</option>
                          </select>
                        </div>
                      )}

                      <div className="bg-white/5 border border-white/10 p-6 rounded-2xl">
                        <div className="flex items-center gap-3 mb-3">
                          <Sparkles className="text-accent2" size={16} />
                          <span className="text-[10px] font-mono uppercase tracking-widest text-muted">{videoMode === 'free' ? 'Free Engine' : 'Premium Engine'}</span>
                        </div>
                        <ul className="text-xs text-muted space-y-2 font-light">
                          {videoMode === 'free' ? (
                            <>
                              <li>• Uses browser TTS for voiceover (100% Free).</li>
                              <li>• Generates viral scripts and B-roll concepts.</li>
                              <li>• Perfect for quick social media hooks.</li>
                            </>
                          ) : (
                            <>
                              <li>• Uses Gemini Veo for high-fidelity video synthesis.</li>
                              <li>• Requires a paid Google Cloud API key.</li>
                              <li>• Cinematic quality with temporal consistency.</li>
                            </>
                          )}
                        </ul>
                      </div>

                      <button 
                        onClick={handleGenerateVideo}
                        disabled={isGeneratingVideo || !videoPrompt}
                        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-white/90 text-black py-5 rounded-2xl font-bold transition-all disabled:opacity-50 shadow-xl shadow-white/5"
                      >
                        {isGeneratingVideo ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
                        <span className="tracking-widest text-[11px] uppercase">{isGeneratingVideo ? 'GENERATING...' : `GENERATE ${videoMode.toUpperCase()} VIDEO`}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6 lg:gap-8">
                    <div className="glass-card rounded-2xl lg:rounded-3xl aspect-[9/16] max-h-[500px] lg:max-h-[700px] overflow-hidden relative flex items-center justify-center bg-black/40">
                      {isGeneratingVideo ? (
                        <div className="text-center space-y-6 px-6 lg:px-10">
                          <div className="relative">
                            <Loader2 className="animate-spin text-accent3 mx-auto w-12 h-12 lg:w-16 lg:h-16" strokeWidth={1} />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-6 h-6 lg:w-8 lg:h-8 bg-accent3/20 rounded-full animate-ping" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-white animate-pulse">
                              {videoMode === 'free' ? 'Generating Assets' : 'Synthesizing Pixels'}
                            </p>
                            <p className="text-[10px] lg:text-xs text-muted font-light">This usually takes about 30-60 seconds...</p>
                          </div>
                        </div>
                      ) : videoMode === 'free' && freeVideoAssets ? (
                        <FreeVideoPlayer assets={freeVideoAssets} pexelsApiKey={apiKeys.pexelsApiKey} />
                      ) : generatedVideoUrl ? (
                        <video 
                          src={generatedVideoUrl} 
                          controls 
                          className="w-full h-full object-cover"
                          autoPlay
                          loop
                        />
                      ) : (
                        <div className="text-center space-y-6 text-muted/20">
                          <Video size={80} strokeWidth={1} />
                          <p className="font-mono text-[10px] tracking-[0.2em] uppercase">Video Preview Area</p>
                        </div>
                      )}

                      {generatedVideoUrl && !isGeneratingVideo && (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
                          <a 
                            href={generatedVideoUrl} 
                            download="viral-video.mp4"
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 text-[10px] tracking-widest uppercase"
                          >
                            <Download size={16} /> DOWNLOAD
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.section>
          )}

          {activeTab === 'preview' && (
            <motion.section
              key="preview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6 lg:space-y-12"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h2 className="font-display text-2xl lg:text-4xl font-extrabold mb-2 md:mb-3 tracking-tight">Preview & Verify</h2>
                  <p className="text-muted text-xs lg:text-base font-light">Review how your post looks on {selectedPlatform} before publishing.</p>
                </div>
                  <div className="flex flex-wrap gap-3 md:gap-4">
                    <button 
                      onClick={() => setActiveTab('write')}
                      className="flex-grow md:flex-grow-0 bg-white/5 border border-white/10 text-white px-4 md:px-6 py-3 md:py-4 rounded-xl font-bold transition-all hover:bg-white/10 text-[10px] md:text-[11px] tracking-widest uppercase"
                    >
                      EDIT CONTENT
                    </button>
                    <button 
                      onClick={() => setShowScheduleModal(true)}
                      disabled={isPublished || !generatedContent}
                      className="flex-grow md:flex-grow-0 flex items-center justify-center gap-2 bg-accent/10 border border-accent/20 text-accent px-4 md:px-6 py-3 md:py-4 rounded-xl font-bold transition-all disabled:opacity-50 text-[10px] md:text-[11px] tracking-widest uppercase"
                    >
                      <Clock size={14} />
                      SCHEDULE
                    </button>
                    <button 
                      onClick={() => handlePublish(false)}
                      disabled={isPublished || !generatedContent}
                      className="w-full md:w-auto flex items-center justify-center gap-2 bg-white hover:bg-white/90 text-black px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold transition-all disabled:opacity-50 text-[10px] md:text-[11px] tracking-widest uppercase shadow-xl shadow-white/5"
                    >
                      {isPublished ? <Loader2 className="animate-spin" size={14} /> : <Share2 size={14} />}
                      {isPublished ? 'PUBLISHING...' : 'PUBLISH NOW'}
                    </button>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
                {/* Mockup */}
                <div className="flex justify-center items-start overflow-hidden">
                  {selectedPlatform === 'Twitter' && generatedContent?.posts.twitter && (
                    <div className="w-full max-w-md bg-white text-black p-5 lg:p-8 rounded-2xl lg:rounded-3xl shadow-2xl">
                      <div className="flex gap-3 lg:gap-4 mb-4 lg:mb-6">
                        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gray-100 border border-gray-200" />
                        <div>
                          <div className="font-bold text-sm lg:text-base">ViralFlow AI</div>
                          <div className="text-gray-500 text-[10px] lg:text-sm">@viralflow_ai · 1m</div>
                        </div>
                      </div>
                      <div className="text-sm lg:text-lg leading-relaxed mb-4 lg:mb-6 whitespace-pre-wrap font-light">
                        {generatedContent.posts.twitter.hook}
                      </div>
                      <div className="text-blue-500 mb-4 lg:mb-6 font-medium text-xs lg:text-base">
                        {generatedContent.posts.twitter.body.substring(0, 100)}...
                      </div>
                      <div className="flex justify-between text-gray-400 border-t border-gray-100 pt-4 lg:pt-6">
                        <Share2 className="w-4 h-4 lg:w-[18px] lg:h-[18px]" />
                        <TrendingUp className="w-4 h-4 lg:w-[18px] lg:h-[18px]" />
                        <Zap className="w-4 h-4 lg:w-[18px] lg:h-[18px]" />
                        <Search className="w-4 h-4 lg:w-[18px] lg:h-[18px]" />
                      </div>
                    </div>
                  )}

                  {selectedPlatform === 'Instagram' && generatedContent?.posts.instagram && (
                    <div className="relative w-full max-w-[320px] aspect-[9/18] bg-black rounded-[2.5rem] md:rounded-[3.5rem] border-[8px] md:border-[12px] border-white/10 shadow-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/80" />
                      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 space-y-4 md:space-y-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 border border-white/40 backdrop-blur-md" />
                          <div className="font-bold text-white text-xs md:text-sm">@viralflow_ai</div>
                        </div>
                        <p className="text-white text-xs md:text-sm line-clamp-4 leading-relaxed font-light">
                          <span className="font-bold text-accent2">{generatedContent.posts.instagram.hook}</span> {generatedContent.posts.instagram.body}
                        </p>
                        <div className="flex items-center gap-2 text-white/70 text-[9px] md:text-[10px] font-mono tracking-wider">
                          <Sparkles className="w-2.5 h-2.5" /> Original Audio - ViralFlow AI
                        </div>
                      </div>
                      <div className="absolute right-4 md:right-6 bottom-24 md:bottom-32 flex flex-col gap-6 md:gap-8 text-white/90">
                        <div className="flex flex-col items-center gap-1"><Zap className="w-[22px] h-[22px] md:w-[26px] md:h-[26px]" /><span className="text-[8px] md:text-[10px] font-bold">12.4K</span></div>
                        <div className="flex flex-col items-center gap-1"><Share2 className="w-[22px] h-[22px] md:w-[26px] md:h-[26px]" /><span className="text-[8px] md:text-[10px] font-bold">2.1K</span></div>
                        <div className="flex flex-col items-center gap-1"><TrendingUp className="w-[22px] h-[22px] md:w-[26px] md:h-[26px]" /><span className="text-[8px] md:text-[10px] font-bold">842</span></div>
                      </div>
                    </div>
                  )}

                  {selectedPlatform === 'LinkedIn' && generatedContent?.posts.linkedin && (
                    <div className="w-full max-w-xl bg-white text-black p-6 md:p-10 rounded-xl md:rounded-2xl shadow-2xl border border-gray-100">
                      <div className="flex gap-4 md:gap-5 mb-6 md:mb-8">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg md:rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-2xl md:text-3xl">V</div>
                        <div>
                          <div className="font-bold text-lg md:text-xl">ViralFlow AI</div>
                          <div className="text-gray-500 text-xs md:text-sm">Automated Content Strategist</div>
                          <div className="text-gray-400 text-[10px] md:text-xs">1m · Edited</div>
                        </div>
                      </div>
                      <div className="text-sm md:text-base leading-relaxed mb-6 md:mb-8 whitespace-pre-wrap font-light text-gray-800">
                        <p className="font-bold text-black mb-2 md:mb-3 text-base md:text-lg">{generatedContent.posts.linkedin.hook}</p>
                        {generatedContent.posts.linkedin.body}
                        <p className="font-bold text-blue-600 mt-4 md:mt-6 text-base md:text-lg">{generatedContent.posts.linkedin.cta}</p>
                      </div>
                      <div className="flex flex-wrap gap-4 md:gap-8 text-gray-400 font-bold text-xs md:text-sm border-t border-gray-100 pt-4 md:pt-6">
                        <span className="hover:text-blue-600 cursor-pointer transition-colors">Like</span>
                        <span className="hover:text-blue-600 cursor-pointer transition-colors">Comment</span>
                        <span className="hover:text-blue-600 cursor-pointer transition-colors">Repost</span>
                        <span className="hover:text-blue-600 cursor-pointer transition-colors">Send</span>
                      </div>
                    </div>
                  )}

                  {selectedPlatform === 'Facebook' && generatedContent?.posts.facebook && (
                    <div className="w-full max-w-xl bg-white text-black p-6 md:p-10 rounded-xl md:rounded-2xl shadow-2xl border border-gray-100">
                      <div className="flex gap-4 md:gap-5 mb-6 md:mb-8">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-2xl md:text-3xl">V</div>
                        <div>
                          <div className="font-bold text-lg md:text-xl">ViralFlow AI</div>
                          <div className="text-gray-500 text-xs md:text-sm">1m · 🌎</div>
                        </div>
                      </div>
                      <div className="text-sm md:text-base leading-relaxed mb-6 md:mb-8 whitespace-pre-wrap font-light text-gray-800">
                        <p className="font-bold text-black mb-2 md:mb-3 text-base md:text-lg">{generatedContent.posts.facebook.hook}</p>
                        {generatedContent.posts.facebook.body}
                        <p className="font-bold text-blue-600 mt-4 md:mt-6 text-base md:text-lg">{generatedContent.posts.facebook.cta}</p>
                      </div>
                      <div className="flex flex-wrap gap-4 md:gap-8 text-gray-400 font-bold text-xs md:text-sm border-t border-gray-100 pt-4 md:pt-6">
                        <span className="hover:text-blue-600 cursor-pointer transition-colors">Like</span>
                        <span className="hover:text-blue-600 cursor-pointer transition-colors">Comment</span>
                        <span className="hover:text-blue-600 cursor-pointer transition-colors">Share</span>
                      </div>
                    </div>
                  )}

                  {selectedPlatform === 'Telegram' && generatedContent?.posts.telegram && (
                    <div className="w-full max-w-md bg-[#1c242f] text-white p-4 md:p-6 rounded-2xl shadow-2xl border border-white/5 relative">
                      <div className="absolute top-0 left-0 right-0 h-14 bg-[#232e3c] rounded-t-2xl flex items-center px-4 gap-3 border-b border-white/5">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">VF</div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">ViralFlow Insider</span>
                          <span className="text-[10px] text-blue-400">12.4K subscribers</span>
                        </div>
                      </div>
                      <div className="mt-14 bg-[#2b5278] rounded-xl p-4 md:p-5 relative">
                        <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-light">
                          <p className="font-bold mb-3 text-base">{generatedContent.posts.telegram.hook}</p>
                          {generatedContent.posts.telegram.body}
                          <p className="font-bold mt-4 text-blue-300">{generatedContent.posts.telegram.cta}</p>
                        </div>
                        <div className="absolute bottom-1 right-2 text-[10px] text-white/50 flex items-center gap-1">
                          10:42 AM <span className="text-blue-400">✓✓</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {(!generatedContent) && (
                    <div className="text-center py-32 glass-card rounded-3xl w-full">
                      <Search size={48} strokeWidth={1} className="mx-auto text-muted mb-6" />
                      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted">Generate content to see a preview</p>
                    </div>
                  )}
                </div>

                {/* Verification Checklist */}
                <div className="space-y-6 lg:space-y-8">
                  <div className="glass-card p-6 lg:p-10 rounded-2xl lg:rounded-3xl">
                    <h3 className="font-display text-xl lg:text-2xl font-bold mb-6 lg:mb-8 tracking-tight">Verification Checklist</h3>
                    <div className="space-y-4 lg:space-y-5">
                      {[
                        { id: 'hook', label: "Hook is strong and visible in first 3 lines" },
                        { id: 'pattern', label: "No grammatical errors or AI hallucinations" },
                        { id: 'cta', label: "Call to action is clear and compelling" },
                        { id: 'data', label: "Hashtags are relevant and not excessive" },
                        { id: 'voice', label: "Tone matches your brand voice" },
                        { id: 'mobile', label: "Formatting is clean and scannable" }
                      ].map((item) => (
                        <label key={item.id} className="flex items-center gap-4 lg:gap-5 cursor-pointer group">
                          <div className="relative flex items-center justify-center">
                            <input 
                              type="checkbox" 
                              checked={checklist[item.id as keyof typeof checklist]}
                              onChange={() => setChecklist(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof checklist] }))}
                              className="peer w-5 h-5 lg:w-6 lg:h-6 rounded-lg border-white/10 bg-white/5 text-accent2 focus:ring-accent2 transition-all appearance-none border checked:bg-accent2 checked:border-accent2" 
                            />
                            <div className="absolute text-black opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity">
                              <svg className="w-2.5 h-2.5 lg:w-3 lg:h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                          </div>
                          <span className={cn(
                            "text-sm lg:text-base transition-all duration-300",
                            checklist[item.id as keyof typeof checklist] ? "text-accent2 line-through opacity-40" : "text-muted group-hover:text-text"
                          )}>
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="bg-accent2/5 border border-accent2/10 p-6 lg:p-8 rounded-2xl lg:rounded-3xl backdrop-blur-sm">
                    <div className="flex items-center gap-4 mb-4 lg:mb-5">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-accent2/10 flex items-center justify-center">
                        <Zap className="text-accent2 w-4 h-4 lg:w-5 lg:h-5" />
                      </div>
                      <h4 className="font-bold text-xs lg:text-sm tracking-widest uppercase">AI Optimization Tip</h4>
                    </div>
                    <p className="text-muted text-sm lg:text-base leading-relaxed font-light">
                      Based on current {selectedPlatform} algorithm data, adding a question at the end of this post could increase engagement by up to 24%.
                    </p>
                  </div>

                  <div className="glass-card p-6 lg:p-8 rounded-2xl lg:rounded-3xl flex items-center justify-between">
                    <div className="flex items-center gap-4 lg:gap-5">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-white/5 flex items-center justify-center">
                        <Clock className="text-accent2 w-5 h-5 lg:w-6 lg:h-6" />
                      </div>
                      <div>
                        <div className="text-xl lg:text-2xl font-bold tracking-tight">
                          {generatedContent?.best_posting_time || '09:45 AM'}
                        </div>
                        <div className="text-[8px] lg:text-[9px] text-muted uppercase tracking-[0.2em] font-mono">Best Posting Time</div>
                      </div>
                    </div>
                    <div className="text-[8px] lg:text-[10px] text-muted/50 font-mono uppercase tracking-widest">Local Time Zone</div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {activeTab === 'settings' && (
            <motion.section
              key="settings"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8 lg:space-y-12"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                <div className="lg:col-span-2 space-y-8 lg:space-y-12">
                  <div className="glass-card p-6 lg:p-10 rounded-2xl lg:rounded-3xl space-y-8 lg:space-y-10">
                    <h3 className="font-display text-2xl lg:text-3xl font-extrabold flex items-center gap-4 tracking-tight">
                      <ShieldCheck className="text-accent2 w-6 h-6 lg:w-8 lg:h-8" /> Brand Identity
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                      <div className="space-y-3">
                        <label className="font-mono text-[9px] text-muted uppercase tracking-[0.2em]">Brand Voice</label>
                        <textarea 
                          value={brandVoice}
                          onChange={(e) => setBrandVoice(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-xl focus:outline-none focus:border-accent2 transition-all text-sm min-h-[100px] resize-none"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="font-mono text-[9px] text-muted uppercase tracking-[0.2em]">Target Audience</label>
                        <input 
                          type="text" 
                          value={targetAudience}
                          onChange={(e) => setTargetAudience(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-xl focus:outline-none focus:border-accent2 transition-all text-sm"
                        />
                      </div>
                    </div>

                    <div className="pt-8 lg:pt-10 border-t border-white/5 space-y-6">
                      <h4 className="font-display text-lg font-bold flex items-center gap-3 tracking-tight">
                        <MessageSquare className="text-accent w-5 h-5" /> Personal Brand Voice Trainer
                      </h4>
                      <p className="text-xs text-muted font-light">Paste 3-5 of your best performing posts below. AI will analyze them and update your Brand Voice profile to sound exactly like you.</p>
                      <div className="space-y-4">
                        <textarea 
                          value={voiceSamples}
                          onChange={(e) => setVoiceSamples(e.target.value)}
                          placeholder="Paste your past posts here..."
                          className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-xl focus:outline-none focus:border-accent transition-all text-sm min-h-[120px] resize-none"
                        />
                        <button 
                          onClick={handleTrainVoice}
                          disabled={isTrainingVoice || !voiceSamples}
                          className="flex items-center justify-center gap-2 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 text-[10px] tracking-widest uppercase"
                        >
                          {isTrainingVoice ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                          {isTrainingVoice ? 'ANALYZING VOICE...' : 'TRAIN BRAND VOICE'}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 pt-8 lg:pt-10 border-t border-white/5">
                      <div className="space-y-3">
                        <label className="font-mono text-[9px] text-muted uppercase tracking-[0.2em]">Content Length</label>
                        <select 
                          value={contentLength}
                          onChange={(e) => setContentLength(e.target.value as any)}
                          className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-xl focus:outline-none focus:border-accent2 transition-all text-sm appearance-none"
                        >
                          <option value="short">Short (Punchy)</option>
                          <option value="medium">Medium (Standard)</option>
                          <option value="long">Long (Deep Dive)</option>
                        </select>
                      </div>
                      <div className="space-y-3">
                        <label className="font-mono text-[9px] text-muted uppercase tracking-[0.2em]">Emoji Density</label>
                        <select 
                          value={emojiDensity}
                          onChange={(e) => setEmojiDensity(e.target.value as any)}
                          className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-xl focus:outline-none focus:border-accent2 transition-all text-sm appearance-none"
                        >
                          <option value="none">None (Formal)</option>
                          <option value="minimal">Minimal (Clean)</option>
                          <option value="viral">Viral (Heavy)</option>
                        </select>
                      </div>
                      <div className="space-y-3 flex flex-col justify-end">
                        <label className="flex items-center gap-4 cursor-pointer group pb-2 lg:pb-4">
                          <input 
                            type="checkbox" 
                            checked={autoOptimize}
                            onChange={() => setAutoOptimize(!autoOptimize)}
                            className="w-6 h-6 rounded-lg border-white/10 bg-white/5 text-accent2 focus:ring-accent2" 
                          />
                          <span className="text-xs text-muted group-hover:text-text transition-colors font-light">Auto-Optimize for Algorithm</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Schedule Queue */}
                  <div className="glass-card p-6 lg:p-10 rounded-2xl lg:rounded-3xl space-y-6 lg:space-y-8">
                    <h3 className="font-display text-2xl lg:text-3xl font-extrabold flex items-center gap-4 tracking-tight">
                      <Calendar className="text-accent2 w-6 h-6 lg:w-8 lg:h-8" /> Schedule Queue
                    </h3>
                    <div className="space-y-4">
                      {scheduledPosts.length === 0 ? (
                        <div className="py-8 lg:py-12 text-center bg-white/2 border border-dashed border-white/5 rounded-xl lg:rounded-2xl">
                          <p className="text-muted text-sm italic font-light">No posts scheduled for the next week/month.</p>
                        </div>
                      ) : (
                        scheduledPosts.map((post) => (
                          <div key={post.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 lg:p-6 bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl hover:border-white/20 transition-all gap-4">
                            <div className="space-y-2">
                              <div className="text-base font-bold">{post.topic}</div>
                              <div className="flex flex-wrap items-center gap-3 lg:gap-4 text-[9px] lg:text-[10px] text-muted uppercase tracking-[0.1em] font-mono">
                                <span className="text-accent font-bold">{post.platform}</span>
                                <span className="opacity-30 hidden sm:inline">•</span>
                                <span>Scheduled: {new Date(post.scheduledDate).toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="self-start sm:self-center px-3 py-1.5 bg-accent/10 border border-accent/20 text-accent text-[9px] lg:text-[10px] font-bold rounded-lg uppercase tracking-widest">
                              {post.status}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Content Archive */}
                  <div className="glass-card p-6 lg:p-10 rounded-2xl lg:rounded-3xl space-y-6 lg:space-y-8">
                    <h3 className="font-display text-2xl lg:text-3xl font-extrabold flex items-center gap-4 tracking-tight">
                      <Clock className="text-accent w-6 h-6 lg:w-8 lg:h-8" /> Content Archive
                    </h3>
                    <div className="space-y-4">
                      {archive.length === 0 ? (
                        <div className="py-8 lg:py-12 text-center bg-white/2 border border-dashed border-white/5 rounded-xl lg:rounded-2xl">
                          <p className="text-muted text-sm italic font-light">No generated content yet.</p>
                        </div>
                      ) : (
                        archive.map((item, i) => (
                          <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 lg:p-6 bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl hover:border-accent/30 transition-all group cursor-pointer gap-4">
                            <div className="space-y-2">
                              <div className="text-base font-bold">{item.topic}</div>
                              <div className="flex flex-wrap items-center gap-3 lg:gap-4 text-[9px] lg:text-[10px] text-muted uppercase tracking-[0.1em] font-mono">
                                <span className="text-accent2 font-bold">{item.platform}</span>
                                <span className="opacity-30 hidden sm:inline">•</span>
                                <span>{item.date}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                setGeneratedContent(item.content);
                                setSelectedPlatform(item.platform as any);
                                setActiveTab('preview');
                              }}
                              className="self-start sm:self-center text-accent opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all hover:underline text-[9px] lg:text-[10px] font-mono tracking-widest uppercase font-bold"
                            >
                              RESTORE
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-8 lg:space-y-12">
                  <div className="glass-card p-6 lg:p-10 rounded-2xl lg:rounded-3xl space-y-6 lg:space-y-8">
                    <h3 className="font-display text-xl lg:text-2xl font-extrabold flex items-center gap-4 tracking-tight">
                      <Globe className="text-accent3 w-6 h-6 lg:w-7 lg:h-7" /> Connections & API Keys
                    </h3>
                    <p className="text-xs text-muted font-light">Configure your social accounts and media providers to enable direct publishing and premium asset generation.</p>
                    
                    <div className="space-y-6">
                      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Send className="text-[#0088cc] w-5 h-5" />
                            <h4 className="font-bold text-sm">Telegram</h4>
                          </div>
                          {validationStatus.telegramBotToken && (
                            <span className={cn(
                              "text-[10px] font-mono px-2 py-0.5 rounded-full",
                              validationStatus.telegramBotToken.status === 'valid' ? "bg-green-500/20 text-green-400" :
                              validationStatus.telegramBotToken.status === 'invalid' ? "bg-red-500/20 text-red-400" :
                              "bg-blue-500/20 text-blue-400 animate-pulse"
                            )}>
                              {validationStatus.telegramBotToken.status === 'validating' ? 'VALIDATING...' : 
                               validationStatus.telegramBotToken.status === 'valid' ? 'VALID' : 
                               validationStatus.telegramBotToken.message || 'INVALID'}
                            </span>
                          )}
                        </div>
                        <input 
                          type="password" 
                          placeholder="Bot Token (e.g., 123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11)" 
                          value={apiKeys.telegramBotToken}
                          onChange={(e) => updateApiKey('telegramBotToken', e.target.value)}
                          className={cn(
                            "w-full bg-black/20 border px-4 py-3 rounded-xl text-xs focus:outline-none transition-all",
                            validationStatus.telegramBotToken?.status === 'invalid' ? "border-red-500/50" : "border-white/10 focus:border-accent3"
                          )}
                        />
                        <input 
                          type="text" 
                          placeholder="Chat ID (e.g., @mychannel or -1001234567890)" 
                          value={apiKeys.telegramChatId}
                          onChange={(e) => updateApiKey('telegramChatId', e.target.value)}
                          className="w-full bg-black/20 border border-white/10 px-4 py-3 rounded-xl text-xs focus:outline-none focus:border-accent3 transition-all"
                        />
                      </div>

                      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 3.827H5.078z"/></svg>
                            <h4 className="font-bold text-sm">X (Twitter)</h4>
                          </div>
                          {validationStatus.twitterApiKey && (
                            <span className={cn(
                              "text-[10px] font-mono px-2 py-0.5 rounded-full",
                              validationStatus.twitterApiKey.status === 'valid' ? "bg-green-500/20 text-green-400" :
                              validationStatus.twitterApiKey.status === 'invalid' ? "bg-red-500/20 text-red-400" :
                              "bg-blue-500/20 text-blue-400 animate-pulse"
                            )}>
                              {validationStatus.twitterApiKey.status === 'validating' ? 'VALIDATING...' : 
                               validationStatus.twitterApiKey.status === 'valid' ? 'VALID' : 
                               validationStatus.twitterApiKey.message || 'INVALID'}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input 
                            type="password" placeholder="API Key" value={apiKeys.twitterApiKey} onChange={(e) => updateApiKey('twitterApiKey', e.target.value)}
                            className={cn(
                              "w-full bg-black/20 border px-4 py-3 rounded-xl text-xs focus:outline-none transition-all",
                              validationStatus.twitterApiKey?.status === 'invalid' ? "border-red-500/50" : "border-white/10 focus:border-accent3"
                            )}
                          />
                          <input 
                            type="password" placeholder="API Secret" value={apiKeys.twitterApiSecret} onChange={(e) => updateApiKey('twitterApiSecret', e.target.value)}
                            className="w-full bg-black/20 border border-white/10 px-4 py-3 rounded-xl text-xs focus:outline-none focus:border-accent3 transition-all"
                          />
                          <input 
                            type="password" placeholder="Access Token" value={apiKeys.twitterAccessToken} onChange={(e) => updateApiKey('twitterAccessToken', e.target.value)}
                            className="w-full bg-black/20 border border-white/10 px-4 py-3 rounded-xl text-xs focus:outline-none focus:border-accent3 transition-all"
                          />
                          <input 
                            type="password" placeholder="Access Secret" value={apiKeys.twitterAccessSecret} onChange={(e) => updateApiKey('twitterAccessSecret', e.target.value)}
                            className="w-full bg-black/20 border border-white/10 px-4 py-3 rounded-xl text-xs focus:outline-none focus:border-accent3 transition-all"
                          />
                        </div>
                      </div>

                      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 fill-[#0a66c2]" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                            <h4 className="font-bold text-sm">LinkedIn</h4>
                          </div>
                          {validationStatus.linkedinAccessToken && (
                            <span className={cn(
                              "text-[10px] font-mono px-2 py-0.5 rounded-full",
                              validationStatus.linkedinAccessToken.status === 'valid' ? "bg-green-500/20 text-green-400" :
                              validationStatus.linkedinAccessToken.status === 'invalid' ? "bg-red-500/20 text-red-400" :
                              "bg-blue-500/20 text-blue-400 animate-pulse"
                            )}>
                              {validationStatus.linkedinAccessToken.status === 'validating' ? 'VALIDATING...' : 
                               validationStatus.linkedinAccessToken.status === 'valid' ? 'VALID' : 
                               validationStatus.linkedinAccessToken.message || 'INVALID'}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input 
                            type="password" placeholder="Access Token" value={apiKeys.linkedinAccessToken} onChange={(e) => updateApiKey('linkedinAccessToken', e.target.value)}
                            className={cn(
                              "w-full bg-black/20 border px-4 py-3 rounded-xl text-xs focus:outline-none transition-all",
                              validationStatus.linkedinAccessToken?.status === 'invalid' ? "border-red-500/50" : "border-white/10 focus:border-accent3"
                            )}
                          />
                          <input 
                            type="text" placeholder="Author URN (e.g., urn:li:person:12345)" value={apiKeys.linkedinAuthorUrn} onChange={(e) => updateApiKey('linkedinAuthorUrn', e.target.value)}
                            className="w-full bg-black/20 border border-white/10 px-4 py-3 rounded-xl text-xs focus:outline-none focus:border-accent3 transition-all"
                          />
                        </div>
                      </div>

                      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Youtube className="text-[#ff0000] w-5 h-5" />
                            <h4 className="font-bold text-sm">YouTube</h4>
                          </div>
                          {validationStatus.youtubeAccessToken && (
                            <span className={cn(
                              "text-[10px] font-mono px-2 py-0.5 rounded-full",
                              validationStatus.youtubeAccessToken.status === 'valid' ? "bg-green-500/20 text-green-400" :
                              validationStatus.youtubeAccessToken.status === 'invalid' ? "bg-red-500/20 text-red-400" :
                              "bg-blue-500/20 text-blue-400 animate-pulse"
                            )}>
                              {validationStatus.youtubeAccessToken.status === 'validating' ? 'VALIDATING...' : 
                               validationStatus.youtubeAccessToken.status === 'valid' ? 'VALID' : 
                               validationStatus.youtubeAccessToken.message || 'INVALID'}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input 
                            type="password" placeholder="Access Token" value={apiKeys.youtubeAccessToken} onChange={(e) => updateApiKey('youtubeAccessToken', e.target.value)}
                            className={cn(
                              "w-full bg-black/20 border px-4 py-3 rounded-xl text-xs focus:outline-none transition-all",
                              validationStatus.youtubeAccessToken?.status === 'invalid' ? "border-red-500/50" : "border-white/10 focus:border-accent3"
                            )}
                          />
                          <input 
                            type="text" placeholder="Channel ID (Optional)" value={apiKeys.youtubeChannelId} onChange={(e) => updateApiKey('youtubeChannelId', e.target.value)}
                            className="w-full bg-black/20 border border-white/10 px-4 py-3 rounded-xl text-xs focus:outline-none focus:border-accent3 transition-all"
                          />
                        </div>
                      </div>

                      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Video className="text-[#05a081] w-5 h-5" />
                            <h4 className="font-bold text-sm">Pexels (Free Video B-Roll)</h4>
                          </div>
                          {validationStatus.pexelsApiKey && (
                            <span className={cn(
                              "text-[10px] font-mono px-2 py-0.5 rounded-full",
                              validationStatus.pexelsApiKey.status === 'valid' ? "bg-green-500/20 text-green-400" :
                              validationStatus.pexelsApiKey.status === 'invalid' ? "bg-red-500/20 text-red-400" :
                              "bg-blue-500/20 text-blue-400 animate-pulse"
                            )}>
                              {validationStatus.pexelsApiKey.status === 'validating' ? 'VALIDATING...' : 
                               validationStatus.pexelsApiKey.status === 'valid' ? 'VALID' : 
                               validationStatus.pexelsApiKey.message || 'INVALID'}
                            </span>
                          )}
                        </div>
                        <input 
                          type="password" 
                          placeholder="Pexels API Key" 
                          value={apiKeys.pexelsApiKey}
                          onChange={(e) => updateApiKey('pexelsApiKey', e.target.value)}
                          className={cn(
                            "w-full bg-black/20 border px-4 py-3 rounded-xl text-xs focus:outline-none transition-all",
                            validationStatus.pexelsApiKey?.status === 'invalid' ? "border-red-500/50" : "border-white/10 focus:border-accent3"
                          )}
                        />
                      </div>
                      
                      <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <MessageSquare className="text-white w-5 h-5" />
                            <h4 className="font-bold text-sm">ElevenLabs (Premium Voice)</h4>
                          </div>
                          {validationStatus.elevenLabsApiKey && (
                            <span className={cn(
                              "text-[10px] font-mono px-2 py-0.5 rounded-full",
                              validationStatus.elevenLabsApiKey.status === 'valid' ? "bg-green-500/20 text-green-400" :
                              validationStatus.elevenLabsApiKey.status === 'invalid' ? "bg-red-500/20 text-red-400" :
                              "bg-blue-500/20 text-blue-400 animate-pulse"
                            )}>
                              {validationStatus.elevenLabsApiKey.status === 'validating' ? 'VALIDATING...' : 
                               validationStatus.elevenLabsApiKey.status === 'valid' ? 'VALID' : 
                               validationStatus.elevenLabsApiKey.message || 'INVALID'}
                            </span>
                          )}
                        </div>
                        <input 
                          type="password" 
                          placeholder="ElevenLabs API Key" 
                          value={apiKeys.elevenLabsApiKey}
                          onChange={(e) => updateApiKey('elevenLabsApiKey', e.target.value)}
                          className={cn(
                            "w-full bg-black/20 border px-4 py-3 rounded-xl text-xs focus:outline-none transition-all",
                            validationStatus.elevenLabsApiKey?.status === 'invalid' ? "border-red-500/50" : "border-white/10 focus:border-accent3"
                          )}
                        />
                      </div>

                      <button 
                        onClick={saveApiKeys}
                        disabled={isValidating}
                        className={cn(
                          "w-full text-white px-6 py-4 rounded-xl font-bold transition-all text-sm tracking-widest uppercase shadow-xl",
                          isValidating ? "bg-accent/50 cursor-not-allowed" : "bg-accent hover:bg-accent/90 shadow-accent/20"
                        )}
                      >
                        {isValidating ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Validating...
                          </div>
                        ) : "Save & Validate Keys"}
                      </button>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 p-6 lg:p-10 rounded-2xl lg:rounded-3xl backdrop-blur-md">
                    <h4 className="font-display text-lg lg:text-xl font-bold mb-6 lg:mb-8 flex items-center gap-3 tracking-tight">
                      <Sparkles className="text-accent2 w-[18px] h-[18px] lg:w-5 lg:h-5" /> The Process
                    </h4>
                    <ol className="space-y-4 lg:space-y-6 text-xs lg:text-sm text-muted font-light leading-relaxed">
                      <li className="flex gap-3 lg:gap-4">
                        <span className="font-mono text-accent font-bold text-[10px] lg:text-xs mt-0.5 lg:mt-1">01</span>
                        <span>AI scouts global trends and scores them for virality.</span>
                      </li>
                      <li className="flex gap-3 lg:gap-4">
                        <span className="font-mono text-accent font-bold text-[10px] lg:text-xs mt-0.5 lg:mt-1">02</span>
                        <span>Select a topic and platform to generate optimized content.</span>
                      </li>
                      <li className="flex gap-3 lg:gap-4">
                        <span className="font-mono text-accent font-bold text-[10px] lg:text-xs mt-0.5 lg:mt-1">03</span>
                        <span>Use the Preview tab to verify the visual layout and hook.</span>
                      </li>
                      <li className="flex gap-3 lg:gap-4">
                        <span className="font-mono text-accent font-bold text-[10px] lg:text-xs mt-0.5 lg:mt-1">04</span>
                        <span>Publish directly via connected APIs or copy to your scheduler.</span>
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Schedule Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowScheduleModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md glass p-6 lg:p-10 rounded-2xl lg:rounded-[2.5rem] shadow-2xl space-y-6 lg:space-y-8 border border-white/10 mx-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-xl lg:text-3xl font-extrabold flex items-center gap-3 lg:gap-4 tracking-tight">
                  <Clock className="text-accent w-6 h-6 lg:w-8 lg:h-8" /> Schedule Post
                </h3>
                <button onClick={() => setShowScheduleModal(false)} className="text-muted hover:text-white transition-colors">
                  <X className="w-5 h-5 lg:w-7 lg:h-7" strokeWidth={1} />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="font-mono text-[8px] lg:text-[9px] text-muted uppercase tracking-[0.2em]">Select Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 px-5 lg:px-6 py-3 lg:py-4 rounded-xl lg:rounded-2xl focus:outline-none focus:border-accent transition-all text-xs lg:text-sm text-white appearance-none"
                  />
                </div>
                
                <div className="p-5 lg:p-6 bg-accent/5 border border-accent/10 rounded-xl lg:rounded-2xl backdrop-blur-sm">
                  <p className="text-xs lg:text-sm text-muted leading-relaxed font-light">
                    <span className="font-bold text-accent">Pro Tip:</span> Scheduling posts for <span className="text-white font-medium">1 week</span> or <span className="text-white font-medium">1 month</span> ahead ensures consistent growth and better algorithm placement.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 lg:gap-4 pt-4">
                <button 
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-grow bg-white/5 border border-white/10 text-white py-3 lg:py-4 rounded-xl lg:rounded-2xl font-bold transition-all hover:bg-white/10 text-[9px] lg:text-[11px] tracking-widest uppercase"
                >
                  CANCEL
                </button>
                <button 
                  onClick={() => handlePublish(true)}
                  disabled={!scheduleDate || isPublished}
                  className="flex-grow bg-white hover:bg-white/90 text-black py-3 lg:py-4 rounded-xl lg:rounded-2xl font-bold transition-all disabled:opacity-50 text-[9px] lg:text-[11px] tracking-widest uppercase shadow-xl shadow-white/5"
                >
                  {isPublished ? 'SCHEDULING...' : 'CONFIRM SCHEDULE'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="border-t border-border py-12 px-6 text-center">
        <p className="font-mono text-[10px] text-muted tracking-widest uppercase">
          ViralFlow AI · Powered by Gemini 2.0 Flash
        </p>
      </footer>
    </div>
  );
}
