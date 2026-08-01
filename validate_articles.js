// 结构校验：阅读文库（window.ARTICLES）
const fs = require('fs')
const code = fs.readFileSync('js/data/articles.js', 'utf8')
const window = {}
eval(code)
const arts = window.ARTICLES
let problems = 0, totalQ = 0, counts = {}
for (const a of arts) {
  const n = a.questions.length
  counts[n] = (counts[n] || 0) + 1
  for (let qi = 0; qi < n; qi++) {
    const q = a.questions[qi]
    totalQ++
    const opts = q.options
    if (!Array.isArray(opts) || opts.length < 2) { console.log(`✗ ${a.title} Q${qi+1}: 选项不足`); problems++; continue }
    if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= opts.length) { console.log(`✗ ${a.title} Q${qi+1}: answer 越界 ${q.answer}`); problems++; continue }
    // 选项去重
    const set = new Set(opts.map(o => String(o)))
    if (set.size !== opts.length) { console.log(`✗ ${a.title} Q${qi+1}: 选项有重复 -> ${opts.join('/')}`); problems++ }
  }
}
console.log(`文章 ${arts.length} 篇，题目 ${totalQ} 道；每篇题数分布:`, counts)
console.log(problems === 0 ? '✅ 阅读文库结构全部合法（答案索引正确、选项无重复）' : `❌ 发现 ${problems} 处问题`)
