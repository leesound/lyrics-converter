import { useState, useEffect, useRef } from 'react'
import './App.css'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Copy, Trash2, Upload, Music, Languages, Type, Loader2, ScanEye, RefreshCw, AlertTriangle, Settings2, Terminal } from 'lucide-react'
import Kuroshiro from 'kuroshiro'
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji'
import * as wanakana from 'wanakana'
import Tesseract from 'tesseract.js'

interface Mora {
  kana: string
  romaji: string
  type: 'normal' | 'sokuon' | 'yoon' | 'long'
}

interface Word {
  original: string
  moras: Mora[]
}

interface ConvertedLine {
  words: Word[]
}

function App() {
  const [inputText, setInputText] = useState('')
  const [convertedLines, setConvertedLines] = useState<ConvertedLine[]>([])
  const [isConverting, setIsConverting] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  // OCR States
  const [isOcrProcessing, setIsOcrProcessing] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [ocrStatus, setOcrStatus] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  // New OCR Settings
  const [ocrHighAccuracy, setOcrHighAccuracy] = useState(false)
  const [ocrVertical, setOcrVertical] = useState(false)
  const [showOcrSettings, setShowOcrSettings] = useState(false)
  const [ocrProvider, setOcrProvider] = useState<'tesseract' | 'baidu'>('tesseract')
  const [baiduApiKey, setBaiduApiKey] = useState(() => localStorage.getItem('baidu_api_key') || '')
  const [baiduSecretKey, setBaiduSecretKey] = useState(() => localStorage.getItem('baidu_secret_key') || '')

  useEffect(() => {
    localStorage.setItem('baidu_api_key', baiduApiKey)
    localStorage.setItem('baidu_secret_key', baiduSecretKey)
  }, [baiduApiKey, baiduSecretKey])

  // Helpers & Refs
  const kuroshiroRef = useRef<Kuroshiro | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isInitialized = useRef(false)

  // Baidu OCR Logic
  const processFileWithBaidu = async (file: File) => {
    if (!baiduApiKey || !baiduSecretKey) {
      alert('请先在高级设置中填写百度 API Key 和 Secret Key！')
      setIsOcrProcessing(false)
      return
    }

    setOcrStatus('connecting to baidu cloud...')
    setOcrProgress(10)

    try {
      // 1. Get Access Token (via proxy)
      const tokenUrl = `/baidu-api/oauth/2.0/token?grant_type=client_credentials&client_id=${baiduApiKey}&client_secret=${baiduSecretKey}`
      const tokenRes = await fetch(tokenUrl, { method: 'POST' })
      const tokenData = await tokenRes.json()

      if (tokenData.error) {
        throw new Error(`Token Failed: ${tokenData.error_description || JSON.stringify(tokenData)}`)
      }

      const accessToken = tokenData.access_token
      setOcrProgress(30)
      setOcrStatus('uploading image...')

      // 2. Convert File to Base64 (remove prefix)
      const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = error => reject(error)
      })

      const base64Full = await toBase64(file)
      const imageBase64 = base64Full.replace(/^data:image\/\w+;base64,/, '')

      // 3. Call OCR API (via proxy)
      setOcrProgress(60)
      const ocrUrl = `/baidu-api/rest/2.0/ocr/v1/accurate_basic`
      const params = new URLSearchParams()
      params.append('access_token', accessToken)
      params.append('image', imageBase64)
      params.append('language_type', 'JAP')

      const ocrRes = await fetch(ocrUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      })

      const ocrData = await ocrRes.json()
      setOcrProgress(90)

      if (ocrData.error_code) {
        throw new Error(`OCR Error [${ocrData.error_code}]: ${ocrData.error_msg}`)
      }

      const words = ocrData.words_result.map((item: any) => item.words).join('\n')
      setInputText(words)
      setOcrProgress(100)
      // Remove alert for smoother experience
      // alert('Baidu OCR Complete')

    } catch (err) {
      console.error('Baidu OCR Error:', err)
      const errorMsg = err instanceof Error ? err.message : String(err)
      alert(`Cloud OCR Error: ${errorMsg}`)
    }
  }

  const initKuroshiro = async () => {
    if (isInitialized.current) return
    isInitialized.current = true
    setInitError(null)

    if (window.location.protocol === 'file:') {
      setInitError('Error: file:// protocol detected. Please run on a local server.')
      return
    }

    const kuroshiro = new Kuroshiro()
    const dictPath = import.meta.env.BASE_URL === '/' ? '/dict' : `${import.meta.env.BASE_URL}dict`

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Dictionary load timeout (15s)')), 15000)
      })

      await Promise.race([
        kuroshiro.init(new KuromojiAnalyzer({ dictPath })),
        timeoutPromise
      ])

      kuroshiroRef.current = kuroshiro
      setIsReady(true)
      console.log('Kuroshiro init successful!')
    } catch (err) {
      isInitialized.current = false
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('Kuroshiro init failed:', err)
      setInitError(errorMsg)

      try {
        const response = await fetch(`${dictPath}/base.dat.gz`)
        if (!response.ok) setInitError(`Dict file inaccessible (${response.status})`)
      } catch (e) { /* ignore */ }
    }
  }

  useEffect(() => {
    if (!isReady && !kuroshiroRef.current) initKuroshiro()
  }, [])

  const parseMoras = (hiragana: string): Mora[] => {
    const moras: Mora[] = []
    const chars = hiragana.split('')

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i]
      const nextChar = chars[i + 1]
      const isSmallKana = (c: string) => /[ぁぃぅぇぉゃゅょ]/.test(c)

      if (nextChar && isSmallKana(nextChar)) {
        const combined = char + nextChar
        moras.push({ kana: combined, romaji: wanakana.toRomaji(combined), type: 'yoon' })
        i++
        continue
      }

      if (char === 'っ' || char === 'ッ') {
        let nextConsonant = ''
        if (nextChar) {
          if (chars[i + 2] && isSmallKana(chars[i + 2])) {
            nextConsonant = wanakana.toRomaji(nextChar + chars[i + 2]).charAt(0)
          } else {
            nextConsonant = wanakana.toRomaji(nextChar).charAt(0)
          }
        } else {
          nextConsonant = "'"
        }
        moras.push({ kana: char, romaji: nextConsonant, type: 'sokuon' })
        continue
      }

      if (char === 'ー') {
        moras.push({ kana: char, romaji: '-', type: 'long' })
        continue
      }

      moras.push({ kana: char, romaji: wanakana.toRomaji(char), type: 'normal' })
    }
    return moras
  }

  const convertText = async () => {
    if (!inputText.trim() || !kuroshiroRef.current || !isReady) return
    setIsConverting(true)

    try {
      const customReplacements: Record<string, string> = {
        '一発': 'いっぱつ', '鐘々': 'かねがね', 'ランデヴー': 'らんでぶー',
        'ヴィ': 'び', 'ヴェ': 'べ', 'ヴォ': 'ぼ', 'ヴァ': 'ば', 'ゔ': 'ぶ', '酩酊': 'めいてい',
      }
      const applyCustomReplacements = (text: string) => {
        let res = text
        Object.entries(customReplacements).forEach(([key, val]) => { res = res.replaceAll(key, val) })
        return res
      }

      const lines = inputText.split('\n').filter(line => line.trim())
      const convertedResult = await Promise.all(lines.map(async (line) => {
        const rubyHtml = await kuroshiroRef.current!.convert(applyCustomReplacements(line.trim()), { to: 'hiragana', mode: 'furigana' })
        const wordList: Word[] = []
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = rubyHtml

        tempDiv.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim() || ''
            if (!text) return
            wordList.push({ original: '', moras: parseMoras(wanakana.toHiragana(text, { passRomaji: true })) })
          } else if (node.nodeName === 'RUBY') {
            let kanji = '', reading = ''
            node.childNodes.forEach(child => {
              if (child.nodeType === Node.TEXT_NODE) kanji += child.textContent
              else if (child.nodeName === 'RT') reading += child.textContent
            })
            reading = reading.trim().replace(/ゔ/g, 'ぶ')
            wordList.push({ original: kanji, moras: parseMoras(reading) })
          }
        })
        return { words: wordList }
      }))
      setConvertedLines(convertedResult)
    } finally {
      setIsConverting(false)
    }
  }

  const processFile = async (file: File) => {
    if (!file) return
    setIsOcrProcessing(true)
    setOcrStatus('initializing engine...')
    if (ocrProvider === 'baidu') {
      await processFileWithBaidu(file)
      setIsOcrProcessing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    try {
      const lang = ocrVertical ? 'jpn_vert' : 'jpn'
      const langPath = ocrHighAccuracy
        ? 'https://tessdata.projectnaptha.com/4.0.0_best'
        : 'https://raw.githubusercontent.com/naptha/tessdata/gh-pages/4.0.0_fast'
      const cachePath = ocrHighAccuracy ? 'best-data' : undefined
      const corePath = ocrHighAccuracy
        ? 'https://cdn.jsdelivr.net/npm/tesseract.js-core@v5.0.0/tesseract-core.wasm.js'
        : undefined

      const worker = await Tesseract.createWorker(lang, 1, {
        corePath, langPath, cachePath,
        logger: m => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100))
            setOcrStatus(`recognizing... ${Math.round(m.progress * 100)}%`)
          } else {
            setOcrStatus(m.status)
          }
        }
      })
      const { data: { text } } = await worker.recognize(file)
      await worker.terminate()
      const cleanText = text.split('\n').map(l => l.trim().replace(/\s+/g, '')).filter(l => l.length > 0).join('\n')
      setInputText(cleanText)
    } catch (err) {
      console.error(err)
      alert('OCR Failed')
    } finally {
      setIsOcrProcessing(false)
      setOcrStatus('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const exportResult = () => {
    if (convertedLines.length === 0) return
    let result = ''
    convertedLines.forEach(line => {
      const sentence = line.words.map(w => w.original || w.moras.map(m => m.kana).join('')).join('')
      const reading = line.words.map(w => w.moras.map(m => m.kana).join('')).join(' ')
      result += `${sentence}\n${reading}\n\n`
    })
    navigator.clipboard.writeText(result.trim())
    alert('Copied to clipboard!')
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary selection:text-black">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center shadow-glow">
            <Terminal className="w-5 h-5 text-black" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            LYRICS<span className="text-primary">.CONVERTER</span>
            <span className="ml-2 text-xs font-mono text-muted-foreground px-1.5 py-0.5 border border-border rounded bg-secondary/50">v2.0</span>
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card className="mb-6 border-border bg-card shadow-sm">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-mono flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Input Source
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="mb-4 bg-secondary border border-border w-full justify-start p-1 h-auto">
                <TabsTrigger value="text" className="data-[state=active]:bg-primary data-[state=active]:text-black text-sm flex-1 font-medium font-mono">
                  <Type className="w-4 h-4 mr-2" />
                  TEXT_INPUT
                </TabsTrigger>
                <TabsTrigger value="image" className="data-[state=active]:bg-primary data-[state=active]:text-black text-sm flex-1 font-medium font-mono">
                  <Upload className="w-4 h-4 mr-2" />
                  IMAGE_OCR
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text">
                <Textarea
                  placeholder="Paste Japanese lyrics here..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="min-h-[160px] resize-none bg-background border-border focus:border-primary focus:ring-1 focus:ring-primary font-mono text-sm leading-relaxed"
                />
              </TabsContent>

              <TabsContent value="image">
                <div
                  className={`border border-dashed rounded-lg p-10 text-center cursor-pointer transition-all relative overflow-hidden group
                    ${isOcrProcessing ? 'bg-secondary/20 border-border cursor-wait' :
                      isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-secondary/30'
                    }
                  `}
                  onClick={() => !isOcrProcessing && fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault(); setIsDragging(false);
                    if (!isOcrProcessing && e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0])
                  }}
                >
                  {isOcrProcessing ? (
                    <div className="flex flex-col items-center justify-center">
                      <ScanEye className="w-10 h-10 text-primary animate-pulse mb-4" />
                      <p className="text-primary font-mono text-sm mb-3">{ocrStatus}</p>
                      <div className="w-48 h-1 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-300 shadow-glow" style={{ width: `${ocrProgress}%` }} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mx-auto mb-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <p className="text-sm font-mono text-muted-foreground group-hover:text-foreground transition-colors">
                        DRAG_IMAGE_HERE <span className="text-xs opacity-50 mx-2">OR</span> CLICK_TO_UPLOAD
                      </p>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => processFile(e.target.files?.[0]!)} className="hidden" disabled={isOcrProcessing} />
                </div>

                {/* Settings Toggle */}
                <div className="mt-4 flex justify-end">
                  <button onClick={() => setShowOcrSettings(!showOcrSettings)} className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary transition-colors">
                    <Settings2 className="w-3 h-3" />
                    CONFIGURE_OCR
                  </button>
                </div>

                {showOcrSettings && (
                  <div className="mt-2 p-4 bg-secondary/50 border border-border rounded-lg text-xs animate-in fade-in slide-in-from-top-1">
                    <div className="flex gap-2 p-1 bg-background rounded border border-border mb-3">
                      {['tesseract', 'baidu'].map(p => (
                        <button key={p} onClick={() => setOcrProvider(p as any)}
                          className={`flex-1 py-1.5 font-mono text-xs rounded transition-all ${ocrProvider === p ? 'bg-primary text-black font-bold' : 'text-muted-foreground hover:text-foreground'}`}>
                          {p.toUpperCase()}
                        </button>
                      ))}
                    </div>
                    {ocrProvider === 'tesseract' ? (
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                          <input type="checkbox" checked={ocrHighAccuracy} onChange={e => setOcrHighAccuracy(e.target.checked)} className="rounded border-border bg-background text-primary focus:ring-primary" />
                          HIGH_ACCURACY
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                          <input type="checkbox" checked={ocrVertical} onChange={e => setOcrVertical(e.target.checked)} className="rounded border-border bg-background text-primary focus:ring-primary" />
                          VERTICAL_MODE
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input value={baiduApiKey} onChange={e => setBaiduApiKey(e.target.value)} placeholder="BAIDU_API_KEY" className="w-full bg-background border border-border rounded p-2 text-xs font-mono focus:border-primary outline-none" />
                        <input value={baiduSecretKey} onChange={e => setBaiduSecretKey(e.target.value)} type="password" placeholder="BAIDU_SECRET_KEY" className="w-full bg-background border border-border rounded p-2 text-xs font-mono focus:border-primary outline-none" />
                        <a href="https://console.bce.baidu.com/ai/#/ai/ocr/overview/index" target="_blank" className="block text-right text-primary hover:underline">Apply for Free API ></a>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={convertText}
                disabled={!inputText.trim() || isConverting || !isReady}
                className="flex-1 bg-primary text-black hover:bg-primary/90 font-bold tracking-wide shadow-glow disabled:opacity-50 disabled:shadow-none transition-all h-10"
              >
                {!isReady ? (
                  initError ? "INIT_FAILED" : <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> LOADING_DICT...</>
                ) : isConverting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> PROCESSING...</>
                ) : (
                  <><Terminal className="w-4 h-4 mr-2" /> EXECUTE_CONVERSION</>
                )}
              </Button>

              {(!isReady || initError) && (
                <Button variant="outline" onClick={initKuroshiro} className="border-border text-muted-foreground hover:text-foreground hover:border-primary hover:bg-transparent">
                  <RefreshCw className={`w-4 h-4 ${!initError && !isReady ? 'animate-spin' : ''}`} />
                </Button>
              )}

              <Button variant="outline" onClick={() => { setInputText(''); setConvertedLines([]) }} disabled={!inputText && !convertedLines.length} className="border-border text-muted-foreground hover:text-red-500 hover:border-red-500 hover:bg-transparent">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {initError && (
              <div className="mt-4 p-3 border border-red-900/50 bg-red-900/10 rounded text-xs text-red-500 font-mono flex gap-2 items-center">
                <AlertTriangle className="w-4 h-4" /> {initError}
              </div>
            )}
          </CardContent>
        </Card>

        {convertedLines.length > 0 && (
          <Card className="border-border bg-card shadow-sm animate-in fade-in slide-in-from-bottom-2">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-mono flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                <div className="w-2 h-2 rounded-full bg-primary" />
                Output Result
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={exportResult} className="text-primary hover:bg-primary/10 hover:text-primary font-mono text-xs h-7">
                <Copy className="w-3 h-3 mr-1.5" /> COPY_ALL
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {convertedLines.map((line, i) => (
                <div key={i} className="bg-secondary/30 rounded border border-border/50 p-4 hover:border-primary/30 transition-colors">
                  <div className="flex flex-wrap items-end gap-x-3 gap-y-5">
                    {line.words.map((word, j) => (
                      <div key={j} className="flex flex-col items-center group">
                        {word.original && (
                          <span className="text-lg font-bold text-foreground mb-1.5 tracking-wide leading-none">{word.original}</span>
                        )}
                        <div className="flex items-end gap-[1px]">
                          {word.moras.map((mora, k) => (
                            <div key={k} className="flex flex-col items-center">
                              <span className={`text-sm leading-none mb-1 font-japanese ${mora.type === 'sokuon' ? 'text-primary font-bold' :
                                  mora.type === 'yoon' || mora.type === 'long' ? 'text-blue-400' : 'text-muted-foreground'
                                }`}>{mora.kana}</span>
                              <span className={`text-[10px] font-mono uppercase tracking-tighter ${mora.type === 'sokuon' ? 'text-primary font-bold' : 'text-muted-foreground/60'
                                }`}>{mora.romaji}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

export default App
