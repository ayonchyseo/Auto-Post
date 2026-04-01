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
  Youtube,
  Loader2,
  Sparkles,
  ArrowRight,
  Settings,
  ShieldCheck,
  Globe,
  Clock,
  Calendar,
  X,
  Play,
  Download,
  AlertCircle,
  Key,
  Image
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { analyzeTrends, generateViralContent, generateVideo, generateImage, generateFreeVideoAssets } from './lib/gemini';
import { cn } from './lib/utils';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

type Platform = 'Twitter' | 'Instagram' | 'LinkedIn' | 'TikTok' | 'YouTube';

interface Trend {
  topic: string;
  viral_score: number;
  why_viral: string;
}

interface ViralContent {
  virality_score: number;
  virality_reason: string;
  platform_outputs: {
    twitter_thread?: {
      hook_tweet: string;
      tweets: string[];
      cta_tweet: string;
    };
    instagram_caption?: {
      hook: string;
      body: string;
      cta: string;
      hashtags: string;
    };
    tiktok_script?: {
      hook_line: string;
      script: string;
      on_screen_text: string[];
      trending_audio_suggestion: string;
    };
    linkedin_post?: {
      opener: string;
      body: string;
      cta: string;
    };
    youtube_shorts_script?: {
      hook: string;
      script: string;
      title: string;
      description: string;
    };
  };
  content_metadata: {
    hooks_ab_test: string[];
    best_posting_times: {
      twitter: string;
      instagram: string;
      tiktok: string;
      linkedin: string;
    };
    repurpose_tip: string;
  };
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
  const [activeTab, setActiveTab] = useState<'scout' | 'write' | 'video' | 'image' | 'preview' | 'settings' | 'trends'>('scout');
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
  const [hasApiKey, setHasApiKey] = useState(false);
  const [videoMode, setVideoMode] = useState<'premium' | 'free'>('free');
  const [freeVideoAssets, setFreeVideoAssets] = useState<{
    voiceover_script: string;
    b_roll_search_terms: string[];
    on_screen_captions: { time: string; text: string }[];
    thumbnail_concept: string;
  } | null>(null);
  const [isPlayingFreeVideo, setIsPlayingFreeVideo] = useState(false);
  const [currentCaption, setCurrentCaption] = useState('');

  // Image Generation State (Free)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageAspectRatio, setImageAspectRatio] = useState<'1:1' | '16:9' | '9:16'>('1:1');

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
        const videoUrl = await generateVideo(videoPrompt);
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

