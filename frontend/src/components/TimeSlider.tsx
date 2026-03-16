import { useState, useEffect, useRef, useCallback } from 'react'
import type { CommitInfo } from '../types/graph'

interface TimeSliderProps {
  commits: CommitInfo[]
  currentIndex: number
  onIndexChange: (index: number) => void
  theme: {
    headerBg: string
    headerBorder: string
    textPrimary: string
    textSecondary: string
    textMuted: string
    btnBg: string
    btnText: string
    btnActiveBg: string
    btnActiveText: string
    module: string
  }
}

export default function TimeSlider({ commits, currentIndex, onIndexChange, theme }: TimeSliderProps) {
  const [playing, setPlaying] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const commit = commits[currentIndex]

  const togglePlay = useCallback(() => {
    setPlaying((prev) => !prev)
  }, [])

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        onIndexChange(currentIndex + 1)
      }, 1500)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [playing, currentIndex, onIndexChange])

  // Stop playback when reaching the end
  useEffect(() => {
    if (playing && currentIndex >= commits.length - 1) {
      setPlaying(false)
    }
  }, [currentIndex, commits.length, playing])

  if (!commit) return null

  const date = new Date(commit.timestamp * 1000)
  const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  return (
    <div
      className="flex items-center gap-3 px-4 py-2"
      style={{ backgroundColor: theme.headerBg, borderBottom: `1px solid ${theme.headerBorder}` }}
    >
      {/* Play/pause */}
      <button
        onClick={togglePlay}
        className="w-8 h-8 flex items-center justify-center rounded text-sm shrink-0"
        style={{ backgroundColor: theme.btnBg, color: theme.btnText }}
        title={playing ? 'Pause' : 'Play'}
      >
        {playing ? '||' : '\u25B6'}
      </button>

      {/* Slider */}
      <input
        type="range"
        min={0}
        max={commits.length - 1}
        value={currentIndex}
        onChange={(e) => onIndexChange(Number(e.target.value))}
        className="flex-1 h-1.5 cursor-pointer"
        style={{ accentColor: theme.module }}
      />

      {/* Commit info */}
      <div className="flex items-center gap-3 shrink-0 text-xs min-w-0" style={{ maxWidth: 400 }}>
        <span className="font-mono" style={{ color: theme.module }}>{commit.short_sha}</span>
        <span style={{ color: theme.textMuted }}>{dateStr}</span>
        <span style={{ color: theme.textSecondary }}>{commit.author_name}</span>
        <span className="truncate" style={{ color: theme.textMuted }} title={commit.message}>
          {commit.message.split('\n')[0]}
        </span>
      </div>

      {/* Counter */}
      <span className="text-xs shrink-0" style={{ color: theme.textMuted }}>
        {currentIndex + 1}/{commits.length}
      </span>
    </div>
  )
}
