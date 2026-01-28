import { useState, useEffect, useRef } from 'react'
import './App.css'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Copy, Trash2, Upload, Music, Languages, Type, Loader2 } from 'lucide-react'
import Kuroshiro from 'kuroshiro'
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji'

interface LyricLine {
  original: string
  hiragana: string
  romaji: string
}

function App() {
  const [inputText, setInputText] = useState('')
  const [convertedLines, setConvertedLines] = useState<LyricLine[]>([])
  const [isConverting, setIsConverting] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const kuroshiroRef = useRef<Kuroshiro | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const initKuroshiro = async () => {
      const kuroshiro = new Kuroshiro()
      try {
        await kuroshiro.init(new KuromojiAnalyzer({ dictPath: '/dict' }))
        kuroshiroRef.current = kuroshiro
        setIsReady(true)
      } catch (err) {
        console.error('Kuroshiro initialization failed:', err)
      }
    }
    initKuroshiro()
  }, [])

  const convertText = async () => {
    if (!inputText.trim() || !kuroshiroRef.current || !isReady) return

    setIsConverting(true)

    try {
      const lines = inputText.split('\n').filter(line => line.trim())

      const converted: LyricLine[] = await Promise.all(lines.map(async (line) => {
        const trimmedLine = line.trim()



        // Convert to Romaji
        const romaji = await kuroshiroRef.current!.convert(trimmedLine, {
          to: 'romaji',
          mode: 'spaced',
          romajiSystem: 'hepburn'
        })

        // Kuroshiro's 'spaced' mode might add spaces even in hiragana? 
        // Let's use 'normal' for hiragana to look like natural Japanese text 
        // unless user wants spaces. Original requirement didn't specify, but usually hiragana is continuous.
        // But screenshot showed "のう天" (no space).
        // Let's use 'normal' for hiragana.

        const hiraganaNormal = await kuroshiroRef.current!.convert(trimmedLine, {
          to: 'hiragana',
          mode: 'normal'
        })

        return {
          original: trimmedLine,
          hiragana: hiraganaNormal,
          romaji: romaji
        }
      }))

      setConvertedLines(converted)
    } catch (error) {
      console.error('Conversion error:', error)
      alert('转换过程中出错，请重试')
    } finally {
      setIsConverting(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      alert('图片上传成功！请手动输入图片中的歌词文本，或使用OCR工具提取后粘贴。')
    }
    reader.readAsDataURL(file)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const clearAll = () => {
    setInputText('')
    setConvertedLines([])
  }

  const exportResult = () => {
    if (convertedLines.length === 0) return

    let result = ''
    convertedLines.forEach(line => {
      result += `${line.original}\n${line.hiragana}\n${line.romaji}\n\n`
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
              <p className="text-xs text-gray-500">日语歌词 → 平假名 + 罗马音</p>
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
                  className="border-2 border-dashed border-rose-200 rounded-lg p-8 text-center cursor-pointer hover:border-rose-400 hover:bg-rose-50/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-10 h-10 text-rose-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-1">点击上传图片或拖拽到此处</p>
                  <p className="text-xs text-gray-400">支持 JPG, PNG 格式</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                  <span className="inline-block w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-center leading-4">!</span>
                  图片上传后请手动输入歌词文本，或使用OCR工具提取
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
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    初始化词库中...
                  </>
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
              <Button
                variant="outline"
                onClick={clearAll}
                disabled={(!inputText && convertedLines.length === 0) || !isReady}
                className="border-rose-200 hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
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
                  复制全部
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {convertedLines.map((line, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-r from-rose-50/50 to-pink-50/50 rounded-xl p-4 border border-rose-100"
                  >
                    <div className="mb-3">
                      <span className="text-xs text-rose-400 font-medium mb-1 block">原文</span>
                      <p className="text-lg font-medium text-gray-800">{line.original}</p>
                    </div>

                    <div className="mb-3">
                      <span className="text-xs text-pink-400 font-medium mb-1 block">平假名</span>
                      <p className="text-base text-gray-700 font-japanese">{line.hiragana}</p>
                    </div>

                    <div>
                      <span className="text-xs text-purple-400 font-medium mb-1 block">罗马音</span>
                      <p className="text-base text-gray-600 font-mono tracking-wide">{line.romaji}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-rose-100">
                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-rose-400"></span>
                    <span>原文</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-pink-400"></span>
                    <span>平假名（五十音）</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-purple-400"></span>
                    <span>罗马音（空格分隔）</span>
                  </div>
                </div>
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

      <footer className="text-center py-6 text-xs text-gray-400">
        <p>日文歌词转换器 · 支持平假名与罗马音转换</p>
      </footer>
    </div>
  )
}

export default App
