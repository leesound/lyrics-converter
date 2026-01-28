import { useState, useRef } from 'react'
import './App.css'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Copy, Trash2, Upload, Music, Languages, Type } from 'lucide-react'
import * as wanakana from 'wanakana'

interface LyricLine {
  original: string
  hiragana: string
  romaji: string
}

function App() {
  const [inputText, setInputText] = useState('')
  const [convertedLines, setConvertedLines] = useState<LyricLine[]>([])
  const [isConverting, setIsConverting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 常用汉字到假名的映射表（歌词常用汉字）
  const kanjiToKana: Record<string, string> = {
    '君': 'きみ', '名': 'な', '私': 'わたし', '僕': 'ぼく', '俺': 'おれ',
    '人': 'ひと', '友': 'とも', '仲間': 'なかま', '家族': 'かぞく', '親': 'おや',
    '子': 'こ', '子供': 'こども', '母': 'はは', '父': 'ちち', '兄': 'あに',
    '姉': 'あね', '弟': 'おとうと', '妹': 'いもうと', '彼': 'かれ', '彼女': 'かのじょ',
    '自分': 'じぶん', '皆': 'みんな', '先生': 'せんせい', '学生': 'がくせい',
    '愛': 'あい', '恋': 'こい', '心': 'こころ', '夢': 'ゆめ', '想': 'おも',
    '寂': 'さび', '淋': 'さみ', '悲': 'かな', '哀': 'あわ', '愁': 'うれ',
    '喜': 'よろこ', '嬉': 'うれ', '幸': 'しあわ', '福': 'ふく', '願': 'ねが',
    '祈': 'いの', '望': 'のぞ', '期待': 'きたい', '叶': 'かな', '本当': 'ほんとう',
    '嘘': 'うそ', '誠': 'まこと', '信': 'しん', '疑': 'うたが', '確': 'たし',
    '寂しい': 'さびしい', '悲しい': 'かなしい', '嬉しい': 'うれしい', '幸せ': 'しあわせ',
    '空': 'そら', '海': 'うみ', '風': 'かぜ', '雨': 'あめ', '雪': 'ゆき',
    '花': 'はな', '星': 'ほし', '月': 'つき', '太陽': 'たいよう', '光': 'ひかり',
    '影': 'かげ', '夜': 'よる', '朝': 'あさ', '昼': 'ひる', '夕': 'ゆう',
    '時': 'とき', '今': 'いま', '昔': 'むかし', '未来': 'みらい', '過去': 'かこ',
    '今日': 'きょう', '明日': 'あした', '昨日': 'きのう', '世界': 'せかい',
    '春': 'はる', '夏': 'なつ', '秋': 'あき', '冬': 'ふゆ', '季節': 'きせつ',
    '山': 'やま', '川': 'かわ', '池': 'いけ', '湖': 'みずうみ', '森': 'もり',
    '林': 'はやし', '木': 'き', '竹': 'たけ', '草': 'くさ', '葉': 'は',
    '鳥': 'とり', '雀': 'すずめ', '鶴': 'つる', '鴉': 'からす', '犬': 'いぬ',
    '猫': 'ねこ', '兎': 'うさぎ', '狐': 'きつね', '狼': 'おおかみ', '熊': 'くま',
    '鹿': 'しか', '猿': 'さる', '馬': 'うま', '牛': 'うし', '羊': 'ひつじ',
    '魚': 'さかな', '鯉': 'こい', '鮭': 'さけ', '鮪': 'まぐろ', '鯛': 'たい',
    '蛍': 'ほたる', '蝶': 'ちょう', '蝉': 'せみ',
    '国': 'くに', '町': 'まち', '家': 'いえ', '部屋': 'へや', '道': 'みち',
    '駅': 'えき', '学校': 'がっこう', '教室': 'きょうしつ', '会社': 'かいしゃ',
    '店': 'みせ', '病院': 'びょういん', '上': 'うえ', '下': 'した',
    '左': 'ひだり', '右': 'みぎ', '中': 'なか', '外': 'そと', '前': 'まえ',
    '後': 'うしろ', '間': 'あいだ', '隣': 'となり', '北': 'きた', '南': 'みなみ',
    '東': 'ひがし', '西': 'にし',
    '見': 'み', '見る': 'みる', '聞': 'き', '聞く': 'きく', '話': 'はな',
    '言': 'い', '思': 'おも', '知': 'し', '分': 'わ', '感': 'かん',
    '忘': 'わす', '記': 'き', '書': 'か', '読': 'よ', '歌': 'うた',
    '声': 'こえ', '音': 'おと', '持': 'も', '使': 'つか', '作': 'つく',
    '買': 'か', '売': 'う', '送': 'おく', '開': 'あ', '閉': 'し',
    '入': 'はい', '出': 'で', '立': 'た', '座': 'すわ', '寝': 'ね',
    '起': 'お', '働': 'はたら', '休': 'やす', '遊': 'あそ', '泳': 'およ',
    '切': 'き', '押': 'お', '引': 'ひ', '投': 'な', '乗': 'の',
    '降': 'お', '着': 'き', '脱': 'ぬ', '洗': 'あら', '始': 'はじ',
    '終': 'お', '続': 'つづ', '止': 'と', '待': 'ま', '急': 'いそ',
    '助': 'たす', '守': 'まも', '育': 'そだ', '生': 'い', '死': 'し',
    '痛': 'いた', '歩': 'ある', '走': 'はし', '飛': 'と', '来': 'く',
    '行': 'い', '帰': 'かえ', '戻': 'もど', '通': 'とお', '過': 'す',
    '食': 'た', '食べる': 'たべる', '飲': 'の', '飲む': 'のむ', '料理': 'りょうり',
    '朝食': 'ちょうしょく', '昼食': 'ちゅうしょく', '夕食': 'ゆうしょく',
    '晩': 'ばん', '水': 'みず', '茶': 'ちゃ', '紅茶': 'こうちゃ',
    '牛乳': 'ぎゅうにゅう', '肉': 'にく', '野菜': 'やさい', '果物': 'くだもの',
    '米': 'こめ', '寿司': 'すし', '酒': 'さけ', '砂糖': 'さとう',
    '塩': 'しお', '醤油': 'しょうゆ', '味噌': 'みそ',
    '大': 'おお', '小': 'ちい', '高': 'たか', '低': 'ひく', '長': 'なが',
    '短': 'みじか', '広': 'ひろ', '狭': 'せま', '多': 'おお', '少': 'すく',
    '新': 'あたら', '古': 'ふる', '良': 'よ', '悪': 'わる', '美': 'うつく',
    '強': 'つよ', '弱': 'よわ', '早': 'はや', '遅': 'おそ', '近': 'ちか',
    '遠': 'とお', '簡単': 'かんたん', '難': 'むずか', '忙': 'いそが',
    '暇': 'ひま', '暑': 'あつ', '寒': 'さむ', '暖': 'あたた', '涼': 'すず',
    '甘': 'あま', '辛': 'から', '苦': 'にが', '酸': 'す', '甘い': 'あまい',
    '辛い': 'からい', '苦い': 'にがい', '酸っぱい': 'すっぱい',
    '一': 'いち', '二': 'に', '三': 'さん', '四': 'よん', '五': 'ご',
    '六': 'ろく', '七': 'なな', '八': 'はち', '九': 'きゅう', '十': 'じゅう',
    '百': 'ひゃく', '千': 'せん', '万': 'まん', '円': 'えん', '年': 'とし',
    '歳': 'さい', '日': 'にち', '週': 'しゅう', '曜': 'よう',
    '一人': 'ひとり', '二人': 'ふたり', '三人': 'さんにん', '一緒': 'いっしょ',
    '何': 'なに', '誰': 'だれ', '何時': 'いつ', '何故': 'なぜ', '幾': 'いく',
    '全': 'すべ', '全部': 'ぜんぶ', '他': 'ほか', '残': 'のこ',
    '音楽': 'おんがく', '曲': 'きょく', '詞': 'し', '詩': 'し', '絵': 'え',
    '画': 'が', '写真': 'しゃしん', '色': 'いろ', '赤': 'あか', '青': 'あお',
    '白': 'しろ', '黒': 'くろ', '黄色': 'きいろ', '緑': 'みどり', '紫': 'むらさき',
    '橙': 'だいだい', '灰': 'はい', '銀': 'ぎん', '金': 'きん',
    '車': 'くるま', '電車': 'でんしゃ', '自転車': 'じてんしゃ',
    '仕事': 'しごと', '掃除': 'そうじ', '練習': 'れんしゅう', '勉強': 'べんきょう',
    '怪我': 'けが', '病': 'やまい', '涙': 'なみだ', '汗': 'あせ', '息': 'いき',
    '呼吸': 'こきゅう', '実': 'じつ', '現': 'げん', '在': 'ざい', '存在': 'そんざい',
    '真': 'しん', '偽': 'にせ', '正': 'ただ', '誤': 'あやま', '善': 'ぜん',
    '優': 'やさ', '劣': 'おと', '勝': 'か', '負': 'ま',
    '得': 'え', '失': 'うしな', '増': 'ふ', '減': 'へ', '変': 'か',
    '同': 'おな', '異': 'こと', '似': 'に', '特': 'とく', '別': 'わか',
    '離': 'はな', '会': 'あ', '集': 'あつ', '並': 'なら', '順': 'じゅん',
    '番': 'ばん', '目': 'め', '回': 'かい', '度': 'ど', '毎': 'まい',
    '各': 'かく', '欠': 'か', '足': 'た', '満': 'み', '充': 'じゅう',
    '豊': 'ゆた', '富': 'とみ', '貧': 'まず', '裕': 'ゆう', '乏': 'とぼ',
    '栄': 'さか', '華': 'はな', '盛': 'さか', '衰': 'おとろ', '敗': 'やぶ',
    '滅': 'ほろ', '亡': 'な', '跡': 'あと', '印': 'しるし', '録': 'ろく',
    '証': 'しょう', '例': 'れい', '最': 'もっと', '極': 'きわ', '頂': 'いただ',
    '底': 'そこ', '根': 'ね', '元': 'もと', '本': 'ほん', '源': 'みなもと',
    '由': 'よし', '理由': 'りゆう', '訳': 'わけ', '意味': 'いみ', '味': 'あじ',
    '香': 'か', '臭': 'くさ', '触': 'さわ', '覚': 'おぼ', '悟': 'さと',
    '気': 'き', '精': 'せい', '神': 'かみ', '霊': 'れい', '魂': 'たましい',
    '妙': 'みょう', '不思議': 'ふしぎ', '謎': 'なぞ', '秘': 'ひ', '密': 'みつ',
    '公開': 'こうかい', '個': 'こ', '体': 'からだ', '身': 'み', '姿': 'すがた',
    '形': 'かたち', '容': 'よう', '貌': 'ぼう', '顔': 'かお', '額': 'ひたい',
    '眉': 'まゆ', '瞳': 'ひとみ', '鼻': 'はな', '頬': 'ほお', '耳': 'みみ',
    '口': 'くち', '唇': 'くちびる', '歯': 'は', '舌': 'した', '顎': 'あご',
    '首': 'くび', '肩': 'かた', '腕': 'うで', '肘': 'ひじ', '手': 'て',
    '掌': 'てのひら', '指': 'ゆび', '爪': 'つめ', '胸': 'むね', '腹': 'はら',
    '腰': 'こし', '尻': 'しり', '膝': 'ひざ', '肌': 'はだ',
    '皮': 'かわ', '膚': 'はだ', '骨': 'ほね', '血': 'ち', '脳': 'のう',
    '神経': 'しんけい', '心臓': 'しんぞう', '胃': 'い', '腸': 'ちょう', '肝': 'きも',
    '服': 'ふく', '衣': 'ころも', '制服': 'せいふく', '着物': 'きもの', '浴衣': 'ゆかた',
    '帯': 'おび', '袴': 'はかま', '襟': 'えり', '袖': 'そで', '靴': 'くつ',
    '帽子': 'ぼうし', '傘': 'かさ', '袋': 'ふくろ', '鞄': 'かばん', '布': 'ぬの',
    '絹': 'きぬ', '綿': 'わた', '麻': 'あさ', '毛': 'け', '革': 'かわ',
    '毛皮': 'けがわ', '宝石': 'ほうせき', '銅': 'どう', '鉄': 'てつ', '鋼': 'はがね',
    '水晶': 'すいしょう', '珠': 'たま', '玉': 'たま', '琥珀': 'こはく', '真珠': 'しんじゅ',
    '貝': 'かい', '漆': 'うるし', '陶器': 'とうき', '硝子': 'がらす', '扇': 'おうぎ',
    '団扇': 'うちわ',
  }

  const convertKanjiToKana = (text: string): string => {
    let result = ''
    let i = 0
    
    while (i < text.length) {
      let matched = false
      for (let len = Math.min(4, text.length - i); len >= 1; len--) {
        const substr = text.slice(i, i + len)
        if (kanjiToKana[substr]) {
          result += kanjiToKana[substr]
          i += len
          matched = true
          break
        }
      }
      
      if (!matched) {
        const char = text[i]
        if (wanakana.isKatakana(char)) {
          result += wanakana.toHiragana(char)
        } else {
          result += char
        }
        i++
      }
    }
    
    return result
  }

  const kanaToRomaji: Record<string, string> = {
    'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
    'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
    'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
    'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
    'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
    'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
    'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
    'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
    'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
    'わ': 'wa', 'を': 'wo', 'ん': 'n',
    'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
    'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
    'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
    'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
    'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
    'きゃ': 'kya', 'きゅ': 'kyu', 'きょ': 'kyo',
    'しゃ': 'sha', 'しゅ': 'shu', 'しょ': 'sho',
    'ちゃ': 'cha', 'ちゅ': 'chu', 'ちょ': 'cho',
    'にゃ': 'nya', 'にゅ': 'nyu', 'にょ': 'nyo',
    'ひゃ': 'hya', 'ひゅ': 'hyu', 'ひょ': 'hyo',
    'みゃ': 'mya', 'みゅ': 'myu', 'みょ': 'myo',
    'りゃ': 'rya', 'りゅ': 'ryu', 'りょ': 'ryo',
    'ぎゃ': 'gya', 'ぎゅ': 'gyu', 'ぎょ': 'gyo',
    'じゃ': 'ja', 'じゅ': 'ju', 'じょ': 'jo',
    'びゃ': 'bya', 'びゅ': 'byu', 'びょ': 'byo',
    'ぴゃ': 'pya', 'ぴゅ': 'pyu', 'ぴょ': 'pyo',
    'ー': '-',
    '、': ',', '。': '.', '！': '!', '？': '?',
    '「': '"', '」': '"', '『': '"', '』': '"',
    '・': '·', ' ': ' ', '　': ' ',
  }

  const hiraganaToRomajiWithSpaces = (hiragana: string): string => {
    const result: string[] = []
    let i = 0
    
    while (i < hiragana.length) {
      if (i + 1 < hiragana.length) {
        const twoChars = hiragana.slice(i, i + 2)
        if (kanaToRomaji[twoChars]) {
          result.push(kanaToRomaji[twoChars])
          i += 2
          continue
        }
      }
      
      const char = hiragana[i]
      if (kanaToRomaji[char]) {
        result.push(kanaToRomaji[char])
      } else {
        result.push(char)
      }
      i++
    }
    
    return result.join(' ')
  }

  const convertText = () => {
    if (!inputText.trim()) return
    
    setIsConverting(true)
    
    const lines = inputText.split('\n').filter(line => line.trim())
    const converted: LyricLine[] = lines.map(line => {
      const trimmedLine = line.trim()
      
      const kanaText = convertKanjiToKana(trimmedLine)
      
      const hiragana = wanakana.toHiragana(kanaText, { 
        passRomaji: true,
        convertLongVowelMark: true 
      })
      
      const romaji = hiraganaToRomajiWithSpaces(hiragana)
      
      return {
        original: trimmedLine,
        hiragana,
        romaji
      }
    })
    
    setConvertedLines(converted)
    setIsConverting(false)
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
                disabled={!inputText.trim() || isConverting}
                className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white"
              >
                <Languages className="w-4 h-4 mr-2" />
                {isConverting ? '转换中...' : '开始转换'}
              </Button>
              <Button
                variant="outline"
                onClick={clearAll}
                disabled={!inputText && convertedLines.length === 0}
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
