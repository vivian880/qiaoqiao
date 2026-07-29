// 本地存储层（localStorage，无云依赖）
window.Store = (function () {
  const KEY = 'qiaoqiao_user_v2'
  const WKEY = 'qiaoqiao_words_v2'
  const AKEY = 'qiaoqiao_articles_v2'

  // 营地物资站物品（四类：战备口粮/装备库/军需处/功勋殿堂）
  // slot：穿戴部位（同部位互斥，穿新自动脱旧）；uniform 全套军装为特殊装扮，可与单件叠加
  const SHOP = [
    { id: 'dogfood', cat: 'feed', consumable: true, name: '狗粮', price: 10, icon: '🥫', effect: '饱腹 +20%', wear: null, apply: u => { u.cherryFullness = Math.min(100, u.cherryFullness + 20) } },
    { id: 'bone', cat: 'feed', consumable: true, name: '磨牙棒', price: 15, icon: '🦴', effect: '饱腹 +30%', wear: null, apply: u => { u.cherryFullness = Math.min(100, u.cherryFullness + 30) } },
    { id: 'can', cat: 'feed', consumable: true, name: '肉罐头', price: 20, icon: '🍖', effect: '饱腹 +50%', wear: null, apply: u => { u.cherryFullness = Math.min(100, u.cherryFullness + 50) } },
    { id: 'bow', cat: 'cherry', name: '蝴蝶结', price: 30, icon: '🎀', effect: '亲密度 +1', wear: 'cherry', slot: 'head', slotName: '头部', apply: u => addIntimacy(u, 1) },
    { id: 'boots', cat: 'cherry', name: '小警靴', price: 45, icon: '🥾', effect: '亲密度 +1', wear: 'cherry', slot: 'feet', slotName: '脚部', apply: u => addIntimacy(u, 1) },
    { id: 'medal', cat: 'cherry', name: '勋章', price: 50, icon: '🏅', effect: '亲密度 +2', wear: 'cherry', slot: 'chest', slotName: '胸前', apply: u => addIntimacy(u, 2) },
    { id: 'goggles', cat: 'cherry', name: '护目镜', price: 55, icon: '🥽', effect: '亲密度 +2', wear: 'cherry', slot: 'eyes', slotName: '眼部', apply: u => addIntimacy(u, 2) },
    { id: 'vest', cat: 'cherry', name: '防弹背心', price: 60, icon: '🦺', effect: '亲密度 +2 · 可换色', wear: 'cherry', slot: 'body', slotName: '身体', apply: u => addIntimacy(u, 2) },
    { id: 'sleeve', cat: 'qiao', name: '红袖章', price: 40, icon: '🔴', effect: '邱少云左臂', wear: 'qiao', slot: 'arm', slotName: '左臂' },
    { id: 'cap', cat: 'qiao', name: '军帽', price: 50, icon: '🎩', effect: '邱少云头顶', wear: 'qiao', slot: 'head', slotName: '头部' },
    { id: 'horn', cat: 'qiao', name: '小军号', price: 60, icon: '🎺', effect: '邱少云右手 · 解锁吹号', wear: 'qiao', slot: 'hand', slotName: '手部' },
    { id: 'holster', cat: 'qiao', name: '手枪套', price: 70, icon: '🔫', effect: '邱少云右侧腰间', wear: 'qiao', slot: 'waist', slotName: '腰间' },
    { id: 'glory', cat: 'ultimate', name: '功勋奖章', price: 120, icon: '🎖', effect: '亲密度 +5', wear: 'cherry', slot: 'glory', slotName: '功勋', apply: u => addIntimacy(u, 5) },
    { id: 'uniform', cat: 'ultimate', name: '全套军装', price: 150, icon: '🪖', effect: '邱少云全身 · 可与单件叠加', wear: 'qiao', slot: 'suit', slotName: '全身' },
    { id: 'doghouse', cat: 'ultimate', name: '樱桃小窝', price: 180, icon: '🏠', effect: '背景升级+每日+2子弹', special: 'background' },
    { id: 'frame', cat: 'ultimate', name: '合影相框', price: 200, icon: '🖼', effect: '解锁合影', special: 'frame' }
  ]
  // 防弹背心可选颜色（5 种）
  const VEST_COLORS = [
    { name: '军绿色', color: '#4A6B3D', note: '默认经典款' },
    { name: '迷彩绿', color: '#5B7A3A', note: '丛林迷彩' },
    { name: '沙漠黄', color: '#C4A45A', note: '沙漠作战款' },
    { name: '雪地白', color: '#E8EAE6', note: '雪地伪装款' },
    { name: '中国红', color: '#C41A1A', note: '庆典特别款' }
  ]

  function defaultUser() {
    return {
      openid: '', totalDays: 0, totalScore: 0,
      cherryFullness: 0, cherryIntimacyScore: 0, cherryIntimacyLevel: 1,
      ownedItems: [], equippedCherry: [], equippedQiao: [], background: false, photoFrame: false,
      militaryRank: 0,
      dailyTasks: { scout: false, artillery: false, intel_words: false, intel_special: false, rifle: false, logistics: false },
      retryCount: { scout: 0, artillery: 0, intel_words: 0, intel_special: 0, rifle: 0, logistics: 0 },
      _fullCountedToday: false,
      lastResetDate: '', lastClickCherryDate: '',
      firstUseDate: '',
      vestColor: '#4A6B3D',
      streakDays: 0, lastStreakDate: '',
      adminPassword: '8888',
      activeUnits: [],
      currentUnit: 1,
      currentLesson: '1',
      wrongBank: [],
      importedWords: [],
      history: []
    }
  }

  let user = defaultUser()

  function todayStr() {
    const d = new Date()
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()
  }
  function getWeekday() { return new Date().getDay() } // 0日 1一 ... 6六
  // 周数：以首次打开应用那天所在周为第 1 周（周一为一周起点）
  function mondayOf(d) {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const wd = (x.getDay() + 6) % 7
    x.setDate(x.getDate() - wd)
    return x
  }
  function getWeekNumber() {
    if (!user.firstUseDate) return 1
    const first = mondayOf(new Date(user.firstUseDate))
    const now = mondayOf(new Date())
    const diff = Math.round((now - first) / (7 * 24 * 3600 * 1000))
    return Math.max(1, diff + 1)
  }
  // 每日任务清单（按日期自动显示/隐藏，不显示未开放任务）：
  //   周一~周五：炮兵连 / 识字连 / 特训连 / 步枪连（+第13周起 后勤连）
  //   周六：侦察连·阅读 / 炮兵连 / 识字连 / 步枪连（+第13周起 后勤连）
  //   周日：侦察连·阅读 / 炮兵连 / 识字连 / 步枪连
  //   侦察连·阅读＝突击挑战任务（仅周末）；后勤连第 13 周起开放（周日不显示）
  function getTodayKeys() {
    const d = getWeekday()
    const wk = getWeekNumber()
    let keys
    if (d === 0) keys = ['scout', 'artillery', 'intel_words', 'rifle']
    else if (d === 6) keys = ['scout', 'artillery', 'intel_words', 'rifle', 'logistics']
    else keys = ['artillery', 'intel_words', 'intel_special', 'rifle', 'logistics']
    if (wk < 13) keys = keys.filter(k => k !== 'logistics')
    return keys
  }
  // 突击挑战任务（+10子弹）；其余为基础任务（+8子弹）
  function isAssault(key) { return key === 'scout' }
  // 连续打卡判定所需的 3 项每日基础任务（周一~周日每天都有）
  const STREAK_BASICS = ['artillery', 'rifle', 'intel_words']

  function load() {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      try { user = Object.assign(defaultUser(), JSON.parse(raw)) }
      catch (e) { user = defaultUser() }
    }
    // 旧版迁移：intel → intel_words / intel_special
    const dt = user.dailyTasks || {}, rc = user.retryCount || {}
    if ('intel' in dt) {
      if (dt.intel_words == null) dt.intel_words = !!dt.intel
      if (dt.intel_special == null) dt.intel_special = !!dt.intel
      delete dt.intel
    }
    if (dt.intel_words == null) dt.intel_words = false
    if (dt.intel_special == null) dt.intel_special = false
    if ('intel' in rc) {
      if (rc.intel_words == null) rc.intel_words = rc.intel || 0
      if (rc.intel_special == null) rc.intel_special = rc.intel || 0
      delete rc.intel
    }
    if (rc.intel_words == null) rc.intel_words = 0
    if (rc.intel_special == null) rc.intel_special = 0
    // 首次使用日期（周数基准：首次打开=第1周）
    if (!user.firstUseDate) { user.firstUseDate = todayStr(); save() }
    // 文章库覆盖
    const a = localStorage.getItem(AKEY)
    if (a) { try { window.ARTICLES = JSON.parse(a) } catch (e) {} }
    resetDailyIfNeeded()
  }
  function save() { localStorage.setItem(KEY, JSON.stringify(user)) }
  function saveWords() { localStorage.setItem(WKEY, JSON.stringify(window.WORDS.units)) }
  function saveArticles() { localStorage.setItem(AKEY, JSON.stringify(window.ARTICLES)) }

  function yesterdayStr() {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()
  }
  function resetDailyIfNeeded() {
    const t = todayStr()
    if (user.lastResetDate !== t) {
      user.dailyTasks = { scout: false, artillery: false, intel_words: false, intel_special: false, rifle: false, logistics: false }
      user.retryCount = { scout: 0, artillery: 0, intel_words: 0, intel_special: 0, rifle: 0, logistics: 0 }
      user._fullCountedToday = false
      user.cherryFullness = 0            // 饱腹值每日凌晨自动重置为 0%
      user.lastResetDate = t
      save()
    }
    // 连续打卡：昨天没完成 3 项基础任务 → 天数清零
    if (user.lastStreakDate && user.lastStreakDate !== t && user.lastStreakDate !== yesterdayStr()) {
      user.streakDays = 0
      save()
    }
  }

  function addIntimacy(u, n) {
    u.cherryIntimacyScore += n
    u.cherryIntimacyLevel = Math.min(10, Math.floor(u.cherryIntimacyScore / 10) + 1)
  }
  function stageName(level) {
    if (level <= 2) return '幼犬期'
    if (level <= 5) return '成长期'
    if (level <= 8) return '精英警犬'
    return '功勋警犬'
  }

  // ---- 任务与奖励 ----
  function isPassed(key) { return !!user.dailyTasks[key] }
  function recordPass(key) {
    const keys = getTodayKeys()
    user.dailyTasks[key] = true
    // 基础任务 +8，突击挑战（侦察连·阅读）+10
    const bullets = isAssault(key) ? 10 : 8
    user.totalScore += bullets
    user.cherryFullness = Math.min(100, user.cherryFullness + 25)
    let bonus = 0, allDone = false, streakBonus = 0
    // 当日基础任务 + 突击挑战全部通关 → 额外 +10
    if (keys.every(k => user.dailyTasks[k])) {
      allDone = true
      if (!user._fullCountedToday) {
        user._fullCountedToday = true
        bonus = 10
        user.totalScore += bonus
        user.totalDays += 1
      }
    }
    // 连续打卡：完成 3 项每日基础任务即维持；连续满 5 天一次性 +50（每满5天发一次）
    const t = todayStr()
    if (user.lastStreakDate !== t && STREAK_BASICS.every(k => user.dailyTasks[k])) {
      user.streakDays = (user.lastStreakDate === yesterdayStr()) ? (user.streakDays || 0) + 1 : 1
      user.lastStreakDate = t
      if (user.streakDays > 0 && user.streakDays % 5 === 0) {
        streakBonus = 50
        user.totalScore += streakBonus
      }
    }
    save()
    return { bullets, bonus, allDone, streakBonus }
  }
  function canRetry(key) { return user.retryCount[key] < 3 }
  function incRetry(key) { user.retryCount[key] = (user.retryCount[key] || 0) + 1; save() }

  function clickCherry() {
    const t = todayStr()
    if (user.lastClickCherryDate !== t) {
      user.lastClickCherryDate = t
      let add = 2
      if (user.background) add += 2 // 樱桃小窝每日+2
      user.totalScore += add
      save()
      return add
    }
    return 0
  }

  function adjustBullets(delta) {
    user.totalScore = Math.max(0, user.totalScore + delta)
    save()
    return user.totalScore
  }

  // ---- 营地物资站 ----
  function getShop() { return SHOP }
  function getVestColors() { return VEST_COLORS }
  function getVestColor() { return user.vestColor || '#4A6B3D' }
  function setVestColor(c) {
    if (VEST_COLORS.some(v => v.color === c)) { user.vestColor = c; save(); return true }
    return false
  }
  // 穿戴：同部位只能穿一件，新装扮自动替换旧装扮（旧装扮回到"已拥有"库存）
  function equipItem(id) {
    const item = SHOP.find(s => s.id === id)
    if (!item || !item.wear || !user.ownedItems.includes(id)) return false
    const arr = item.wear === 'cherry' ? user.equippedCherry : user.equippedQiao
    if (item.slot) {
      for (let i = arr.length - 1; i >= 0; i--) {
        const o = SHOP.find(s => s.id === arr[i])
        if (o && o.slot === item.slot && o.id !== id) arr.splice(i, 1)
      }
    }
    if (!arr.includes(id)) arr.push(id)
    save()
    return true
  }
  // 脱下：该部位恢复默认形象，物品回到"已拥有"状态
  function unequipItem(id) {
    const item = SHOP.find(s => s.id === id)
    if (!item || !item.wear) return false
    const arr = item.wear === 'cherry' ? user.equippedCherry : user.equippedQiao
    const idx = arr.indexOf(id)
    if (idx >= 0) { arr.splice(idx, 1); save(); return true }
    return false
  }
  function isEquipped(id) {
    return user.equippedCherry.includes(id) || user.equippedQiao.includes(id)
  }
  function buyItem(id) {
    const item = SHOP.find(s => s.id === id)
    if (!item) return { ok: false, msg: '物品不存在' }
    // 消耗品（战备口粮）可反复兑换；一次性装扮才走"已拥有"拦截
    if (!item.consumable && user.ownedItems.includes(id)) return { ok: false, msg: '已拥有' }
    if (user.totalScore < item.price) return { ok: false, msg: '子弹不够，去做任务赚吧！' }
    user.totalScore -= item.price
    if (!item.consumable) user.ownedItems.push(id)
    if (item.special === 'background') user.background = true
    if (item.special === 'frame') user.photoFrame = true
    if (item.apply) item.apply(user)
    save()
    // 装扮类兑换后即时穿戴（同部位自动替换），形象即时更新
    if (item.wear) equipItem(id)
    return { ok: true }
  }

  // ---- 家长后台 ----
  function checkAdminPassword(p) { return p === user.adminPassword }
  function setAdminPassword(p) { user.adminPassword = p; save() }
  function getActiveUnits() {
    // 已学单元 = 第 1 ~ currentUnit 单元（单一进度控制，替代原先的多选）
    const cu = user.currentUnit || 1
    const arr = []
    for (let i = 1; i <= cu; i++) arr.push(i)
    return arr
  }
  function getCurrentUnit() { return user.currentUnit || 1 }
  function setCurrentUnit(n) { user.currentUnit = Math.max(1, Math.min(8, n | 0)); save() }
  function getCurrentLesson() { return user.currentLesson || '1' }
  function setCurrentLesson(l) { user.currentLesson = (typeof l === 'string' && l) ? l : '1'; save() }
  function setActiveUnits(arr) { user.activeUnits = arr; save() }

  // ---- 家长导入生字（持久化在 user.importedWords，随进度门控参与出题） ----
  function getImportedWords() { return user.importedWords || [] }
  function addImportedWord(w) {
    const unit = Number(w.unit) || 1
    const lesson = String(w.lesson || '1')
    const lo = (window.WORDS && window.WORDS.loOf) ? window.WORDS.loOf(unit, lesson) : 999
    const item = {
      char: String(w.char || '').trim(),
      pinyin: String(w.pinyin || '').trim(),
      unit, lesson,
      lessonName: String(w.lessonName || ''),
      type: (w.type === '会写') ? '会写' : '会认',
      lo, imported: true
    }
    if (!item.char || !item.pinyin) return false
    if (!user.importedWords) user.importedWords = []
    user.importedWords.push(item); save(); return true
  }
  function clearImportedWords() { user.importedWords = []; save() }

  function getArticles() { return window.ARTICLES }
  function saveArticle(art, idx) {
    if (typeof idx === 'number' && idx >= 0) window.ARTICLES[idx] = art
    else window.ARTICLES.push(art)
    saveArticles()
  }
  function deleteArticle(idx) { window.ARTICLES.splice(idx, 1); saveArticles() }

  function addHistory(rec) { user.history.push(rec); save() }
  function getReport(period) {
    const t = todayStr()
    const d = new Date()
    const monday = new Date(d)
    const wd = (d.getDay() + 6) % 7
    monday.setDate(d.getDate() - wd)
    const month = d.getMonth(), year = d.getFullYear()
    const inRange = (dateStr) => {
      if (period === 'today') return dateStr === t
      if (period === 'week') { const x = new Date(dateStr); return x >= monday }
      if (period === 'month') { const x = new Date(dateStr); return x.getMonth() === month && x.getFullYear() === year }
      return false
    }
    const keys = getTodayKeys()
    const meta = { scout: '侦察连·阅读', artillery: '炮兵连·乘除法', intel_words: '识字连', intel_special: '特训连', rifle: '步枪连·加减法', logistics: '后勤连·综合实践' }
    const tasks = keys.map(k => {
      const recs = user.history.filter(h => h.type === k && inRange(h.date))
      const passed = recs.some(h => h.passed)
      const correct = recs.reduce((s, h) => s + h.correct, 0)
      const total = recs.reduce((s, h) => s + h.total, 0)
      const bullets = recs.reduce((s, h) => s + (h.bullets || 0), 0)
      return { key: k, name: meta[k], done: passed, accuracy: total ? Math.round(correct / total * 100) + '%' : '—', bullets }
    })
    const totalBullets = tasks.reduce((s, x) => s + x.bullets, 0)
    return { tasks, totalBullets }
  }

  function getUser() { return user }
  function getRankInfo() { return window.RANK.getRank(user.totalDays) }

  // ---- 错题库（答错后记录，第二天对应科目再出一轮；答对即移出） ----
  function wrongKey(task, text, answer) { return task + '|' + text + '|' + answer }
  function addWrong(q) {
    if (!user.wrongBank) user.wrongBank = []
    const item = { key: wrongKey(q.task, q.text, q.answer), task: q.task, text: q.text, options: q.options.slice(), answer: q.answer, date: todayStr() }
    if (!user.wrongBank.some(x => x.key === item.key)) { user.wrongBank.push(item); save() }
  }
  function getWrongBank() { return user.wrongBank || [] }
  function removeWrong(key) { if (!user.wrongBank) return; const i = user.wrongBank.findIndex(x => x.key === key); if (i >= 0) { user.wrongBank.splice(i, 1); save() } }
  function clearWrong() { user.wrongBank = []; save() }

  return {
    init: load, save, todayStr, getWeekday, getWeekNumber, getTodayKeys,
    getUser, getRankInfo,
    isPassed, recordPass, canRetry, incRetry, clickCherry, adjustBullets, isAssault,
    getShop, buyItem, equipItem, unequipItem, isEquipped,
    getVestColors, getVestColor, setVestColor,
    checkAdminPassword, setAdminPassword, getActiveUnits, setActiveUnits, getCurrentUnit, setCurrentUnit, getCurrentLesson, setCurrentLesson,
    getImportedWords, addImportedWord, clearImportedWords,
    getArticles, saveArticle, deleteArticle,
    addHistory, getReport, stageName,
    addWrong, getWrongBank, removeWrong, clearWrong
  }
})()
