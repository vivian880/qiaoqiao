// 校验语文专项题库结构：避免单选题出现多个正确答案（结构性）
// 检查项：options 长度=3、answer 在 [0,2]、options 无重复值、answer 选项值唯一（不出现两次）
const fs = require('fs')
const path = require('path')
global.window = global
const file = path.join(__dirname, 'js/data/zhuanti.js')
const code = fs.readFileSync(file, 'utf8')
// 去掉可能的 sourcemap/注释不影响；直接 eval
eval(code)

const libs = {
  TongYinZi: global.window.TongYinZi,
  TongYinFill: global.window.TongYinFill,
  DuoYinZi: global.window.DuoYinZi,
  HunYin: global.window.HunYin,
  XingJinZi: global.window.XingJinZi,
  XingJinFill: global.window.XingJinFill,
  PingQiaoShe: global.window.PingQiaoShe,
}

let problems = 0
for (const [name, arr] of Object.entries(libs)) {
  if (!arr) { console.log(`[缺失] ${name} 未定义`); problems++; continue }
  arr.forEach(it => {
    const id = it.id || '(无id)'
    const opts = it.options || []
    const ans = it.answer
    // 1. 选项数
    if (opts.length !== 3) {
      console.log(`[选项数] ${name} ${id} 选项数=${opts.length} (应为3)`); problems++
    }
    // 2. answer 越界
    if (typeof ans !== 'number' || ans < 0 || ans >= opts.length) {
      console.log(`[answer越界] ${name} ${id} answer=${ans}`); problems++
    }
    // 3. 选项重复值（会导致两个索引都"正确"）
    const seen = new Set()
    let dup = false
    opts.forEach(o => { if (seen.has(o)) dup = true; seen.add(o) })
    if (dup) {
      console.log(`[选项重复] ${name} ${id} options=${JSON.stringify(opts)}`); problems++
    }
    // 4. answer 选项值是否唯一（若 answer 选项在 options 中出现 >1 次，则其它同值项也"正确"）
    if (typeof ans === 'number' && opts[ans] != null) {
      const cnt = opts.filter(o => o === opts[ans]).length
      if (cnt > 1) {
        console.log(`[答案不唯一] ${name} ${id} 正确项值="${opts[ans]}" 在选项中出现 ${cnt} 次`); problems++
      }
    }
    // 5. 多音字：目标字在词语中应只出现一次，否则题目有歧义（如"数数"）
    if (name === 'DuoYinZi' && it.word && it.char) {
      const count = (it.word.split(it.char).length - 1)
      if (count > 1) {
        console.log(`[多音字歧义] ${name} ${id} "${it.char}" 在词语「${it.word}」中出现 ${count} 次`); problems++
      }
    }
    // 6. 填空辨析题：prompt 必须含空括号；选项必须是单字
    if (name === 'XingJinFill' || name === 'TongYinFill') {
      if (!it.prompt || !/（\s*）/.test(it.prompt)) {
        console.log(`[填空题缺空] ${name} ${id} prompt="${it.prompt}"`); problems++
      }
      const badOpts = (it.options || []).filter(o => !/^[\u4e00-\u9fff]$/.test(o))
      if (badOpts.length) {
        console.log(`[填空题选项非单字] ${name} ${id} options=${JSON.stringify(it.options)}`); problems++
      }
    }
  })
  console.log(`${name}: 共 ${arr.length} 题，结构检查完成`)
}
console.log(problems === 0 ? '\n✅ 全部通过：无结构性"两个正确答案"' : `\n❌ 共发现 ${problems} 处问题`)
