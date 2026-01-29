import { useState, useEffect, useRef } from 'react'
import './App.css'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Copy, Trash2, Upload, Music, Languages, Type, Loader2, ScanEye, RefreshCw, AlertTriangle } from 'lucide-react'
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

  // Debug State
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [showDebug, setShowDebug] = useState(false)

  const kuroshiroRef = useRef<Kuroshiro | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addDebugLog = (msg: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`])
    console.log(`[Debug] ${msg}`)
  }

  const isInitialized = useRef(false)

  const initKuroshiro = async () => {
    // Prevent double initialization in Strict Mode
    if (isInitialized.current) {
      console.log('Kuroshiro already initializing/initialized, skipping...')
      return
    }
    isInitialized.current = true

    setInitError(null)
    setDebugInfo([])

    // Check for file protocol
    if (window.location.protocol === 'file:') {
      const errorMsg = '错误：检测到 file:// 协议。本应用必须在服务器环境下运行（如 VS Code Live Server, Vite dev, 或部署到 Web）才能加载词库文件。'
      setInitError(errorMsg)
      addDebugLog(errorMsg)
      return
    }

    const kuroshiro = new Kuroshiro()

    // Construct the dictionary path
    const dictPath = import.meta.env.BASE_URL === '/'
      ? '/dict'
      : `${import.meta.env.BASE_URL}dict`

    addDebugLog(`Base URL: ${import.meta.env.BASE_URL}`)
    addDebugLog(`Resolved Dict Path: ${dictPath}`)
    addDebugLog('Starting Kuroshiro init...')

    try {
      // Create a timeout promise (15 seconds) - increased for slow connections
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('词库加载超时 (15秒)')), 15000)
      })

      // Race between initialization and timeout
      await Promise.race([
        kuroshiro.init(new KuromojiAnalyzer({ dictPath })),
        timeoutPromise
      ])

      kuroshiroRef.current = kuroshiro
      setIsReady(true)
      addDebugLog('Kuroshiro init successful!')
    } catch (err) {
      isInitialized.current = false // Reset init flag on error to allow retry
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('Kuroshiro initialization failed:', err)
      setInitError(errorMsg)
      addDebugLog(`Init Failed: ${errorMsg}`)

      // Try to probe the dictionary availability
      addDebugLog('Probing dictionary file...')
      try {
        const testUrl = `${dictPath}/base.dat.gz`
        const response = await fetch(testUrl)
        addDebugLog(`Probe ${testUrl}: Status ${response.status}`)
        if (!response.ok) {
          setInitError(`无法访问词库文件 (${response.status})。请检查部署配置。`)
        }
      } catch (probeErr) {
        addDebugLog(`Probe error: ${String(probeErr)}`)
      }
    }
  }

  useEffect(() => {
    if (!isReady && !kuroshiroRef.current) {
      initKuroshiro()
    }
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
        moras.push({
          kana: combined,
          romaji: wanakana.toRomaji(combined),
          type: 'yoon'
        })
        i++
        continue
      }

      if (char === 'っ' || char === 'ッ') {
        let nextConsonant = ''
        if (nextChar) {
          if (chars[i + 2] && isSmallKana(chars[i + 2])) {
            const nextMoraRomaji = wanakana.toRomaji(nextChar + chars[i + 2])
            nextConsonant = nextMoraRomaji.charAt(0)
          } else {
            const nextMoraRomaji = wanakana.toRomaji(nextChar)
            nextConsonant = nextMoraRomaji.charAt(0)
          }
        } else {
          nextConsonant = "'"
        }

        moras.push({
          kana: char,
          romaji: nextConsonant,
          type: 'sokuon'
        })
        continue
      }

      if (char === 'ー') {
        moras.push({
          kana: char,
          romaji: '-',
          type: 'long'
        })
        continue
      }

      moras.push({
        kana: char,
        romaji: wanakana.toRomaji(char),
        type: 'normal'
      })
    }
    return moras
  }

  const convertText = async () => {
    if (!inputText.trim() || !kuroshiroRef.current || !isReady) return

    setIsConverting(true)

    try {
      const customReplacements: Record<string, string> = {
        '一発': 'いっぱつ',
        '鐘々': 'かねがね',
        'ランデヴー': 'らんでぶー',
        'ヴィ': 'び',
        'ヴェ': 'べ',
        'ヴォ': 'ぼ',
        'ヴァ': 'ば',
        'ゔ': 'ぶ',
        '酩酊': 'めいてい',
      }

      const applyCustomReplacements = (text: string): string => {
        let res = text
        Object.entries(customReplacements).forEach(([key, val]) => {
          res = res.replaceAll(key, val)
        })
        return res
      }

      const lines = inputText.split('\n').filter(line => line.trim())

      const convertedResult: ConvertedLine[] = await Promise.all(lines.map(async (line) => {
        const trimmedLine = line.trim()

        const rubyHtml = await kuroshiroRef.current!.convert(applyCustomReplacements(trimmedLine), {
          to: 'hiragana',
          mode: 'furigana'
        })

        const wordList: Word[] = []
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = rubyHtml

        tempDiv.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.trim() || ''
            if (!text) return

            const hiraganaText = wanakana.toHiragana(text, { passRomaji: true })

            wordList.push({
              original: '',
              moras: parseMoras(hiraganaText)
            })
          } else if (node.nodeName === 'RUBY') {
            let kanji = ''
            let reading = ''

            node.childNodes.forEach(child => {
              if (child.nodeType === Node.TEXT_NODE) {
                kanji += child.textContent
              } else if (child.nodeName === 'RT') {
                reading += child.textContent
              }
            })

            reading = reading.trim().replace(/ゔ/g, 'ぶ')

            wordList.push({
              original: kanji,
              moras: parseMoras(reading)
            })
          }
        })

        return { words: wordList }
      }))

      setConvertedLines(convertedResult)
    } catch (error) {
      console.error('Conversion error:', error)
      alert('转换过程中出错，请重试')
    } finally {
      setIsConverting(false)
    }
  }

  const processFile = async (file: File) => {
    if (!file) return

    setIsOcrProcessing(true)
    setOcrProgress(0)
    setOcrStatus('初始化识别引擎...')

    try {
      const { data: { text } } = await Tesseract.recognize(
        file,
        'jpn',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100))
              setOcrStatus(`正在识别文字... ${Math.round(m.progress * 100)}%`)
            } else {
              const statusMap: Record<string, string> = {
                'loading tesseract core': '加载核心组件...',
                'initializing tesseract': '初始化引擎...',
                'loading language traineddata': '加载语言包...',
                'initializing api': '启动接口...',
              }
              setOcrStatus(statusMap[m.status] || m.status)
            }
          }
        }
      )

      const cleanText = text.split('\n')
        .map(line => line.trim().replace(/\s+/g, ''))
        .filter(line => line.length > 0)
        .join('\n')

      setInputText(cleanText)
      alert('识别完成！已自动填入文本框。')

    } catch (err) {
      console.error('OCR Error:', err)
      const errorMsg = err instanceof Error ? err.message : String(err)
      alert('图片识别失败，已记录错误日志。')
      addDebugLog(`OCR Failed: ${errorMsg}`)
    } finally {
      setIsOcrProcessing(false)
      setOcrProgress(0)
      setOcrStatus('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isOcrProcessing) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (isOcrProcessing) return

    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      processFile(file)
    } else if (file) {
      alert('请上传图片文件 (JPG/PNG)')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('已复制到剪贴板！')
  }

  const clearAll = () => {
    setInputText('')
    setConvertedLines([])
  }

  const exportResult = () => {
    if (convertedLines.length === 0) return

    let result = ''
    convertedLines.forEach(line => {
      const sentence = line.words.map(w => w.original || w.moras.map(m => m.kana).join('')).join('')
      const reading = line.words.map(w => w.moras.map(m => m.kana).join('')).join(' ')
      result += `${sentence}\n${reading}\n\n`
    })

    copyToClipboard(result.trim())
    alert('已复制到剪贴板！')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-rose-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-400 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-200">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-rose-500 to-pink-500 bg-clip-text text-transparent">
                日文歌词转换器
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card className="mb-6 border-rose-100 shadow-lg shadow-rose-100/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Type className="w-4 h-4 text-rose-500" />
              输入日文歌词
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="mb-4 bg-rose-50">
                <TabsTrigger value="text" className="data-[state=active]:bg-white">
                  <Type className="w-4 h-4 mr-1" />
                  文本输入
                </TabsTrigger>
                <TabsTrigger value="image" className="data-[state=active]:bg-white">
                  <Upload className="w-4 h-4 mr-1" />
                  图片上传
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text">
                <Textarea
                  placeholder="请粘贴日文歌词，每行一句...

例如：
君の名は
夢を見ている"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="min-h-[160px] resize-none border-rose-200 focus:border-rose-400 focus:ring-rose-200"
                />
              </TabsContent>

              <TabsContent value="image">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all relative overflow-hidden
                    ${isOcrProcessing ? 'bg-rose-50 border-rose-200 cursor-wait' :
                      isDragging
                        ? 'border-rose-500 bg-rose-50 scale-[0.99] shadow-inner'
                        : 'border-rose-200 hover:border-rose-400 hover:bg-rose-50/50'
                    }
                  `}
                  onClick={() => !isOcrProcessing && fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {isOcrProcessing ? (
                    <div className="flex flex-col items-center justify-center py-4">
                      <ScanEye className="w-12 h-12 text-rose-500 animate-pulse mb-3" />
                      <p className="text-rose-600 font-medium mb-2">{ocrStatus}</p>
                      <div className="w-48 h-2 bg-rose-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-rose-500 transition-all duration-300"
                          style={{ width: `${ocrProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className={`w-10 h-10 mx-auto mb-3 transition-colors ${isDragging ? 'text-rose-500' : 'text-rose-300'}`} />
                      <p className={`text-sm mb-1 font-medium ${isDragging ? 'text-rose-600' : 'text-gray-600'}`}>
                        {isDragging ? '松开即刻识别' : '拖入图片 或 点击上传 (OCR)'}
                      </p>
                      <p className="text-xs text-gray-400">支持 JPG, PNG · 自动识别日文</p>
                    </>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isOcrProcessing}
                  />
                </div>
                <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                  <span className="inline-block w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-center leading-4">!</span>
                  OCR 识别可能存在误差，请在转换前核对文字。
                </p>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 mt-4">
              <Button
                onClick={convertText}
                disabled={!inputText.trim() || isConverting || !isReady}
                className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white disabled:opacity-70"
              >
                {!isReady ? (
                  initError ? (
                    <>初始化失败 (点击右侧重试)</>
                  ) : (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      初始化词库中...
                    </>
                  )
                ) : isConverting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    转换中...
                  </>
                ) : (
                  <>
                    <Languages className="w-4 h-4 mr-2" />
                    开始转换
                  </>
                )}
              </Button>

              {(!isReady || initError) && (
                <Button variant="outline" onClick={initKuroshiro} className="border-rose-200 text-rose-500 hover:bg-rose-50">
                  <RefreshCw className={`w-4 h-4 ${!initError && !isReady ? 'animate-spin' : ''}`} />
                </Button>
              )}

              <Button
                variant="outline"
                onClick={clearAll}
                disabled={(!inputText && convertedLines.length === 0) || !isReady}
                className="border-rose-200 hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Error & Debug Display */}
            {/* Error Display (Only real errors) */}
            {initError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  初始化失败
                </div>
                <p className="mb-2">{initError}</p>
                <p className="mt-2 opacity-75">提示：请尝试刷新页面，或检查网络是否能访问 /dict 目录下的文件。</p>
              </div>
            )}

            {/* Debug Logs Display (Controlled by showDebug) */}
            {(showDebug || initError) && (
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
                <p className="font-bold mb-2 flex items-center gap-2">
                  <ScanEye className="w-3 h-3" />
                  调试日志
                </p>
                <div className="font-mono text-[10px] opacity-90 max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {debugInfo.length === 0 ? '暂无日志...' : debugInfo.map((log, i) => (
                    <div key={i} className="border-b border-gray-100 last:border-0 py-0.5">{log}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-2 text-center">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="text-[10px] text-gray-300 hover:text-gray-500 transition-colors"
              >
                v1.0.4 {showDebug ? 'Hide Debug' : 'Debug'}
              </button>
            </div>

          </CardContent>
        </Card>

        {convertedLines.length > 0 && (
          <Card className="border-rose-100 shadow-lg shadow-rose-100/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Languages className="w-4 h-4 text-rose-500" />
                  转换结果
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exportResult}
                  className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  复制文本
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {convertedLines.map((line, lineIdx) => (
                  <div key={lineIdx} className="bg-white/50 rounded-xl p-4 border border-rose-100 shadow-sm">
                    <div className="flex flex-wrap items-end gap-x-3 gap-y-6">
                      {/* Render each word */}
                      {line.words.map((word, wordIdx) => (
                        <div key={wordIdx} className="flex flex-col items-center">
                          {/* Top: Original Kanji/Text */}
                          {word.original && (
                            <span className="text-lg font-bold text-gray-800 mb-1 leading-none">
                              {word.original}
                            </span>
                          )}

                          {/* Bottom: Moras (Kana + Romaji) */}
                          <div className="flex items-end gap-[1px]">
                            {word.moras.map((mora, moraIdx) => (
                              <div key={moraIdx} className="flex flex-col items-center group">
                                {/* Kana */}
                                <span
                                  className={`text-sm font-japanese leading-none mb-1 transition-colors
                                                ${mora.type === 'sokuon' ? 'text-rose-600 font-bold' : ''}
                                                ${mora.type === 'yoon' || mora.type === 'long' ? 'text-blue-500' : 'text-gray-600'}
                                              `}
                                >
                                  {mora.kana}
                                </span>

                                {/* Romaji */}
                                <span
                                  className={`text-xs font-mono leading-none tracking-tighter uppercase font-medium
                                    ${mora.type === 'sokuon' ? 'text-rose-600 font-bold' : ''}
                                    ${mora.type === 'yoon' || mora.type === 'long' ? 'text-blue-600' : 'text-gray-600'}
                                  `}
                                >
                                  {mora.romaji}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {convertedLines.length === 0 && inputText && (
          <div className="text-center py-12 text-gray-400">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>点击"开始转换"查看结果</p>
          </div>
        )}
      </main>


    </div>
  )
}

export default App
