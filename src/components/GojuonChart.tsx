import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Volume2, Mic, Settings2 } from 'lucide-react'
import { gojuonRows } from '../data/gojuon'
import type { Kana } from '../data/gojuon'

export function GojuonChart() {
    const [displayMode, setDisplayMode] = useState<'hira' | 'kata'>('hira')
    const [activeRef, setActiveRef] = useState<string | null>(null)
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
    const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('')

    useEffect(() => {
        const loadVoices = () => {
            const allVoices = window.speechSynthesis.getVoices()
            // Filter for Japanese voices
            const jpVoices = allVoices.filter(v => v.lang === 'ja-JP' || v.lang === 'ja_JP')

            setVoices(jpVoices)

            // Intelligent prioritization
            if (jpVoices.length > 0) {
                // 1. Try Google 日本語 (Chrome natural)
                const googleVoice = jpVoices.find(v => v.name.includes('Google') || v.name.includes('日本語'))
                // 2. Try Microsoft Online (Edge natural)
                const msVoice = jpVoices.find(v => v.name.includes('Microsoft') && v.name.includes('Online'))
                // 3. Fallback
                const bestVoice = googleVoice || msVoice || jpVoices[0]

                // Only set default if user hasn't selected one yet
                if (!selectedVoiceURI) {
                    setSelectedVoiceURI(bestVoice.voiceURI)
                }
            }
        }

        loadVoices()

        // Chrome loads voices asynchronously
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices
        }
    }, [])

    const playSound = (kana: Kana) => {
        if (!('speechSynthesis' in window)) return

        // Stop previous utterance
        window.speechSynthesis.cancel()

        const utterance = new SpeechSynthesisUtterance(kana.hira)
        utterance.lang = 'ja-JP'
        utterance.rate = 0.8
        utterance.pitch = 1

        if (selectedVoiceURI) {
            const voice = voices.find(v => v.voiceURI === selectedVoiceURI)
            if (voice) utterance.voice = voice
        }

        window.speechSynthesis.speak(utterance)

        // Visual feedback
        setActiveRef(kana.romaji)
        setTimeout(() => setActiveRef(null), 500)
    }

    return (
        <Card className="border-border bg-card shadow-sm mt-8">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-sm font-mono flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    日语五十音图 (点击发音)
                </CardTitle>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Voice Selector */}
                    {voices.length > 0 && (
                        <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-md border border-border/50">
                            <Settings2 className="w-3 h-3 text-muted-foreground ml-2" />
                            <select
                                value={selectedVoiceURI}
                                onChange={(e) => setSelectedVoiceURI(e.target.value)}
                                className="bg-transparent text-xs font-sans text-foreground outline-none border-none py-1 pr-2 cursor-pointer max-w-[150px] truncate"
                            >
                                {voices.map(v => (
                                    <option key={v.voiceURI} value={v.voiceURI} className="bg-card text-foreground">
                                        {v.name.replace('Microsoft', '').replace('Google', '').trim()}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Mode Toggle */}
                    <div className="flex bg-secondary p-1 rounded-md border border-border">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDisplayMode('hira')}
                            className={`h-7 px-3 text-xs font-bold transition-all ${displayMode === 'hira' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            あ 平假名
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDisplayMode('kata')}
                            className={`h-7 px-3 text-xs font-bold transition-all ${displayMode === 'kata' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            ア 片假名
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-6 overflow-x-auto">
                <div className="min-w-[500px] flex flex-col gap-2">
                    {/* Header Row */}
                    <div className="grid grid-cols-5 gap-2 mb-2 px-2">
                        {['a', 'i', 'u', 'e', 'o'].map(v => (
                            <div key={v} className="text-center text-xs font-mono text-muted-foreground uppercase tracking-widest opacity-50">
                                -{v}
                            </div>
                        ))}
                    </div>

                    {gojuonRows.map((row, rowIndex) => (
                        <div key={rowIndex} className="grid grid-cols-5 gap-2">
                            {row.map((cell, colIndex) => {
                                if (!cell) {
                                    return <div key={`${rowIndex}-${colIndex}`} className="bg-transparent" />
                                }

                                const isActive = activeRef === cell.romaji

                                return (
                                    <button
                                        key={cell.romaji}
                                        onClick={() => playSound(cell)}
                                        className={`
                      relative group flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200
                      ${isActive
                                                ? 'border-primary bg-primary/20 shadow-glow scale-105 z-10'
                                                : 'border-border bg-secondary/20 hover:border-primary/50 hover:bg-secondary/40'
                                            }
                    `}
                                    >
                                        <span className={`text-xl font-bold mb-1 transition-colors ${isActive ? 'text-primary' : 'text-foreground group-hover:text-primary'}`}>
                                            {displayMode === 'hira' ? cell.hira : cell.kata}
                                        </span>
                                        <span className="text-[10px] uppercase font-mono text-muted-foreground/70 group-hover:text-muted-foreground">
                                            {cell.romaji}
                                        </span>

                                        <Volume2 className={`absolute top-1 right-1 w-3 h-3 text-primary opacity-0 transition-opacity ${isActive ? 'opacity-100' : 'group-hover:opacity-50'}`} />
                                    </button>
                                )
                            })}
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground font-mono opacity-60">
                    <Mic className="w-3 h-3" />
                    Powered by Web Speech API
                </div>
            </CardContent>
        </Card>
    )
}
