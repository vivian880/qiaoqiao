// 题目生成器（5个任务）
// 依赖：window.WORDS / window.ARTICLES
// rank 字段（由 rank.js 提供）：{ level, mulTables:[], mulApp, div, addLevel:0-4, practice:0-4 }
// 返回：{ questions:[{text,options:[4],answer}], article? }

(function () {
  const W = window.WORDS
  const A = window.ARTICLES

  // ---------- 通用工具 ----------
  function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a }
  function choice(arr) { return arr[Math.floor(Math.random() * arr.length)] }
  function shuffle(arr) {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  // 非数值答案的兜底干扰池（按答案类型分别准备，尽量贴近题目语境）
  function isPinyin(s) { return typeof s === 'string' && /^[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńň]+$/.test(s) }
  function isSingleChar(s) { return typeof s === 'string' && /^[\u4e00-\u9fff]$/.test(s) }
  const PINYIN_POOL = ['bā', 'mā', 'hǎo', 'shān', 'shuǐ', 'huǒ', 'niǎo', 'yún', 'fēng', 'mén', 'rén', 'kǒu', 'mù', 'huā', 'chī', 'zhī', 'shēng', 'míng', 'xíng', 'yīn', 'yuán', 'xiàng', 'hào', 'zhǎng', 'lè', 'yuè', 'dōu', 'dū', 'zì', 'shù', 'dì', 'tóng', 'fēn', 'yīng']
  const CHAR_POOL = ['人', '口', '手', '日', '月', '水', '火', '山', '石', '田', '木', '禾', '上', '下', '大', '小', '中', '王', '门', '马', '牛', '羊', '鸟', '虫', '云', '雨', '风', '花', '心', '头', '目', '耳']
  const MISC_POOL = ['厘米', '米', '千克', '元', '东', '西', '南', '北', '12', '3', '6', '9', '8:05', '3:25', '10:40', '5:35', '50', '100']
  function fallbackFor(correct) {
    if (isPinyin(correct)) return PINYIN_POOL
    if (isSingleChar(correct)) return CHAR_POOL
    return MISC_POOL
  }
  // 构造4选项，correct 为正确文本，others 为干扰候选
  // 保证最终返回恰好 n 个互不相同的选项（包含 correct）
  function makeOptions(correct, others, n = 4) {
    const set = new Set((others || []).filter(o => o != null && o !== correct))
    const need = n - 1
    if (set.size < need) {
      // 数值答案：用 ±1 ±2... 补足
      if (!isNaN(Number(correct))) {
        let extra = 1
        while (set.size < need && extra < 200) {
          const c1 = String(Number(correct) + extra)
          if (!set.has(c1)) set.add(c1)
          const c2 = String(Number(correct) - extra)
          if (set.size < need && !set.has(c2) && Number(c2) >= 0) set.add(c2)
          extra++
        }
      }
      // 非数值或仍不足：从同类型兜底池补充
      const pool = fallbackFor(correct)
      let i = 0
      while (set.size < need && i < pool.length) {
        const c = pool[i++]
        if (c !== correct && !set.has(c)) set.add(c)
      }
      // 极端兜底：序号拼接，确保一定能凑满
      let k = 1
      while (set.size < need) {
        const c = String(correct) + '·' + k
        if (!set.has(c)) set.add(c)
        k++
      }
    }
    const picked = shuffle([...set]).slice(0, need)
    const opts = shuffle([correct].concat(picked))
    return { options: opts, answer: opts.indexOf(correct) }
  }
  // 加号算式文本
  function op(a, b, sym) { return a + sym + b }

  // ---------- 侦察连·阅读理解（按学习进度出题） ----------
  // 每篇文章标注 reqUnits（所需已学单元）。家长在「学习进度」勾选的单元覆盖该文全部
  // reqUnits 时，此文才会出现——保证阅读内容不超纲、随学习进度逐步解锁。
  // 轮换：每天一篇，整池轮完自动重洗；key 含单元范围，不同进度各自独立轮换。
  // 革命 / 爱国题材类型：阅读出题优先选择这些，强化国防教育
  const PATRIOTIC_TYPES = new Set(['红色故事', '抗战小英雄', '红色榜样', '爱国教育'])

  function genScout(rank, opts) {
    const list = (opts && opts.articles && opts.articles.length) ? opts.articles : A
    const units = (opts && opts.units) || []
    let pool = list
    if (units.length) {
      const set = new Set(units)
      const elig = list.filter(a => (a.reqUnits || []).every(u => set.has(u)))
      if (elig.length) pool = elig            // 不超纲：仅放出已学单元覆盖的文章
    }
    // 优先革命 / 爱国题材：在已解锁文章里，若这批题材有可出题的，则只从这批里轮换
    const rev = pool.filter(a => PATRIOTIC_TYPES.has(a.type))
    const usePool = rev.length ? rev : pool
    const key = 'scout_' + (units.length ? units.slice().sort((a, b) => a - b).join('_') : 'all') + (rev.length ? '_rev' : '')
    const idx = draw(key, usePool.length, 1)[0]
    const a = usePool[idx]
    return {
      article: a,
      questions: a.questions.map(q => ({
        text: q.q, options: q.options.slice(), answer: q.answer
      }))
    }
  }

  // ================= 数学题库（按苏教版二年级上册大纲） =================
  // 确定性生成：每个题型一个固定大库（炮兵990 / 步枪990 / 后勤900）。
  // 每题标注 _lv（最低适用军衔等级），draw 时按当前军衔只放出“已学”部分并轮换，
  // 整库轮完一轮自动重新打乱。rank.level 控制乘除/加减难度，rank.practice 控制后勤深度。

  // ---- 确定性随机数（同一 seed 永远生成同一题，保证轮换稳定） ----
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0
      let t = Math.imul(a ^ (a >>> 15), 1 | a)
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  function rng(seed) {
    const f = mulberry32(seed >>> 0)
    return {
      ri(a, b) { return a + Math.floor(f() * (b - a + 1)) },
      pick(arr) { return arr[Math.floor(f() * arr.length)] }
    }
  }
  // 把 {text,correct,_lv,others?,n?} 转成 UI 题
  function finalize(list) {
    return list.map(q => {
      const o = makeOptions(q.correct, q.others || [], q.n || 4)
      return { text: q.text, options: o.options, answer: o.answer }
    })
  }
  function dedupeKey(q) {
    return q.text + '|' + (q.others ? q.others.join(',') : '') + '|' + q.correct
  }
  function dedupePool(pool) {
    const seen = new Set(), out = []
    for (const q of pool) {
      const k = dedupeKey(q)
      if (seen.has(k)) continue
      seen.add(k)
      out.push(q)
    }
    return out
  }
  // 按军衔从大库抽取 n 题（已学部分轮换；先对 eligible 去重，保证单日/轮换不重复）
  function selectFrom(pool, key, n, level) {
    const elig = dedupePool(pool.filter(q => (q._lv || 0) <= level))
    const idxs = draw(key, elig.length, n)
    return finalize(idxs.map(i => elig[i]))
  }

  // ---------- 炮兵连·乘除法（990） ----------
  // 口诀81 / 看图列式120 / 乘法应用180 / 表内除法162 / 除法应用180 / 乘除混合267
  let _artCache = null
  function buildArtillery() {
    const qs = []
    const A = 81, B = 120, C = 180, D = 162, E = 180, F = 267
    const lvByMax = m => (m <= 4 ? 0 : m <= 6 ? 1 : m <= 7 ? 2 : 3)
    // 1) 口诀 81（1×1 ~ 9×9）
    for (let i = 0; i < A; i++) {
      const a = ((i / 9) | 0) + 1, b = (i % 9) + 1
      qs.push({ text: `${a} × ${b} = ?`, correct: String(a * b), _lv: lvByMax(Math.max(a, b)) })
    }
    // 2) 看图列式 120（每组几个，共几组）
    for (let i = 0; i < B; i++) {
      const r = rng(1000 + i), g = r.ri(2, 5), n = r.ri(2, 6)
      const t = r.pick([
        `每堆${g}个，有${n}堆，一共有几个？`,
        `有${n}盒，每盒${g}支，一共有几支？`,
        `一排${g}张椅子，有${n}排，一共有几张？`
      ])
      qs.push({ text: t, correct: String(g * n), _lv: g <= 4 ? 0 : g <= 6 ? 1 : 2 })
    }
    // 3) 乘法应用 180
    for (let i = 0; i < C; i++) {
      const r = rng(2000 + i), g = r.ri(2, 9), n = r.ri(2, 9)
      const t = r.pick([
        `每盒${g}颗糖，有${n}盒，一共多少颗？`,
        `小明买了${g}袋，每袋${n}个，一共几个？`,
        `一排${g}张桌子，有${n}排，共几张？`
      ])
      qs.push({ text: t, correct: String(g * n), _lv: lvByMax(Math.max(g, n)) })
    }
    // 4) 表内除法 162（用1~9口诀求商）
    for (let i = 0; i < D; i++) {
      const r = rng(3000 + i), a = r.ri(2, 9), b = r.ri(1, 9)
      qs.push({ text: `${a * b} ÷ ${a} = ?`, correct: String(b), _lv: 3 })
    }
    // 5) 除法应用 180
    for (let i = 0; i < E; i++) {
      const r = rng(4000 + i), a = r.ri(2, 9), b = r.ri(2, 5)
      qs.push({ text: `把${a * b}块饼干平均分给${a}个小朋友，每人分几块？`, correct: String(b), _lv: 3 })
    }
    // 6) 乘除混合 267（连乘 / 连除 / 乘除混合）
    for (let i = 0; i < F; i++) {
      const r = rng(5000 + i), mode = i % 3
      if (mode === 0) {
        const a = r.ri(2, 4), b = r.ri(2, 4), c = r.ri(2, 4)
        qs.push({ text: `${a} × ${b} × ${c} = ?`, correct: String(a * b * c), _lv: 1 })
      } else if (mode === 1) {
        const a = r.ri(2, 4), b = r.ri(2, 4), c = r.ri(2, 4), tot = a * b * c
        qs.push({ text: `${tot} ÷ ${a} ÷ ${b} = ?`, correct: String(tot / a / b), _lv: 3 })
      } else {
        const a = r.ri(2, 6), b = r.ri(2, 6), prod = a * b, c = r.ri(2, 6)
        if (prod % c === 0) qs.push({ text: `${a} × ${b} ÷ ${c} = ?`, correct: String(prod / c), _lv: 3 })
        else { const x = r.ri(2, 4), y = r.ri(2, 4), z = r.ri(2, 4); qs.push({ text: `${x} × ${y} × ${z} = ?`, correct: String(x * y * z), _lv: 1 }) }
      }
    }
    return qs
  }
  function genArtillery(rank) {
    if (!_artCache) _artCache = buildArtillery()
    return { questions: selectFrom(_artCache, 'artillery_' + rank.level, 10, rank.level) }
  }

  // ---------- 步枪连·加减法（990） ----------
  // 不进位180 / 进位150 / 退位150 / 填空150 / 比大小120 / 连加连减120 / 应用120
  let _rifleCache = null
  function buildRifle() {
    const qs = []
    const NC = 180, CA = 150, TB = 150, BK = 150, BS = 120, LA = 120, AP = 120
    // 1) 不进位不退位（lv0）
    for (let i = 0; i < NC; i++) {
      const r = rng(100 + i), sym = r.pick(['+', '-'])
      let a, b
      if (sym === '+') { const u1 = r.ri(0, 9), u2 = r.ri(0, 9 - u1), t1 = r.ri(1, 8), t2 = r.ri(0, 8); a = t1 * 10 + u1; b = t2 * 10 + u2 }
      else { const u1 = r.ri(0, 9), u2 = r.ri(0, u1), t1 = r.ri(1, 9), t2 = r.ri(1, t1); a = t1 * 10 + u1; b = t2 * 10 + u2 }
      qs.push({ text: `${a} ${sym} ${b} = ?`, correct: String(sym === '+' ? a + b : a - b), _lv: 0 })
    }
    // 2) 进位加法（lv1）
    for (let i = 0; i < CA; i++) {
      const r = rng(300 + i), u1 = r.ri(1, 9), u2 = r.ri(10 - u1, 9), t1 = r.ri(1, 4), t2 = r.ri(0, 8 - t1)
      const a = t1 * 10 + u1, b = t2 * 10 + u2
      qs.push({ text: `${a} + ${b} = ?`, correct: String(a + b), _lv: 1 })
    }
    // 3) 退位减法（lv1）
    for (let i = 0; i < TB; i++) {
      const r = rng(500 + i), u1 = r.ri(0, 8), u2 = r.ri(u1 + 1, 9), t1 = r.ri(2, 9), t2 = r.ri(1, t1 - 1)
      const a = t1 * 10 + u1, b = t2 * 10 + u2
      qs.push({ text: `${a} - ${b} = ?`, correct: String(a - b), _lv: 1 })
    }
    // 4) 填空（lv2）
    for (let i = 0; i < BK; i++) {
      const r = rng(700 + i), mode = r.ri(0, 2)
      if (mode === 0) { const a = r.ri(12, 80), b = r.ri(10, 40), sum = a + b; qs.push({ text: `${a} + □ = ${sum}，□里填几？`, correct: String(b), _lv: 2 }) }
      else if (mode === 1) { const sum = r.ri(20, 90), b = r.ri(10, sum - 10), a = sum - b; qs.push({ text: `□ + ${a} = ${sum}，□里填几？`, correct: String(b), _lv: 2 }) }
      else { const a = r.ri(20, 80), b = r.ri(10, Math.min(a - 5, 40)), diff = a - b; qs.push({ text: `${a} - □ = ${diff}，□里填几？`, correct: String(b), _lv: 2 }) }
    }
    // 5) 比大小（lv2，3个选项）
    for (let i = 0; i < BS; i++) {
      const r = rng(900 + i), a = r.ri(11, 99), b = r.ri(11, 99)
      const corr = a === b ? '=' : (a > b ? '>' : '<')
      const others = ['>', '<', '='].filter(s => s !== corr)
      qs.push({ text: `${a} ◯ ${b}，◯里填什么？`, correct: corr, _lv: 2, others, n: 3 })
    }
    // 6) 连加连减（lv3）
    for (let i = 0; i < LA; i++) {
      const r = rng(1100 + i), mode = r.ri(0, 2)
      if (mode === 0) { const a = r.ri(10, 30), b = r.ri(10, 30), c = r.ri(10, Math.min(30, 99 - a - b)); qs.push({ text: `${a} + ${b} + ${c} = ?`, correct: String(a + b + c), _lv: 3 }) }
      else if (mode === 1) { const a = r.ri(15, 40), b = r.ri(10, 30), c = r.ri(5, Math.min(a + b - 5, 25)); qs.push({ text: `${a} + ${b} - ${c} = ?`, correct: String(a + b - c), _lv: 3 }) }
      else { const a = r.ri(20, 50), b = r.ri(10, a - 5), c = r.ri(5, b); qs.push({ text: `${a} - ${b} - ${c} = ?`, correct: String(a - b - c), _lv: 3 }) }
    }
    // 7) 应用题（lv4）
    for (let i = 0; i < AP; i++) {
      const r = rng(1300 + i), a = r.ri(15, 40), b = r.ri(10, 30), c = r.ri(5, Math.min(20, a + b - 5))
      qs.push({ text: `小明有${a}颗糖，妈妈又给${b}颗，他吃了${c}颗，还剩几颗？`, correct: String(a + b - c), _lv: 4 })
    }
    return qs
  }
  function genRifle(rank) {
    if (!_rifleCache) _rifleCache = buildRifle()
    return { questions: selectFrom(_rifleCache, 'rifle_' + rank.level, 10, rank.level) }
  }

  // ---------- 后勤部·综合实践（900） ----------
  // 长度300 / 方向250 / 钟表350；practice 控制深度（0基础→1长度换算→2方向进阶→3钟表精确→4全）
  let _logCache = null
  function buildLogistics() {
    const qs = []
    // 长度 300：基础150(lv0) + 换算150(lv1)
    const lenBase = [
      ['铅笔的长度一般用什么单位？', '厘米', ['米', '千克', '元']],
      ['教室的门高一般用什么单位？', '米', ['厘米', '千克', '分']],
      ['一块橡皮大约厚', '1厘米', ['1米', '10厘米', '1千克']],
      ['一根跳绳大约长', '2米', ['2厘米', '20厘米', '2千克']],
      ['小明的手掌宽大约', '10厘米', ['1厘米', '1米', '10米']],
      ['一棵大树大约高', '10米', ['10厘米', '1厘米', '1米']],
      ['数学课本大约长', '25厘米', ['25米', '2厘米', '250米']],
      ['黑板大约长', '4米', ['4厘米', '40厘米', '4千克']],
      ['文具盒大约长', '20厘米', ['20米', '2厘米', '200厘米']],
      ['一支粉笔大约长', '8厘米', ['8米', '80厘米', '8分米']],
      ['小朋友的身高大约是', '1米30厘米', ['1厘米30厘米', '13米', '130米']],
      ['一张床大约长', '2米', ['2厘米', '20厘米', '2千米']]
    ]
    for (let i = 0; i < 150; i++) {
      const t = lenBase[i % lenBase.length]
      qs.push({ text: t[0], correct: t[1], others: t[2], _lv: 0 })
    }
    for (let i = 0; i < 150; i++) {
      const r = rng(2000 + i), mode = r.ri(0, 3)
      if (mode === 0) qs.push({ text: '1米 = ? 厘米', correct: '100', others: ['10', '1000', '1'], _lv: 1 })
      else if (mode === 1) { const n = r.ri(2, 9); qs.push({ text: `${n}米 = ? 厘米`, correct: String(n * 100), others: [String(n * 10), String(n * 1000), String(n)], _lv: 1 }) }
      else if (mode === 2) { const n = r.ri(2, 9); qs.push({ text: `${n}00厘米 = ? 米`, correct: String(n), others: [String(n * 10), String(n * 100), String(n + 1)], _lv: 1 }) }
      else { const d = r.ri(1, 9) * 10; qs.push({ text: `1米 - ${d}厘米 = ? 厘米`, correct: String(100 - d), others: [String(100 - d + 10), String(d), String(100 - d - 10)], _lv: 1 }) }
    }
    // 方向 250：基础125(lv0) + 进阶125(lv2)
    const dirBase = [
      ['太阳从哪个方向升起？', '东', ['西', '南', '北']],
      ['傍晚面对太阳落下的方向，前面是西，后面是？', '北', ['南', '东', '西']],
      ['和“南”相对的方向是？', '北', ['东', '西', '南']],
      ['早晨面向太阳，你的前面是？', '东', ['西', '南', '北']],
      ['秋天大雁从北方飞向温暖的？', '南方', ['北方', '东方', '西方']],
      ['指南针红色指针一般指向？', '北', ['南', '东', '西']],
      ['看地图时，“上北下南，左面是？', '西', ['东', '南', '北']],
      ['地图上通常用“上”表示？', '北', ['南', '东', '西']],
      ['傍晚太阳从西边落下，左边是？', '南', ['北', '东', '西']],
      ['“前北后南，左西右东”中，右面是？', '东', ['西', '南', '北']]
    ]
    const dirAdv = [
      ['面朝北站立，你的左手边是？', '西', ['东', '南', '北']],
      ['面朝东站立，你的右手边是？', '南', ['北', '西', '东']],
      ['面朝西站立，你的后面是？', '东', ['西', '南', '北']],
      ['面朝南站立，你的右手边是？', '西', ['东', '南', '北']],
      ['东北方向和哪个方向相对？', '西南', ['西北', '东南', '北']],
      ['东南方向和哪个方向相对？', '西北', ['东北', '西南', '南']],
      ['旗杆在操场东面，操场在旗杆的？', '西面', ['东面', '南面', '北面']],
      ['小华家在学校的西北方向，学校在小华家的？', '东南', ['西北', '东北', '西南']],
      ['“上北下南，左西右东”是用来看什么图的？', '平面图', ['风景图', '照片', '统计图']],
      ['从学校先向南走，再向东走，能到达学校的？', '东南方向', ['西北方向', '东北方向', '西南方向']]
    ]
    for (let i = 0; i < 125; i++) { const t = dirBase[i % dirBase.length]; qs.push({ text: t[0], correct: t[1], others: t[2], _lv: 0 }) }
    for (let i = 0; i < 125; i++) { const t = dirAdv[i % dirAdv.length]; qs.push({ text: t[0], correct: t[1], others: t[2], _lv: 2 }) }
    // 钟表 350：基础150(lv0) + 精确200(lv3)
    const clockBase = [
      ['中午12点吃饭，时针指向几？', '12', ['3', '6', '9']],
      ['晚上6点看动画片，时针指向几？', '6', ['12', '3', '9']],
      ['早上7点上学，时针指向几？', '7', ['12', '6', '3']],
      ['分针走一圈，时针走一大格，经过了？', '1时', ['1分', '1秒', '12时']],
      ['时针走一大格是？', '1小时', ['1分', '1秒', '10分']],
      ['1时 = ？分', '60', ['6', '10', '100']],
      ['半小时就是？', '30分', ['30秒', '60分', '15分']],
      ['钟面上一共有几个大格？', '12', ['6', '10', '24']],
      ['分针走一小格是？', '1分', ['1时', '5分', '1秒']],
      ['时针指向8，分针指向12，是？', '8时', ['8分', '8秒', '8:30']]
    ]
    const clockAdv = [
      ['时针刚过8，分针指向1，现在是？', '8:05', ['8:50', '7:55', '8:30']],
      ['时针过3，分针指向5，现在是？', '3:25', ['3:05', '3:55', '2:25']],
      ['时针过10，分针指向8，现在是？', '10:40', ['10:08', '10:55', '9:40']],
      ['时针过5，分针指向7，现在是？', '5:35', ['5:07', '5:55', '4:35']],
      ['时针过9，分针指向3，现在是？', '9:15', ['9:45', '8:15', '9:03']],
      ['时针过2，分针指向6，现在是？', '2:30', ['2:06', '2:50', '3:30']],
      ['分针走一小格是？', '1分', ['1时', '5分', '1秒']],
      ['1分 = ？秒', '60', ['6', '10', '100']],
      ['一刻钟是？', '15分', ['15秒', '30分', '10分']],
      ['时针过6，分针指向2，大约是？', '6:10', ['6:02', '6:50', '7:10']]
    ]
    for (let i = 0; i < 150; i++) { const t = clockBase[i % clockBase.length]; qs.push({ text: t[0], correct: t[1], others: t[2], _lv: 0 }) }
    for (let i = 0; i < 200; i++) { const t = clockAdv[i % clockAdv.length]; qs.push({ text: t[0], correct: t[1], others: t[2], _lv: 3 }) }
    return qs
  }
  function genLogistics(rank) {
    if (!_logCache) _logCache = buildLogistics()
    return { questions: selectFrom(_logCache, 'logistics_' + rank.practice, 10, rank.practice) }
  }

  // ---------- 情报处·语文特训 ----------
  // 规则（用户定）：每天 10 字认读 + 专项 10 题（共 20 题）
  //   周一同音字 / 周二多音字 / 周三前后鼻音 / 周四形近字 / 周五平翘舌 / 周末大满贯（混合，周六日）
  // 轮换机制：每个题库维护「打乱顺序 + 指针」，每天从指针处取题不重复；
  //   整库出完一轮后自动重新打乱，从头再来。状态存 localStorage。
  const RKEY = 'qiaoqiao_rotation_v1'
  function loadRot() {
    try { return JSON.parse(window.SafeLS.getItem(RKEY)) || {} } catch (e) { return {} }
  }
  function saveRot(r) { try { window.SafeLS.setItem(RKEY, JSON.stringify(r)) } catch (e) {} }
  function seqOf(n) { const a = []; for (let i = 0; i < n; i++) a.push(i); return a }
  // 从名为 name、大小为 size 的题库轮换取 n 个下标（同一次抽取内不重复）
  function draw(name, size, n) {
    if (!size) return []
    const rot = loadRot()
    let s = rot[name]
    if (!s || s.size !== size || !Array.isArray(s.order) || s.order.length !== size) {
      s = { size, order: shuffle(seqOf(size)), ptr: 0 }
    }
    const out = []
    let guard = 0
    while (out.length < n && guard < size * 4 + n) {
      guard++
      if (s.ptr >= s.order.length) { s.order = shuffle(s.order); s.ptr = 0 } // 整库轮完 → 重洗
      const idx = s.order[s.ptr]
      s.ptr++
      if (out.indexOf(idx) !== -1 && out.length < size) continue
      out.push(idx)
    }
    rot[name] = s
    saveRot(rot)
    return out
  }

  // -- 认读题（看字选拼音，3选项，用于按"单元+课文"进度出题） --
  // reading:true 标记让渲染层把单字放大显示、无括号符号，仅让小朋友选正确读音
  function readingPinyinQuestion(w, all) {
    const others = shuffle(all.filter(x => x.p !== w.p && x.c !== w.c).map(x => x.p))
    const o = makeOptions(w.p, others.slice(0, 8), 3)
    return { text: w.c, options: o.options, answer: o.answer, reading: true }
  }

  // ---------- 语文专项题库（js/data/zhuanti.js：标准三选一格式） ----------
  // 数据项 {id,char,options[3],answer}（多音字另含 word 字段；options 为拼音三选一）。
  // 出题时把选项重新打乱，避免正确答案位置固定。
  function zhuantiQuestion(item, kind) {
    const correct = item.options[item.answer]
    const opts = shuffle(item.options.slice())
    let text, note = ''
    if (kind === 'dy') {
      // 多音字：给出词语，问句中这个字读什么音（不再直接给读音）
      text = item.word ? `${item.char} 在 ${item.word} 里读什么音？` : `${item.char} 怎么读？`
    } else if (kind === 'pq') {
      text = `${item.char} 的正确读音是？`
      note = '注意 平舌音(z/c/s) 与 翘舌音(zh/ch/sh)'
    } else if (kind === 'xj_fill' || kind === 'ty_fill') {
      // 填空辨析：题干是带空括号的短语，选项为形近字/同音字（复用 prompt 字段）
      text = item.prompt || `${item.char} 的正确读音是？`
    } else {
      text = `${item.char} 的正确读音是？`
    }
    return { text, options: opts, answer: opts.indexOf(correct), char: item.char || null, word: item.word || null, note }
  }
  // 从某个专项集合走轮换池抽 n 题
  function zhuantiDraw(lib, key, n, kind) {
    if (!lib || !lib.length) return []
    return draw(key, lib.length, n).map(i => zhuantiQuestion(lib[i], kind))
  }
  function mixedZhuanti(n) {
    // 周末混合挑战(周六/日)：同音(1发音+1填空) + 多音2 + 前后鼻2 + 形近2(填空) + 平翘舌2（n=10）
    return shuffle(
      zhuantiDraw(window.TongYinZi, 'mix_ty', 1, 'ty')
        .concat(zhuantiDraw(window.TongYinFill, 'mix_tyf', 1, 'ty_fill'))
        .concat(zhuantiDraw(window.DuoYinZi, 'mix_dy', 2, 'dy'))
        .concat(zhuantiDraw(window.HunYin, 'mix_hb', 2, 'hb'))
        .concat(zhuantiDraw(window.XingJinFill, 'mix_xjf', 2, 'xj_fill'))
        .concat(zhuantiDraw(window.PingQiaoShe, 'mix_pq', 2, 'pq'))
    )
  }

  // ---------- 任务A：情报处·生字认读（每天都有） ----------
  // 家长在后台选「当前单元 + 当前课文」，系统从第1课到该课所有生字(含家长导入)
  // 随机抽 15 字（不足则全抽），每字 汉字→3拼音选项，全部选对才通关；不超纲。
  // 抽取优先级：先「会认」字、再「会写」字（会写的基本都认识，认读优先练会认的字）；
  // 导入字/无类型字作为兜底填充。
  function genIntelWords(rank, opts) {
    opts = opts || {}
    const cu = (typeof opts.currentUnit === 'number') ? opts.currentUnit : 1   // 当前学到第几单元
    let cl = opts.currentLesson
    if (cl == null) { const uls = W.getUnitLessons(cu); cl = uls.length ? uls[uls.length - 1].lesson : '1' }
    cl = String(cl)
    const uls = W.getUnitLessons(cu)
    // 当「当前课文」是单元最后一课（通常为语文园地）时，视为该单元已学完 → 整单元随机复习
    const isUnitEnd = !!(uls.length && String(uls[uls.length - 1].lesson) === cl)
    const ukey = 'u' + cu + '_l' + cl
    let base, modeLabel
    if (isUnitEnd) {
      // 单元学完：整个单元所有生字随机出题（整单元混出）
      base = W.CHARS.filter(e => e.unit === cu).map(e => ({ c: e.char, p: e.pinyin, group: '', type: e.type }))
      modeLabel = '单元复习 · 整单元随机'
    } else {
      // 当课只出当课的字（不混入其他已学课文）
      base = W.CHARS.filter(e => e.unit === cu && String(e.lesson) === cl).map(e => ({ c: e.char, p: e.pinyin, group: '', type: e.type }))
      modeLabel = '当课生字 · 第' + cl + '课'
    }
    // 家长导入的生字：按 unit（整单元模式）或 unit+lesson（当课模式）匹配
    const imported = (window.Store && window.Store.getImportedWords ? window.Store.getImportedWords() : [])
      .filter(w => Number(w.unit) === cu && (isUnitEnd ? true : String(w.lesson) === cl))
      .map(w => ({ c: w.char, p: w.pinyin, group: '', type: w.type || '会认', imported: true }))
    const all = base.concat(imported)
    // 当课展示该课全部生字；整单元模式最多取 20 字随机
    const need = isUnitEnd ? Math.min(20, all.length) : all.length
    // 优先级分组：会认 > 会写 > 其他（导入/无类型）
    const hasType = w => typeof w.type === 'string' && w.type.length > 0
    const huiRen = all.filter(w => hasType(w) && w.type.indexOf('会认') >= 0)
    const huiXie = all.filter(w => hasType(w) && w.type === '会写')
    const other  = all.filter(w => !hasType(w) || (w.type.indexOf('会认') < 0 && w.type !== '会写'))
    const pick = (group, key, n) => {
      if (!group.length || n <= 0) return []
      const idxs = draw(key, group.length, Math.min(n, group.length))
      return idxs.map(i => group[i])
    }
    const renQ = pick(huiRen, 'words_ren_' + ukey, Math.min(need, huiRen.length))
    const xieQ = pick(huiXie, 'words_xie_' + ukey, Math.min(need - renQ.length, huiXie.length))
    const othQ = pick(other,  'words_oth_' + ukey, Math.min(need - renQ.length - xieQ.length, other.length))
    const sel = renQ.concat(xieQ).concat(othQ)
    const qs = sel.map(w => readingPinyinQuestion(w, all))
    return { questions: qs, mode: modeLabel + ' · ' + sel.length + ' 字', readingTotal: sel.length }
  }

  // ---------- 任务B：情报处·语文专项（周一至周五，周末无） ----------
  // 周一同音字 / 周二多音字 / 周三前后鼻音 / 周四形近字 / 周五平翘舌 / 周末混合（周六日），
  // 每天 10 题三选一，全对通关；题库走轮换池（整库出完自动重洗）。
  function genIntelSpecial(rank, opts) {
    opts = opts || {}
    const wd = (typeof opts.weekday === 'number') ? opts.weekday : new Date().getDay()
    let qs, mode
    if (wd === 1) {
      // 同音字：一半考"读音选拼音"，一半考"同音字填空辨析"（读音一样、字不同）
      qs = shuffle(
        zhuantiDraw(window.TongYinZi, 'zt_ty', 5, 'ty')
          .concat(zhuantiDraw(window.TongYinFill, 'zt_tyf', 5, 'ty_fill'))
      )
      mode = '同音字 10 题'
    }
    else if (wd === 2) { qs = zhuantiDraw(window.DuoYinZi, 'zt_dy', 10, 'dy'); mode = '多音字 10 题' }
    else if (wd === 3) { qs = zhuantiDraw(window.HunYin, 'zt_hb', 10, 'hb'); mode = '前后鼻音 10 题' }
    else if (wd === 4) { qs = zhuantiDraw(window.XingJinFill, 'zt_xjf', 10, 'xj_fill'); mode = '形近字 10 题' }
    else if (wd === 5) { qs = zhuantiDraw(window.PingQiaoShe, 'zt_pq', 10, 'pq'); mode = '平翘舌 10 题' }
    else { qs = mixedZhuanti(10); mode = '混合挑战 10 题' } // 周末(周六/日)出混合；兜底也给混合
    return { questions: qs, mode }
  }

  // ---------- 统一入口 ----------
  function generate(type, rank, opts) {
    opts = opts || {}
    if (type === 'scout') return genScout(rank, opts)
    if (type === 'artillery') return genArtillery(rank)
    if (type === 'intel_words') return genIntelWords(rank, opts)
    if (type === 'intel_special') return genIntelSpecial(rank, opts)
    if (type === 'intel') return genIntelWords(rank, opts)  // 兼容旧键
    if (type === 'rifle') return genRifle(rank)
    if (type === 'logistics') return genLogistics(rank)
    return { questions: [] }
  }

  window.QH = { generate, makeOptions, shuffle }
})()
