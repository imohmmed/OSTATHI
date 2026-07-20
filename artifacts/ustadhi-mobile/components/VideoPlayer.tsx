/**
 * VideoPlayer — custom controls, no Cast button, PiP, fullscreen, HLS/mp4
 * Powered by react-native-video (MIT)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Video, { VideoRef } from 'react-native-video';
import type { OnBufferData, OnLoadData, OnProgressData } from 'react-native-video';
import { Ionicons } from '@expo/vector-icons';

// ─── helpers ──────────────────────────────────────────────────────────────────
const fmt = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// ─── props ────────────────────────────────────────────────────────────────────
export interface VideoPlayerProps {
  /** Remote URL (mp4/m3u8) or local file:// URI */
  source: string;
  /** Seek here on first load (seconds) */
  savedPosition?: number;
  /** Called every 5 s with current position so caller can persist it */
  onSaveProgress?: (positionSeconds: number) => void;
  /** Height of the player container */
  height: number;
  /** Show "محفوظ" offline badge */
  localBadge?: boolean;
}

// ─── component ────────────────────────────────────────────────────────────────
export function VideoPlayer({
  source,
  savedPosition = 0,
  onSaveProgress,
  height,
  localBadge = false,
}: VideoPlayerProps) {
  const videoRef = useRef<VideoRef>(null);

  // playback
  const [paused, setPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);

  // controls UI
  const [ctrlVisible, setCtrlVisible] = useState(true);
  const [seekW, setSeekW] = useState(1);

  // internals
  const ctrlTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer   = useRef<ReturnType<typeof setInterval> | null>(null);
  const curTimeRef  = useRef(0);
  const seekedRef   = useRef(false);
  const pausedRef   = useRef(false);   // mirror of paused state for closures

  // ── save progress every 5 s + on unmount ─────────────────────────────────
  useEffect(() => {
    saveTimer.current = setInterval(() => {
      if (curTimeRef.current > 0) onSaveProgress?.(curTimeRef.current);
    }, 5000);
    return () => {
      clearInterval(saveTimer.current!);
      if (curTimeRef.current > 0) onSaveProgress?.(curTimeRef.current);
    };
  }, [onSaveProgress]);

  // ── auto-hide controls ────────────────────────────────────────────────────
  const armTimer = useCallback((isPaused: boolean) => {
    if (ctrlTimer.current) clearTimeout(ctrlTimer.current);
    setCtrlVisible(true);
    if (!isPaused) {
      ctrlTimer.current = setTimeout(() => setCtrlVisible(false), 3500);
    }
  }, []);

  useEffect(() => {
    armTimer(true); // show on mount; hide only after play starts
    return () => { if (ctrlTimer.current) clearTimeout(ctrlTimer.current); };
  }, []); // eslint-disable-line

  // ── Video events ──────────────────────────────────────────────────────────
  const handleLoad = useCallback((data: OnLoadData) => {
    setDuration(data.duration);
    setLoading(false);
    if (savedPosition > 3 && !seekedRef.current) {
      seekedRef.current = true;
      videoRef.current?.seek(savedPosition);
      setCurrentTime(savedPosition);
    }
  }, [savedPosition]);

  const handleProgress = useCallback((data: OnProgressData) => {
    setCurrentTime(data.currentTime);
    curTimeRef.current = data.currentTime;
  }, []);

  const handleBuffer = useCallback(({ isBuffering }: OnBufferData) => {
    setLoading(isBuffering);
  }, []);

  // ── Controls interaction ──────────────────────────────────────────────────
  const togglePlayPause = useCallback(() => {
    setPaused(prev => {
      const next = !prev;
      pausedRef.current = next;
      armTimer(next);   // keep controls visible when paused
      return next;
    });
  }, [armTimer]);

  const toggleCtrl = useCallback(() => {
    if (ctrlVisible) {
      if (!pausedRef.current) setCtrlVisible(false);
    } else {
      armTimer(pausedRef.current);
    }
  }, [ctrlVisible, armTimer]);

  const handleSeek = useCallback((locationX: number) => {
    if (duration <= 0) return;
    const pct = Math.max(0, Math.min(1, locationX / seekW));
    const target = pct * duration;
    videoRef.current?.seek(target);
    setCurrentTime(target);
    curTimeRef.current = target;
    armTimer(pausedRef.current);
  }, [duration, seekW, armTimer]);

  const handlePiP = useCallback(() => {
    try { videoRef.current?.enterPictureInPicture(); } catch {}
  }, []);

  const handleFullscreen = useCallback(() => {
    try { videoRef.current?.presentFullscreenPlayer(); } catch {}
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const progress = duration > 0 ? currentTime / duration : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <TouchableWithoutFeedback onPress={toggleCtrl}>
      <View style={[S.wrap, { height }]}>

        {/* ── Player surface — controls={false} removes native Cast button ── */}
        <Video
          ref={videoRef}
          source={{ uri: source }}
          style={S.video}
          resizeMode="contain"
          paused={paused}
          controls={false}
          onLoad={handleLoad}
          onProgress={handleProgress}
          onBuffer={handleBuffer}
          onEnd={() => { setPaused(true); pausedRef.current = true; armTimer(true); }}
          ignoreSilentSwitch="obey"
          playInBackground={false}
          playWhenInactive={false}
        />

        {/* ── Buffering spinner ── */}
        {loading && (
          <View style={S.loader}>
            <ActivityIndicator size="large" color="#D4A843" />
          </View>
        )}

        {/* ── Custom controls overlay ── */}
        {ctrlVisible && (
          <View style={S.overlay} pointerEvents="box-none">

            {/* Bottom gradient scrim */}
            <View style={S.scrim} />

            {/* Center: play / pause */}
            <TouchableOpacity
              style={S.centerHit}
              onPress={togglePlayPause}
              activeOpacity={0.7}
            >
              <View style={S.playBubble}>
                <Ionicons name={paused ? 'play' : 'pause'} size={30} color="#fff" />
              </View>
            </TouchableOpacity>

            {/* Bottom bar */}
            <View style={S.bar}>

              {/* Current time */}
              <Text style={S.timeText}>{fmt(currentTime)}</Text>

              {/* Seek bar */}
              <View
                style={S.seekOuter}
                onLayout={e => setSeekW(e.nativeEvent.layout.width)}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={e => handleSeek(e.nativeEvent.locationX)}
                onResponderMove={e => handleSeek(e.nativeEvent.locationX)}
              >
                <View style={S.seekTrack}>
                  {/* Filled portion */}
                  <View style={[S.seekFill, { width: `${progress * 100}%` as any }]} />
                </View>
                {/* Thumb */}
                <View style={[S.seekThumb, { left: `${Math.max(0, progress * 100 - 0.5)}%` as any }]} />
              </View>

              {/* Total duration */}
              <Text style={S.timeText}>{fmt(duration)}</Text>

              {/* PiP button */}
              <TouchableOpacity
                onPress={handlePiP}
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
              >
                <Ionicons name="tv-outline" size={21} color="#fff" />
              </TouchableOpacity>

              {/* Fullscreen button */}
              <TouchableOpacity
                onPress={handleFullscreen}
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
              >
                <Ionicons name="expand-outline" size={21} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Offline badge ── */}
        {localBadge && (
          <View style={S.offlineBadge} pointerEvents="none">
            <Ionicons name="cloud-offline" size={12} color="#fff" />
            <Text style={S.offlineText}>محفوظ</Text>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  wrap: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },

  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },

  scrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },

  centerHit: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBubble: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(0,0,0,0.50)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 6,
    gap: 8,
  },

  timeText: {
    color: '#fff',
    fontFamily: 'Tajawal_500Medium',
    fontSize: 12,
    minWidth: 36,
    textAlign: 'center',
  },

  seekOuter: {
    flex: 1,
    height: 28,
    justifyContent: 'center',
    position: 'relative',
  },
  seekTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'visible',
  },
  seekFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#D4A843',
  },
  seekThumb: {
    position: 'absolute',
    top: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D4A843',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    marginLeft: -7,
  },

  offlineBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  offlineText: {
    color: '#fff',
    fontFamily: 'Tajawal_700Bold',
    fontSize: 11,
  },
});