  const handlePlayFreeVideo = () => {
    if (!freeVideoAssets) return;
    
    setIsPlayingFreeVideo(true);
    const utterance = new SpeechSynthesisUtterance(freeVideoAssets.voiceover_script);
    utterance.rate = 1.1; // Slightly faster for viral feel
    
    // Simple caption sync based on time
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const caption = freeVideoAssets.on_screen_captions.find(c => {
        const [m, s] = c.time.split(':').map(Number);
        const timeInSec = m * 60 + s;
        return elapsed >= timeInSec && elapsed < timeInSec + 3;
      });
      if (caption) setCurrentCaption(caption.text);
    }, 100);

    utterance.onend = () => {
      setIsPlayingFreeVideo(false);
      setCurrentCaption('');
      clearInterval(interval);
    };

    window.speechSynthesis.speak(utterance);
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
    const outputs = generatedContent.platform_outputs;
    
    switch (selectedPlatform) {
      case 'Twitter':
        if (!outputs.twitter_thread) return '';
        return [outputs.twitter_thread.hook_tweet, ...outputs.twitter_thread.tweets, outputs.twitter_thread.cta_tweet].join('\n\n');
      case 'Instagram':
        if (!outputs.instagram_caption) return '';
        return `${outputs.instagram_caption.hook}\n\n${outputs.instagram_caption.body}\n\n${outputs.instagram_caption.cta}\n\n${outputs.instagram_caption.hashtags}`;
      case 'LinkedIn':
        if (!outputs.linkedin_post) return '';
        return `${outputs.linkedin_post.opener}\n\n${outputs.linkedin_post.body}\n\n${outputs.linkedin_post.cta}`;
      case 'TikTok':
        if (!outputs.tiktok_script) return '';
        return `Hook: ${outputs.tiktok_script.hook_line}\n\nScript: ${outputs.tiktok_script.script}\n\nOn Screen: ${outputs.tiktok_script.on_screen_text.join(', ')}\n\nAudio: ${outputs.tiktok_script.trending_audio_suggestion}`;
      case 'YouTube':
        if (!outputs.youtube_shorts_script) return '';
        return `Title: ${outputs.youtube_shorts_script.title}\n\nHook: ${outputs.youtube_shorts_script.hook}\n\nScript: ${outputs.youtube_shorts_script.script}\n\nDescription: ${outputs.youtube_shorts_script.description}`;
      default:
        return '';
    }
  };

  const handlePublish = (isScheduling: boolean = false) => {
    if (isScheduling && !scheduleDate) {
      alert("Please select a date and time for scheduling.");
      return;
    }

    setIsPublished(true);
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
      <header className="relative px-6 py-24 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(124,58,237,0.15)_0%,transparent_50%)] pointer-events-none" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-3xl mx-auto"
        >
          <div className="inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1 mb-8 backdrop-blur-sm">
            <span className="font-mono text-[10px] tracking-[0.3em] text-muted uppercase">Intelligence Layer v1.0</span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6 text-gradient">
            ViralFlow AI
          </h1>
          <p className="text-muted text-lg md:text-xl font-light leading-relaxed">
            The minimal engine for maximum reach. <br className="hidden md:block" />
            Scout trends, craft stories, and automate your growth.
          </p>
        </motion.div>
      </header>

      {/* Navigation */}
      <nav className="sticky top-6 z-50 px-6 mb-12">
        <div className="mx-auto max-w-fit glass rounded-full px-2 py-1 flex gap-1 shadow-2xl shadow-black/50">
          {[
            { id: 'scout', label: 'SCOUT', icon: TrendingUp },
            { id: 'write', label: 'WRITE', icon: PenTool },
            { id: 'image', label: 'IMAGE (FREE)', icon: ImageIcon },
            { id: 'video', label: 'VIDEO', icon: Video },
            { id: 'preview', label: 'PREVIEW', icon: Share2 },
            { id: 'settings', label: 'SETTINGS', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-full transition-all font-mono text-[10px] tracking-widest whitespace-nowrap",
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
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex-grow max-w-2xl space-y-4">
                  <div>
                    <h2 className="font-display text-3xl font-extrabold mb-2">Trend Scout</h2>
                    <p className="text-muted text-sm">Enter a seed topic and select a platform to discover viral angles.</p>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-grow flex flex-col gap-2">
                      <label className="font-mono text-[9px] text-muted uppercase tracking-[0.2em]">Seed Topic</label>
                      <input 
                        type="text" 
                        value={seedTopic}
                        onChange={(e) => setSeedTopic(e.target.value)}
                        placeholder="e.g. AI Agents, Remote Work..."
                        className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-xl focus:outline-none focus:border-white/30 transition-all text-sm placeholder:text-muted/50"
                      />
                    </div>
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <label className="font-mono text-[9px] text-muted uppercase tracking-[0.2em]">Platform</label>
                      <select 
                        value={scoutPlatform}
                        onChange={(e) => setScoutPlatform(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-xl focus:outline-none focus:border-white/30 transition-all text-sm text-white appearance-none cursor-pointer"
                      >
                        <option value="All Platforms">All Platforms</option>
                        <option value="Twitter">Twitter</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Instagram">Instagram</option>
                        <option value="TikTok">TikTok</option>
                        <option value="Facebook">Facebook</option>
                      </select>
                    </div>
                    <div className="flex flex-col justify-end">
                      <button 
                        onClick={fetchTrends}
                        disabled={isAnalyzing || !seedTopic}
                        className="flex items-center justify-center gap-2 bg-white hover:bg-white/90 text-black px-10 py-4 rounded-xl font-bold transition-all disabled:opacity-50 h-[54px] shadow-xl shadow-white/5"
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {trends.length > 0 ? (
                  trends.map((trend, i) => (
                    <motion.div
                      key={trend.topic}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="group glass-card p-8 rounded-2xl cursor-pointer"
                      onClick={() => {
                        setSelectedTopic(trend.topic);
                        setActiveTab('write');
                      }}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="bg-white/10 text-white font-mono text-[9px] tracking-widest px-3 py-1 rounded-full border border-white/5">
                          SCORE: {trend.viral_score}/10
                        </div>
                        <Zap size={14} className="text-white opacity-0 group-hover:opacity-100 transition-all transform group-hover:scale-110" />
                      </div>
                      <h3 className="font-display text-2xl font-bold mb-4 group-hover:text-white transition-colors leading-tight">{trend.topic}</h3>
                      <p className="text-muted text-sm leading-relaxed mb-6 font-light">{trend.why_viral}</p>
                      <div className="flex items-center text-white font-mono text-[10px] tracking-widest group-hover:gap-3 transition-all">
                        GENERATE <ArrowRight size={12} />
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-3 py-20 text-center border border-dashed border-border rounded-sm">
                    <TrendingUp size={48} className="mx-auto text-muted/20 mb-4" />
                    <p className="text-muted">No trends analyzed yet. Click "Scout Trends" to begin.</p>
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
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h2 className="font-display text-4xl font-extrabold mb-3 tracking-tight">Trend Scout</h2>
                  <p className="text-muted text-base font-light">AI-powered global trend analysis for maximum virality.</p>
                </div>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                  <button className="px-4 py-2 rounded-lg bg-white text-black text-[10px] font-mono tracking-widest uppercase">GLOBAL</button>
                  <button className="px-4 py-2 rounded-lg text-muted hover:text-white text-[10px] font-mono tracking-widest uppercase">LOCAL</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[
                  { topic: "AI Agents in SaaS", score: 98, trend: "Rising", category: "Tech", color: "text-accent" },
                  { topic: "Quiet Luxury Fashion", score: 84, trend: "Stable", category: "Lifestyle", color: "text-accent2" },
                  { topic: "Sustainable Travel", score: 72, trend: "Rising", category: "Travel", color: "text-accent3" },
                  { topic: "Remote Work 2.0", score: 91, trend: "Viral", category: "Business", color: "text-accent" },
                  { topic: "Biohacking Routines", score: 65, trend: "Rising", category: "Health", color: "text-accent2" },
                  { topic: "Web3 Gaming", score: 58, trend: "Falling", category: "Gaming", color: "text-muted" }
                ].map((trend, i) => (
                  <div key={i} className="glass-card p-8 rounded-3xl border-white/5 hover:border-white/20 transition-all group">
                    <div className="flex justify-between items-start mb-6">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-muted bg-white/5 px-3 py-1 rounded-full">{trend.category}</span>
                      <div className={cn("flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-widest", trend.color)}>
                        <TrendingUp size={12} /> {trend.trend}
                      </div>
                    </div>
                    <h4 className="text-xl font-bold mb-6 tracking-tight group-hover:text-accent transition-colors">{trend.topic}</h4>
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Controls */}
                <div className="space-y-8">
                  <div className="glass-card p-8 rounded-2xl space-y-8">
                    <h3 className="font-display text-xl font-bold tracking-tight">Configuration</h3>
                    
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
                      <div className="grid grid-cols-2 gap-3">
                        {(['Twitter', 'Instagram', 'LinkedIn', 'TikTok', 'YouTube'] as Platform[]).map((p) => (
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
                  <div className="glass-card rounded-2xl min-h-[600px] flex flex-col overflow-hidden">
                    <div className="border-b border-white/5 px-8 py-6 flex items-center justify-between bg-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-green shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="font-mono text-[9px] text-muted uppercase tracking-[0.2em]">Output: {selectedPlatform}</span>
                      </div>
                      <div className="flex items-center gap-6">
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
                    <div className="p-10 flex-grow overflow-auto prose prose-invert max-w-none">
                      {isGenerating ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted space-y-6">
                          <Loader2 className="animate-spin text-white" size={40} />
                          <p className="font-mono text-[10px] tracking-[0.3em] uppercase animate-pulse">Crafting viral narrative</p>
                        </div>
                      ) : generatedContent ? (
                        <div className="space-y-12">
                          {/* Virality Score Card */}
                          <div className="flex flex-col md:flex-row gap-6">
                            <div className="glass-card p-6 rounded-2xl flex-shrink-0 flex flex-col items-center justify-center min-w-[160px] border-accent2/20">
                              <div className="text-4xl font-display font-black text-accent2 mb-1">{generatedContent.virality_score}%</div>
                              <div className="text-[9px] font-mono uppercase tracking-widest text-muted">Virality Score</div>
                            </div>
                            <div className="glass-card p-6 rounded-2xl flex-grow bg-white/2 border-white/5">
                              <div className="flex items-center gap-2 mb-3">
                                <Zap size={14} className="text-accent2" />
                                <span className="text-[10px] font-mono uppercase tracking-widest text-muted">Strategist Insight</span>
                              </div>
                              <p className="text-sm text-muted font-light leading-relaxed italic">
                                "{generatedContent.virality_reason}"
                              </p>
                            </div>
                          </div>

                          {/* Main Content */}
                          <div className="markdown-body font-light leading-relaxed text-lg bg-white/2 p-8 rounded-3xl border border-white/5">
                            <ReactMarkdown>
                              {getPlatformContentString()}
                            </ReactMarkdown>
                          </div>

                          {/* Hook A/B Tester */}
                          {generatedContent.content_metadata.hooks_ab_test && (
                            <div className="space-y-6">
                              <div className="flex items-center gap-3">
                                <Sparkles className="text-accent" size={18} />
                                <h4 className="font-display text-xl font-bold tracking-tight">Viral Hook A/B Tester</h4>
                              </div>
                              <div className="grid grid-cols-1 gap-4">
                                {generatedContent.content_metadata.hooks_ab_test.map((hook, i) => (
                                  <div key={i} className="glass-card p-5 rounded-xl border-white/5 hover:border-accent/30 transition-all group flex items-center justify-between gap-4">
                                    <p className="text-sm text-muted group-hover:text-white transition-colors">"{hook}"</p>
                                    <button 
                                      onClick={() => navigator.clipboard.writeText(hook)}
                                      className="text-[9px] font-mono tracking-widest text-accent font-bold opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                      USE HOOK
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
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

          {activeTab === 'image' && (
            <motion.section
              key="image"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-12"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="glass-card p-10 rounded-3xl space-y-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-accent2/10 flex items-center justify-center">
                        <ImageIcon className="text-accent2" size={24} />
                      </div>
                      <h3 className="font-display text-2xl font-bold tracking-tight">Free Image Generation</h3>
                    </div>

                    <div className="space-y-4">
                      <label className="font-mono text-[9px] text-muted uppercase tracking-[0.2em]">Image Prompt</label>
                      <textarea 
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        placeholder="Describe the viral image you want to create... (e.g., A futuristic workspace with neon lighting and high-tech gadgets)"
                        className="w-full bg-white/5 border border-white/10 px-6 py-5 rounded-2xl focus:outline-none focus:border-accent2 transition-all text-sm min-h-[150px] resize-none"
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

                <div className="flex flex-col gap-8">
                  <div className={cn(
                    "glass-card rounded-3xl overflow-hidden relative flex items-center justify-center bg-black/40 min-h-[400px]",
                    imageAspectRatio === '9:16' ? 'aspect-[9/16] max-h-[700px]' : imageAspectRatio === '16:9' ? 'aspect-[16/9]' : 'aspect-square'
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
                <div className="text-center py-32 glass-card rounded-3xl border border-white/5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-accent/10 to-transparent pointer-events-none" />
                  <Key size={64} strokeWidth={1} className="mx-auto text-accent mb-8" />
                  <h2 className="font-display text-4xl font-extrabold mb-4 tracking-tight">API Key Required</h2>
                  <p className="text-muted max-w-lg mx-auto mb-12 text-lg font-light leading-relaxed">
                    Video generation requires a paid Google Cloud project API key. Please select your key to continue.
                  </p>
                  <button 
                    onClick={handleOpenKeyDialog}
                    className="bg-white hover:bg-white/90 text-black px-10 py-5 rounded-2xl font-bold transition-all inline-flex items-center gap-3 shadow-xl shadow-white/5"
                  >
                    <span className="tracking-widest text-[11px] uppercase">SELECT API KEY</span> <ArrowRight size={18} />
                  </button>
                  <p className="mt-6 text-xs text-muted">
                    Learn more about <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-white">Gemini API billing</a>.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="glass-card p-10 rounded-3xl space-y-8">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-accent3/10 flex items-center justify-center">
                            <Video className="text-accent3" size={24} />
                          </div>
                          <h3 className="font-display text-2xl font-bold tracking-tight">Video Generation</h3>
                        </div>
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                          <button 
                            onClick={() => setVideoMode('free')}
                            className={cn(
                              "px-4 py-2 rounded-lg text-[10px] font-mono tracking-widest transition-all",
                              videoMode === 'free' ? "bg-white text-black" : "text-muted hover:text-white"
                            )}
                          >
                            FREE
                          </button>
                          <button 
                            onClick={() => setVideoMode('premium')}
                            className={cn(
                              "px-4 py-2 rounded-lg text-[10px] font-mono tracking-widest transition-all",
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
                          className="w-full bg-white/5 border border-white/10 px-6 py-5 rounded-2xl focus:outline-none focus:border-accent3 transition-all text-sm min-h-[150px] resize-none"
                        />
                      </div>

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

                  <div className="flex flex-col gap-8">
                    <div className="glass-card rounded-3xl aspect-[9/16] max-h-[700px] overflow-hidden relative flex items-center justify-center bg-black/40">
                      {isGeneratingVideo ? (
                        <div className="text-center space-y-6 px-10">
                          <div className="relative">
                            <Loader2 className="animate-spin text-accent3 mx-auto" size={64} strokeWidth={1} />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-8 h-8 bg-accent3/20 rounded-full animate-ping" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-white animate-pulse">
                              {videoMode === 'free' ? 'Generating Assets' : 'Synthesizing Pixels'}
                            </p>
                            <p className="text-xs text-muted font-light">This usually takes about 30-60 seconds...</p>
                          </div>
                        </div>
                      ) : videoMode === 'free' && freeVideoAssets ? (
                        <div className="relative w-full h-full flex flex-col items-center justify-center p-10 text-center space-y-8">
                          <div className="absolute inset-0 bg-gradient-to-b from-accent3/20 to-black/60" />
                          
                          {/* Visual Placeholder for B-Roll */}
                          <div className="relative z-10 w-full aspect-square rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                            <ImageIcon size={48} className="text-white/20 animate-pulse" />
                            <div className="absolute bottom-4 left-4 right-4 text-[8px] font-mono text-muted uppercase tracking-widest">
                              B-Roll Idea: {freeVideoAssets.b_roll_search_terms[0]}
                            </div>
                          </div>

                          {/* Captions */}
                          <AnimatePresence mode="wait">
                            {isPlayingFreeVideo && currentCaption && (
                              <motion.div 
                                key={currentCaption}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.1 }}
                                className="relative z-20 bg-white text-black font-black text-2xl py-3 px-6 transform -rotate-1 shadow-2xl"
                              >
                                {currentCaption}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {!isPlayingFreeVideo && (
                            <button 
                              onClick={handlePlayFreeVideo}
                              className="relative z-20 w-20 h-20 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
                            >
                              <Play size={32} fill="currentColor" />
                            </button>
                          )}

                          <div className="relative z-10 space-y-2">
                            <p className="text-sm text-white font-bold tracking-tight">Free Video Preview</p>
                            <p className="text-xs text-muted font-light">Click play to hear the viral voiceover</p>
                          </div>
                        </div>
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
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h2 className="font-display text-4xl font-extrabold mb-3 tracking-tight">Preview & Verify</h2>
                  <p className="text-muted text-base font-light">Review how your post looks on {selectedPlatform} before publishing.</p>
                </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setActiveTab('write')}
                      className="bg-white/5 border border-white/10 text-white px-6 py-4 rounded-xl font-bold transition-all hover:bg-white/10 text-[11px] tracking-widest uppercase"
                    >
                      EDIT CONTENT
                    </button>
                    <button 
                      onClick={() => setShowScheduleModal(true)}
                      disabled={isPublished || !generatedContent}
                      className="flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent px-6 py-4 rounded-xl font-bold transition-all disabled:opacity-50 text-[11px] tracking-widest uppercase"
                    >
                      <Clock size={16} />
                      SCHEDULE
                    </button>
                    <button 
                      onClick={() => handlePublish(false)}
                      disabled={isPublished || !generatedContent}
                      className="flex items-center gap-2 bg-white hover:bg-white/90 text-black px-8 py-4 rounded-xl font-bold transition-all disabled:opacity-50 text-[11px] tracking-widest uppercase shadow-xl shadow-white/5"
                    >
                      {isPublished ? <Loader2 className="animate-spin" size={16} /> : <Share2 size={16} />}
                      {isPublished ? 'PUBLISHING...' : 'PUBLISH NOW'}
                    </button>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                {/* Mockup */}
                <div className="flex justify-center items-start">
                  {selectedPlatform === 'Twitter' && generatedContent?.platform_outputs.twitter_thread && (
                    <div className="w-full max-w-md bg-white text-black p-8 rounded-3xl shadow-2xl">
                      <div className="flex gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200" />
                        <div>
                          <div className="font-bold text-base">ViralFlow AI</div>
                          <div className="text-gray-500 text-sm">@viralflow_ai · 1m</div>
                        </div>
                      </div>
                      <div className="text-lg leading-relaxed mb-6 whitespace-pre-wrap font-light">
                        {generatedContent.platform_outputs.twitter_thread.hook_tweet}
                      </div>
                      <div className="text-blue-500 mb-6 font-medium">
                        {generatedContent.platform_outputs.twitter_thread.tweets[0].substring(0, 100)}...
                      </div>
                      <div className="flex justify-between text-gray-400 border-t border-gray-100 pt-6">
                        <Share2 size={20} />
                        <TrendingUp size={20} />
                        <Zap size={20} />
                        <Search size={20} />
                      </div>
                    </div>
                  )}

                  {selectedPlatform === 'Instagram' && generatedContent?.platform_outputs.instagram_caption && (
                    <div className="relative w-[340px] h-[680px] bg-black rounded-[3.5rem] border-[12px] border-white/10 shadow-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/80" />
                      <div className="absolute bottom-0 left-0 right-0 p-8 space-y-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white/20 border border-white/40 backdrop-blur-md" />
                          <div className="font-bold text-white text-sm">@viralflow_ai</div>
                        </div>
                        <p className="text-white text-sm line-clamp-4 leading-relaxed font-light">
                          <span className="font-bold text-accent2">{generatedContent.platform_outputs.instagram_caption.hook}</span> {generatedContent.platform_outputs.instagram_caption.body}
                        </p>
                        <div className="flex items-center gap-2 text-white/70 text-[10px] font-mono tracking-wider">
                          <Sparkles size={12} /> Original Audio - ViralFlow AI
                        </div>
                      </div>
                      <div className="absolute right-6 bottom-32 flex flex-col gap-8 text-white/90">
                        <div className="flex flex-col items-center gap-1.5"><Zap size={26} /><span className="text-[10px] font-bold">12.4K</span></div>
                        <div className="flex flex-col items-center gap-1.5"><Share2 size={26} /><span className="text-[10px] font-bold">2.1K</span></div>
                        <div className="flex flex-col items-center gap-1.5"><TrendingUp size={26} /><span className="text-[10px] font-bold">842</span></div>
                      </div>
                    </div>
                  )}

                  {selectedPlatform === 'LinkedIn' && generatedContent?.platform_outputs.linkedin_post && (
                    <div className="w-full max-w-xl bg-white text-black p-10 rounded-2xl shadow-2xl border border-gray-100">
                      <div className="flex gap-5 mb-8">
                        <div className="w-16 h-16 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-3xl">V</div>
                        <div>
                          <div className="font-bold text-xl">ViralFlow AI</div>
                          <div className="text-gray-500 text-sm">Automated Content Strategist</div>
                          <div className="text-gray-400 text-xs">1m · Edited</div>
                        </div>
                      </div>
                      <div className="text-base leading-relaxed mb-8 whitespace-pre-wrap font-light text-gray-800">
                        <p className="font-bold text-black mb-3 text-lg">{generatedContent.platform_outputs.linkedin_post.opener}</p>
                        {generatedContent.platform_outputs.linkedin_post.body}
                        <p className="font-bold text-blue-600 mt-6 text-lg">{generatedContent.platform_outputs.linkedin_post.cta}</p>
                      </div>
                      <div className="flex gap-8 text-gray-400 font-bold text-sm border-t border-gray-100 pt-6">
                        <span className="hover:text-blue-600 cursor-pointer transition-colors">Like</span>
                        <span className="hover:text-blue-600 cursor-pointer transition-colors">Comment</span>
                        <span className="hover:text-blue-600 cursor-pointer transition-colors">Repost</span>
                        <span className="hover:text-blue-600 cursor-pointer transition-colors">Send</span>
                      </div>
                    </div>
                  )}

                  {selectedPlatform === 'TikTok' && generatedContent?.platform_outputs.tiktok_script && (
                    <div className="relative w-[340px] h-[680px] bg-black rounded-[3.5rem] border-[12px] border-white/10 shadow-2xl overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/80" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full px-6">
                        <div className="bg-white text-black font-black text-2xl py-3 px-6 inline-block transform -rotate-2 shadow-2xl">
                          {generatedContent.platform_outputs.tiktok_script.on_screen_text[0]}
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-8 space-y-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white/20 border border-white/40 backdrop-blur-md" />
                          <div className="font-bold text-white text-sm">@viralflow_ai</div>
                        </div>
                        <p className="text-white text-sm line-clamp-4 leading-relaxed font-light">
                          {generatedContent.platform_outputs.tiktok_script.hook_line} #viral #ai
                        </p>
                        <div className="flex items-center gap-2 text-white/70 text-[10px] font-mono tracking-wider">
                          <Sparkles size={12} /> {generatedContent.platform_outputs.tiktok_script.trending_audio_suggestion}
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
                <div className="space-y-8">
                  <div className="glass-card p-10 rounded-3xl">
                    <h3 className="font-display text-2xl font-bold mb-8 tracking-tight">Verification Checklist</h3>
                    <div className="space-y-5">
                      {[
                        { id: 'hook', label: "Hook is strong and visible in first 3 lines" },
                        { id: 'pattern', label: "No grammatical errors or AI hallucinations" },
                        { id: 'cta', label: "Call to action is clear and compelling" },
                        { id: 'data', label: "Hashtags are relevant and not excessive" },
                        { id: 'voice', label: "Tone matches your brand voice" },
                        { id: 'mobile', label: "Formatting is clean and scannable" }
                      ].map((item) => (
                        <label key={item.id} className="flex items-center gap-5 cursor-pointer group">
                          <div className="relative flex items-center justify-center">
                            <input 
                              type="checkbox" 
                              checked={checklist[item.id as keyof typeof checklist]}
                              onChange={() => setChecklist(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof checklist] }))}
                              className="peer w-6 h-6 rounded-lg border-white/10 bg-white/5 text-accent2 focus:ring-accent2 transition-all appearance-none border checked:bg-accent2 checked:border-accent2" 
                            />
                            <div className="absolute text-black opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                          </div>
                          <span className={cn(
                            "text-base transition-all duration-300",
                            checklist[item.id as keyof typeof checklist] ? "text-accent2 line-through opacity-40" : "text-muted group-hover:text-text"
                          )}>
                            {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="bg-accent2/5 border border-accent2/10 p-8 rounded-3xl backdrop-blur-sm">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-accent2/10 flex items-center justify-center">
                        <Zap className="text-accent2" size={20} />
                      </div>
                      <h4 className="font-bold text-sm tracking-widest uppercase">AI Optimization Tip</h4>
                    </div>
                    <p className="text-muted text-base leading-relaxed font-light">
                      {generatedContent?.content_metadata.repurpose_tip || `Based on current ${selectedPlatform} algorithm data, adding a question at the end of this post could increase engagement by up to 24%.`}
                    </p>
                  </div>

                  <div className="glass-card p-8 rounded-3xl flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                        <Clock size={24} className="text-accent2" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold tracking-tight">
                          {generatedContent?.content_metadata.best_posting_times[selectedPlatform.toLowerCase() as keyof typeof generatedContent.content_metadata.best_posting_times] || '09:45 AM'}
                        </div>
                        <div className="text-[9px] text-muted uppercase tracking-[0.2em] font-mono">Best Posting Time</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-muted/50 font-mono uppercase tracking-widest">Local Time Zone</div>
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
              className="space-y-12"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-12">
                  <div className="glass-card p-10 rounded-3xl space-y-10">
                    <h3 className="font-display text-3xl font-extrabold flex items-center gap-4 tracking-tight">
                      <ShieldCheck className="text-accent2" size={32} /> Brand Identity
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="font-mono text-[9px] text-muted uppercase tracking-[0.2em]">Brand Voice</label>
                        <input 
                          type="text" 
                          value={brandVoice}
                          onChange={(e) => setBrandVoice(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 px-5 py-4 rounded-xl focus:outline-none focus:border-accent2 transition-all text-sm"
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10 border-t border-white/5">
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
                        <label className="flex items-center gap-4 cursor-pointer group pb-4">
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
                  <div className="glass-card p-10 rounded-3xl space-y-8">
                    <h3 className="font-display text-3xl font-extrabold flex items-center gap-4 tracking-tight">
                      <Calendar className="text-accent2" size={32} /> Schedule Queue
                    </h3>
                    <div className="space-y-4">
                      {scheduledPosts.length === 0 ? (
                        <div className="py-12 text-center bg-white/2 border border-dashed border-white/5 rounded-2xl">
                          <p className="text-muted text-sm italic font-light">No posts scheduled for the next week/month.</p>
                        </div>
                      ) : (
                        scheduledPosts.map((post) => (
                          <div key={post.id} className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all">
                            <div className="space-y-2">
                              <div className="text-base font-bold">{post.topic}</div>
                              <div className="flex items-center gap-4 text-[10px] text-muted uppercase tracking-[0.1em] font-mono">
                                <span className="text-accent font-bold">{post.platform}</span>
                                <span className="opacity-30">•</span>
                                <span>Scheduled: {new Date(post.scheduledDate).toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="px-3 py-1.5 bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold rounded-lg uppercase tracking-widest">
                              {post.status}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Content Archive */}
                  <div className="glass-card p-10 rounded-3xl space-y-8">
                    <h3 className="font-display text-3xl font-extrabold flex items-center gap-4 tracking-tight">
                      <Clock className="text-accent" size={32} /> Content Archive
                    </h3>
                    <div className="space-y-4">
                      {archive.length === 0 ? (
                        <div className="py-12 text-center bg-white/2 border border-dashed border-white/5 rounded-2xl">
                          <p className="text-muted text-sm italic font-light">No generated content yet.</p>
                        </div>
                      ) : (
                        archive.map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-accent/30 transition-all group cursor-pointer">
                            <div className="space-y-2">
                              <div className="text-base font-bold">{item.topic}</div>
                              <div className="flex items-center gap-4 text-[10px] text-muted uppercase tracking-[0.1em] font-mono">
                                <span className="text-accent2 font-bold">{item.platform}</span>
                                <span className="opacity-30">•</span>
                                <span>{item.date}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                setGeneratedContent(item.content);
                                setSelectedPlatform(item.platform as any);
                                setActiveTab('preview');
                              }}
                              className="text-accent opacity-0 group-hover:opacity-100 transition-all hover:underline text-[10px] font-mono tracking-widest uppercase font-bold"
                            >
                              RESTORE
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-12">
                  <div className="glass-card p-10 rounded-3xl space-y-8">
                    <h3 className="font-display text-2xl font-extrabold flex items-center gap-4 tracking-tight">
                      <Globe className="text-accent3" size={28} /> Publishing Channels
                    </h3>
                    <div className="space-y-5">
                      {[
                        { name: 'Buffer', status: 'Connected', color: 'text-green-400' },
                        { name: 'TikTok Developer', status: 'Pending', color: 'text-yellow-400' },
                        { name: 'YouTube Data API', status: 'Connected', color: 'text-green-400' },
                        { name: 'X (Twitter) API', status: 'Not Configured', color: 'text-muted' }
                      ].map((channel) => (
                        <div key={channel.name} className="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl">
                          <div className="space-y-1.5">
                            <div className="text-sm font-bold">{channel.name}</div>
                            <div className={cn("text-[9px] font-mono uppercase tracking-[0.2em]", channel.color)}>
                              {channel.status}
                            </div>
                          </div>
                          {channel.status !== 'Connected' && (
                            <button className="text-[10px] font-bold text-accent hover:underline tracking-widest uppercase">CONNECT</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/10 p-10 rounded-3xl backdrop-blur-md">
                    <h4 className="font-display text-xl font-bold mb-8 flex items-center gap-3 tracking-tight">
                      <Sparkles size={20} className="text-accent2" /> The Process
                    </h4>
                    <ol className="space-y-6 text-sm text-muted font-light leading-relaxed">
                      <li className="flex gap-4">
                        <span className="font-mono text-accent font-bold text-xs mt-1">01</span>
                        <span>AI scouts global trends and scores them for virality.</span>
                      </li>
                      <li className="flex gap-4">
                        <span className="font-mono text-accent font-bold text-xs mt-1">02</span>
                        <span>Select a topic and platform to generate optimized content.</span>
                      </li>
                      <li className="flex gap-4">
                        <span className="font-mono text-accent font-bold text-xs mt-1">03</span>
                        <span>Use the Preview tab to verify the visual layout and hook.</span>
                      </li>
                      <li className="flex gap-4">
                        <span className="font-mono text-accent font-bold text-xs mt-1">04</span>
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
              className="relative w-full max-w-md glass p-10 rounded-[2.5rem] shadow-2xl space-y-8 border border-white/10"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-3xl font-extrabold flex items-center gap-4 tracking-tight">
                  <Clock className="text-accent" size={32} /> Schedule Post
                </h3>
                <button onClick={() => setShowScheduleModal(false)} className="text-muted hover:text-white transition-colors">
                  <X size={28} strokeWidth={1} />
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="font-mono text-[9px] text-muted uppercase tracking-[0.2em]">Select Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 px-6 py-4 rounded-2xl focus:outline-none focus:border-accent transition-all text-sm text-white appearance-none"
                  />
                </div>
                
                <div className="p-6 bg-accent/5 border border-accent/10 rounded-2xl backdrop-blur-sm">
                  <p className="text-sm text-muted leading-relaxed font-light">
                    <span className="font-bold text-accent">Pro Tip:</span> Scheduling posts for <span className="text-white font-medium">1 week</span> or <span className="text-white font-medium">1 month</span> ahead ensures consistent growth and better algorithm placement.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-grow bg-white/5 border border-white/10 text-white py-4 rounded-2xl font-bold transition-all hover:bg-white/10 text-[11px] tracking-widest uppercase"
                >
                  CANCEL
                </button>
                <button 
                  onClick={() => handlePublish(true)}
                  disabled={!scheduleDate || isPublished}
                  className="flex-grow bg-white hover:bg-white/90 text-black py-4 rounded-2xl font-bold transition-all disabled:opacity-50 text-[11px] tracking-widest uppercase shadow-xl shadow-white/5"
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
