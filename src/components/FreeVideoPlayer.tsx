import React, { useEffect, useRef, useState } from 'react';
import { Play, Loader2 } from 'lucide-react';

interface FreeVideoPlayerProps {
  assets: {
    voiceover_script: string;
    b_roll_search_terms: string[];
    on_screen_captions: { time: string; text: string }[];
  };
}

export function FreeVideoPlayer({ assets }: FreeVideoPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentCaption, setCurrentCaption] = useState('');
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    // Fetch video from Pexels
    const fetchVideo = async () => {
      setIsLoading(true);
      try {
        const apiKey = (import.meta as any).env.VITE_PEXELS_API_KEY;
        if (!apiKey) {
          console.warn("No Pexels API key found. Using placeholder video.");
          // Fallback to a generic placeholder video if no API key
          setVideoUrl("https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
          setIsLoading(false);
          return;
        }

        const query = assets.b_roll_search_terms[0] || "nature";
        const res = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=1&orientation=portrait`, {
          headers: {
            Authorization: apiKey
          }
        });
        
        if (!res.ok) throw new Error("Failed to fetch from Pexels");
        
        const data = await res.json();
        if (data.videos && data.videos.length > 0) {
          // Find the best quality video file
          const videoFiles = data.videos[0].video_files;
          const bestFile = videoFiles.find((f: any) => f.quality === 'hd') || videoFiles[0];
          setVideoUrl(bestFile.link);
        } else {
          setVideoUrl("https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
        }
      } catch (err) {
        console.error("Error fetching Pexels video:", err);
        setVideoUrl("https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
      } finally {
        setIsLoading(false);
      }
    };

    fetchVideo();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.speechSynthesis.cancel();
    };
  }, [assets.b_roll_search_terms]);

  const drawFrame = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame
    if (video.readyState >= 2) {
      // Calculate object-cover style dimensions
      const videoRatio = video.videoWidth / video.videoHeight;
      const canvasRatio = canvas.width / canvas.height;
      let drawWidth, drawHeight, startX, startY;

      if (videoRatio > canvasRatio) {
        drawHeight = canvas.height;
        drawWidth = canvas.height * videoRatio;
        startX = (canvas.width - drawWidth) / 2;
        startY = 0;
      } else {
        drawWidth = canvas.width;
        drawHeight = canvas.width / videoRatio;
        startX = 0;
        startY = (canvas.height - drawHeight) / 2;
      }

      ctx.drawImage(video, startX, startY, drawWidth, drawHeight);
      
      // Add a dark overlay for better text readability
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw current caption
    if (currentCaption) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Draw text shadow/stroke for readability
      ctx.font = '900 48px Inter, sans-serif';
      ctx.lineWidth = 8;
      ctx.strokeStyle = 'black';
      ctx.strokeText(currentCaption, canvas.width / 2, canvas.height / 2);
      
      ctx.fillStyle = 'white';
      ctx.fillText(currentCaption, canvas.width / 2, canvas.height / 2);
    }

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(drawFrame);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(drawFrame);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      // Draw one frame when paused/stopped to show the video/caption
      drawFrame();
    }
  }, [isPlaying, currentCaption]);

  const handlePlay = () => {
    if (!videoRef.current || !videoUrl) return;

    setIsPlaying(true);
    videoRef.current.currentTime = 0;
    videoRef.current.play();

    // Setup Speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(assets.voiceover_script);
    utterance.rate = 1.1;
    utteranceRef.current = utterance;

    startTimeRef.current = Date.now();

    const updateCaptions = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const caption = assets.on_screen_captions.find(c => {
        const [m, s] = c.time.split(':').map(Number);
        const timeInSec = m * 60 + s;
        return elapsed >= timeInSec && elapsed < timeInSec + 3; // Show for 3 seconds
      });
      setCurrentCaption(caption ? caption.text : '');
    }, 100);

    utterance.onend = () => {
      setIsPlaying(false);
      setCurrentCaption('');
      clearInterval(updateCaptions);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden rounded-xl lg:rounded-2xl bg-black">
      {isLoading ? (
        <div className="flex flex-col items-center gap-4 text-white/50">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-xs font-mono uppercase tracking-widest">Fetching B-Roll...</p>
        </div>
      ) : (
        <>
          <video 
            ref={videoRef} 
            src={videoUrl || undefined} 
            crossOrigin="anonymous"
            playsInline
            muted
            loop
            className="hidden"
            onLoadedData={drawFrame}
          />
          <canvas 
            ref={canvasRef}
            width={720}
            height={1280}
            className="w-full h-full object-cover"
          />
          
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <button 
                onClick={handlePlay}
                className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
              >
                <Play className="w-6 h-6 lg:w-8 lg:h-8 ml-1" fill="currentColor" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
