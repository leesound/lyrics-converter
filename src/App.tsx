import { useState, useEffect, useRef } from 'react'
import './App.css'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Copy, Trash2, Upload, Music, Languages, Type, Loader2 } from 'lucide-react'
import Kuroshiro from 'kuroshiro'
import KuromojiAnalyzer from 'kuroshiro-analyzer-kuromoji'
import * as wanakana from 'wanakana'

// Define types for the new rendering logic
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
  const kuroshiroRef = useRef<Kuroshiro | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const initKuroshiro = async () => {
      const kuroshiro = new Kuroshiro()
      try {
        // Construct the dictionary path based on the base URL
        const dictPath = import.meta.env.BASE_URL === '/'
          ? '/dict'
          : `${import.meta.env.BASE_URL}dict`

        await kuroshiro.init(new KuromojiAnalyzer({ dictPath }))
        kuroshiroRef.current = kuroshiro
        setIsReady(true)
      } catch (err) {
        console.error('Kuroshiro initialization failed:', err)
        alert('词库初始化失败，请检查网络连接或刷新页面。错误详情：' + err)
      }
    }
    initKuroshiro()
  }, [])

  const parseMoras = (hiragana: string): Mora[] => {
    const moras: Mora[] = []
    const chars = hiragana.split('')

    for (let i = 0; i < chars.length; i++) {
      const char = chars[i]
      const nextChar = chars[i + 1]

      // Helper to check for small kana (Yoon)
      const isSmallKana = (c: string) => /[ぁぃぅぇぉゃゅょ]/.test(c)

      // 1. Check for Yoon (Contracted sounds like 'kya', 'sha')
      if (nextChar && isSmallKana(nextChar)) {
        const combined = char + nextChar
        moras.push({
          kana: combined,
          romaji: wanakana.toRomaji(combined),
          type: 'yoon'
        })
        i++ // Skip next char
        continue
      }

      // 2. Check for Sokuon (Small 'tsu')
      if (char === 'っ' || char === 'ッ') {
        // Predict next consonant for proper Romaji (e.g., 'pp', 'tt')
        let nextConsonant = ''
        if (nextChar) {
          // If next is another kana, convert it to Romaji to get the first letter
          // Handle case where next sound is Yoon (e.g. 'っきゃ' -> kkya)
          if (chars[i + 2] && isSmallKana(chars[i + 2])) {
            const nextMoraRomaji = wanakana.toRomaji(nextChar + chars[i + 2])
            nextConsonant = nextMoraRomaji.charAt(0)
          } else {
            const nextMoraRomaji = wanakana.toRomaji(nextChar)
            nextConsonant = nextMoraRomaji.charAt(0)
          }
        } else {
          // End of word sokuon -> apostrophe or nothing? User prompt implies explicit handling.
          // Let's use apostrophe for safety or just blank if it's strictly mute.
          // But typically it doubles the 'space' or glottal stop.
          nextConsonant = "'"
        }

        moras.push({
          kana: char,
          romaji: nextConsonant, // Display the doubled consonant (e.g. 'p')
          type: 'sokuon'
        })
        continue
      }

      // 3. Check for Long Vowel
      if (char === 'ー') {
        moras.push({
          kana: char,
          romaji: '-',
          type: 'long'
        })
        continue
      }

      // 4. Normal Kana
      // Ensure Katakana is converted to Hiragana for consistency if not already
      // But wanakana.toRomaji handles Katakana too.
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
      // Custom dictionary replacements to fix known tokenizer errors
      const customReplacements: Record<string, string> = {
        '一発': 'いっぱつ',
        '鐘々': 'かねがね',
        'ランデヴー': 'らんでぶー',
        'ヴィ': 'び',
        'ヴェ': 'べ',
        'ヴォ': 'ぼ',
        'ヴァ': 'ば',
        'ゔ': 'ぶ',
        '酩酊': 'めいてい', // Ensure correct reading
      }

      const applyCustomReplacements = (text: string): string => {
        let res = text
        Object.entries(customReplacements).forEach(([key, val]) => {
          res = res.replaceAll(key, val)
        })
        return res
      }

      const lines = inputText.split('\n').filter(line => line.trim())

      // Process each line
      const convertedResult: ConvertedLine[] = await Promise.all(lines.map(async (line) => {
        const trimmedLine = line.trim()

        // Use 'furigana' mode for easy parsing of tokens
        // HTML: <ruby>君<rp>(</rp><rt>きみ</rt><rp>)</rp></ruby>
        const rubyHtml = await kuroshiroRef.current!.convert(applyCustomReplacements(trimmedLine), {
          to: 'hiragana',
          mode: 'furigana'
        })

        // Parse HTML string to extract tokens
        const wordList: Word[] = []

        // Create a temporary DOM element to parse
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = rubyHtml

        // Iterate over child nodes
        tempDiv.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            // Plain text (Kana, punctuation)
            const text = node.textContent?.trim() || ''
            if (!text) return

            // For plain text, we still want to separate by Mora!
            // We should ensure it's Hiragana first if it's Katakana?
            // Wanakana toHiragana is safe.
            const hiraganaText = wanakana.toHiragana(text, { passRomaji: true })

            wordList.push({
              original: '', // No kanji above
              moras: parseMoras(hiraganaText)
            })
          } else if (node.nodeName === 'RUBY') {
            // It's a Kanji word
            let kanji = ''
            let reading = ''

            // Extract Kanji and Reading
            // <ruby> 漢字 <rp>(</rp> <rt>かんじ</rt> <rp>)</rp> </ruby>
            node.childNodes.forEach(child => {
              if (child.nodeType === Node.TEXT_NODE) {
                kanji += child.textContent
              } else if (child.nodeName === 'RT') {
                reading += child.textContent
              }
            })

            // Clean reading (remove spaces if any)
            reading = reading.trim()

            // Post-process reading: Ensure 'ゔ' -> 'ぶ'
            reading = reading.replace(/ゔ/g, 'ぶ')

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
              <p className="text-xs text-gray-500">日语歌词 → 平假名 + 罗马音（精确对齐）</p>
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
                                  className={`text-[10px] font-mono leading-none tracking-tighter uppercase
                                                ${mora.type === 'sokuon' ? 'text-rose-500 font-bold' : ''}
                                                ${mora.type === 'yoon' || mora.type === 'long' ? 'text-blue-400' : 'text-gray-400'}
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

      <footer className="text-center py-6 text-xs text-gray-400">
        <p>日文歌词转换器 · 支持平假名与罗马音转换</p>
      </footer>
    </div>
  )
}

export default App
