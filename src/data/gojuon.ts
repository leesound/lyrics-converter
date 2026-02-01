export interface Kana {
    hira: string;
    kata: string;
    romaji: string;
}

export const gojuonRows: (Kana | null)[][] = [
    // A-row
    [
        { hira: 'あ', kata: 'ア', romaji: 'a' },
        { hira: 'い', kata: 'イ', romaji: 'i' },
        { hira: 'う', kata: 'ウ', romaji: 'u' },
        { hira: 'え', kata: 'エ', romaji: 'e' },
        { hira: 'お', kata: 'オ', romaji: 'o' },
    ],
    // Ka-row
    [
        { hira: 'か', kata: 'カ', romaji: 'ka' },
        { hira: 'き', kata: 'キ', romaji: 'ki' },
        { hira: 'く', kata: 'ク', romaji: 'ku' },
        { hira: 'け', kata: 'ケ', romaji: 'ke' },
        { hira: 'こ', kata: 'コ', romaji: 'ko' },
    ],
    // Sa-row
    [
        { hira: 'さ', kata: 'サ', romaji: 'sa' },
        { hira: 'し', kata: 'シ', romaji: 'shi' },
        { hira: 'す', kata: 'ス', romaji: 'su' },
        { hira: 'せ', kata: 'セ', romaji: 'se' },
        { hira: 'そ', kata: 'ソ', romaji: 'so' },
    ],
    // Ta-row
    [
        { hira: 'た', kata: 'タ', romaji: 'ta' },
        { hira: 'ち', kata: 'チ', romaji: 'chi' },
        { hira: 'つ', kata: 'ツ', romaji: 'tsu' },
        { hira: 'て', kata: 'テ', romaji: 'te' },
        { hira: 'と', kata: 'ト', romaji: 'to' },
    ],
    // Na-row
    [
        { hira: 'な', kata: 'ナ', romaji: 'na' },
        { hira: 'に', kata: 'ニ', romaji: 'ni' },
        { hira: 'ぬ', kata: 'ヌ', romaji: 'nu' },
        { hira: 'ね', kata: 'ネ', romaji: 'ne' },
        { hira: 'の', kata: 'ノ', romaji: 'no' },
    ],
    // Ha-row
    [
        { hira: 'は', kata: 'ハ', romaji: 'ha' },
        { hira: 'ひ', kata: 'ヒ', romaji: 'hi' },
        { hira: 'ふ', kata: 'フ', romaji: 'fu' },
        { hira: 'へ', kata: 'ヘ', romaji: 'he' },
        { hira: 'ほ', kata: 'ホ', romaji: 'ho' },
    ],
    // Ma-row
    [
        { hira: 'ま', kata: 'マ', romaji: 'ma' },
        { hira: 'み', kata: 'ミ', romaji: 'mi' },
        { hira: 'む', kata: 'ム', romaji: 'mu' },
        { hira: 'め', kata: 'メ', romaji: 'me' },
        { hira: 'も', kata: 'モ', romaji: 'mo' },
    ],
    // Ya-row
    [
        { hira: 'や', kata: 'ヤ', romaji: 'ya' },
        null,
        { hira: 'ゆ', kata: 'ユ', romaji: 'yu' },
        null,
        { hira: 'よ', kata: 'ヨ', romaji: 'yo' },
    ],
    // Ra-row
    [
        { hira: 'ら', kata: 'ラ', romaji: 'ra' },
        { hira: 'り', kata: 'リ', romaji: 'ri' },
        { hira: 'る', kata: 'ル', romaji: 'ru' },
        { hira: 'れ', kata: 'レ', romaji: 're' },
        { hira: 'ろ', kata: 'ロ', romaji: 'ro' },
    ],
    // Wa-row & N
    [
        { hira: 'わ', kata: 'ワ', romaji: 'wa' },
        null,
        null,
        null,
        { hira: 'を', kata: 'ヲ', romaji: 'wo' },
    ],
    [
        { hira: 'ん', kata: 'ン', romaji: 'n' },
        null, null, null, null
    ]
];
