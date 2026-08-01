// 校验 WORDS 生字库：模拟识字连出题，确认每道题选项无重复、答案唯一，
// 并排查同字多音标注不一致（潜在歧义）。
const fs = require('fs')
const src = fs.readFileSync('js/data/words.js', 'utf8')

// 提取 CHARS 数组（括号计数，稳健）
const start = src.indexOf('const CHARS = [')
if (start < 0) { console.error('找不到 CHARS'); process.exit(1) }
const i0 = src.indexOf('[', start)
let depth = 0, end = -1
for (let j = i0; j < src.length; j++) { if (src[j] === '[') depth++; else if (src[j] === ']') { depth--; if (depth === 0) { end = j; break } } }
const CHARS = JSON.parse(src.slice(i0, end + 1))
console.log('WORDS 生字总数:', CHARS.length)

// 拼音合法性：允许 a-z + 声调符号(āáǎàēíǐǒúǘǚǜüō) 或 数字声调；至少含一个字母
function isPinyin(p) {
  return /^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+$/i.test(p.trim())
}

let errs = []
let pinyinBad = []
// 1) 基础校验
CHARS.forEach((w, i) => {
  if (!w.char) errs.push(`#${i} 缺 char`)
  if (!w.pinyin) { pinyinBad.push(`#${i} ${w.char || '?'} 拼音为空`); return }
  if (!isPinyin(w.pinyin)) pinyinBad.push(`#${i} ${w.char} 拼音疑似非法: ${w.pinyin}`)
})
// 2) 模拟出题：对每个字生成 3 选 1，检查选项无重复 + 答案唯一
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
function makeOptions(correct, others, n = 3) {
  const set = new Set(others.filter(o => o != null && o !== correct))
  const need = n - 1
  if (set.size < need) {
    // 兜底池：所有不同拼音
    const pool = [...new Set(CHARS.map(x => x.pinyin))].filter(p => p !== correct)
    let i = 0
    while (set.size < need && i < pool.length) { const c = pool[i++]; if (c !== correct && !set.has(c)) set.add(c) }
  }
  const picked = shuffle([...set]).slice(0, need)
  const opts = shuffle([correct].concat(picked))
  return { options: opts, answer: opts.indexOf(correct) }
}
CHARS.forEach(w => {
  const others = shuffle(CHARS.filter(x => x.p !== w.p && x.c !== w.c).map(x => x.p)).slice(0, 8)
  const { options, answer } = makeOptions(w.pinyin, others, 3)
  if (options.length !== 3) errs.push(`${w.char} 选项数≠3: ${JSON.stringify(options)}`)
  if (new Set(options).size !== 3) errs.push(`${w.char} 选项有重复: ${JSON.stringify(options)}`)
  if (answer < 0) errs.push(`${w.char} 正确答案不在选项中`)
})
// 3) 同字多音标注检查（同一 char 出现多个不同拼音 → 潜在歧义，列出供人工核对）
const byChar = {}
CHARS.forEach(w => { (byChar[w.char] = byChar[w.char] || new Set()).add(w.pinyin) })
const multi = Object.entries(byChar).filter(([c, s]) => s.size > 1)
console.log('同字多音标注不一致数:', multi.length)
multi.slice(0, 30).forEach(([c, s]) => console.log('  ', c, '->', [...s].join(', ')))

console.log('\n拼音非法/空:', pinyinBad.length)
pinyinBad.slice(0, 30).forEach(x => console.log('  ', x))
console.log('\n出题结构错误:', errs.length)
errs.slice(0, 40).forEach(x => console.log('  ', x))
console.log(errs.length === 0 && pinyinBad.length === 0 ? '\n✅ WORDS 生字库校验通过（选项无重复、答案唯一）' : '\n❌ 存在问题，见上')
