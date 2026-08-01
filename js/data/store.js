// 本地存储层（localStorage，无云依赖）
window.Store = (function () {
  const KEY = 'qiaoqiao_user_v2'
  const WKEY = 'qiaoqiao_words_v2'
  const AKEY = 'qiaoqiao_articles_v2'

  // ===== 营地物资站（重构：四大板块）=====
  // 板块一：战备口粮（消耗品，兑换后樱桃饱腹即时增加，每日重置为 0%）
  const FOODS = [
    { id: 'dogfood', name: '狗粮', icon: '🦴', img: 'img/items/dog_food.png', effect: '饱腹 +10%', price: 10, full: 10 },
    { id: 'bone', name: '磨牙棒', icon: '🦴', img: 'img/items/bone.png', effect: '饱腹 +15%', price: 15, full: 15 },
    { id: 'can', name: '肉罐头', icon: '🥫', img: 'img/items/can.png', effect: '饱腹 +25%', price: 20, full: 25 },
    { id: 'milk', name: '狗狗牛奶', icon: '🥛', img: 'img/items/milk.png', effect: '饱腹 +30%', price: 20, full: 30 }
  ]
  // 板块二：军衔装束（邱少云皮肤），需达到对应军衔 + 消耗子弹
  const SKINS = [
    { id: 'skin_1', name: '班长装束', rank: '班长', price: 80, img: 'img/skin_1.png' },
    { id: 'skin_2', name: '连长装束', rank: '连长', price: 150, img: 'img/skin_2.png' },
    { id: 'skin_3', name: '营长装束', rank: '营长', price: 250, img: 'img/skin_3.png' },
    { id: 'skin_4', name: '团长装束', rank: '团长', price: 400, img: 'img/skin_4.png' }
  ]
  // 板块三：装备宝库（穿戴配件，按部位叠加，每部位仅一件）
  const EQUIPS = [
    { id: 'tracker', name: '追踪器', slot: 'cherryNeck', who: 'cherry', slotName: '樱桃·颈部', effect: '亲密度 +1', price: 40, icon: '📡', img: 'img/items/tracker.png' },
    { id: 'waterBottle', name: '水壶', slot: 'qiaoWaist', who: 'qiao', slotName: '邱少云·腰间', effect: '装饰', price: 40, icon: '💧', img: 'img/items/water_bottle.png' },
    { id: 'backpack', name: '作战背包', slot: 'qiaoBack', who: 'qiao', slotName: '邱少云·背部', effect: '装饰', price: 50, icon: '🎒', img: 'img/items/backpack.png' },
    { id: 'goggles', name: '战术护目镜', slot: 'cherryEye', who: 'cherry', slotName: '樱桃·眼部', effect: '亲密度 +2', price: 55, icon: '🥽', img: 'img/items/goggles.png' },
    { id: 'compass', name: '指南针', slot: 'qiaoHand', who: 'qiao', slotName: '邱少云·手部', effect: '装饰', price: 60, icon: '🧭', img: 'img/items/compass.png' },
    { id: 'bugle', name: '小军号', slot: 'qiaoHand', who: 'qiao', slotName: '邱少云·手部', effect: '解锁吹号动画', price: 60, icon: '🎺', img: 'img/items/bugle.png' },
    { id: 'saddle', name: '警用鞍具', slot: 'cherryBody', who: 'cherry', slotName: '樱桃·身体', effect: '亲密度 +2', price: 60, icon: '🐎', img: 'img/items/saddle.png' },
    { id: 'telescope', name: '望远镜', slot: 'qiaoHand', who: 'qiao', slotName: '邱少云·手部', effect: '装饰', price: 80, icon: '🔭', img: 'img/items/telescope.png' }
  ]
  // 板块四：军事装备库（武器收藏，兑换后陈列展示，不穿戴）
  const WEAPONS = [
    { id: 'grenade', name: '手榴弹', price: 50, icon: '💣', img: 'img/items/grenade.png' },
    { id: 'pistol', name: '手枪', price: 60, icon: '🔫', img: 'img/items/pistol.png' },
    { id: 'rifle', name: '步枪', price: 100, icon: '🔫', img: 'img/items/rifle.png' },
    { id: 'cannon', name: '大炮', price: 150, icon: '💥', img: 'img/items/cannon.png' },
    { id: 'plane', name: '飞机模型', price: 200, icon: '✈️', img: 'img/items/plane.png' },
    { id: 'dongfeng', name: '东风模型', price: 300, icon: '🚀', img: 'img/items/dongfeng.png' }
  ]

  function defaultUser() {
    return {
      openid: '', totalDays: 0, totalScore: 0,
      cherryFullness: 0, cherryIntimacyScore: 0, cherryIntimacyLevel: 1,
      ownedItems: [], equippedCherry: [], equippedQiao: [], background: false, photoFrame: false,
      militaryRank: 0,
      // 营地物资站（重构字段）
      currentSkin: null,
      ownedSkins: [],
      equippedItems: { waterBottle: false, backpack: false, compass: false, bugle: false, telescope: false, goggles: false, saddle: false, tracker: false },
      militaryCollection: { grenade: false, pistol: false, rifle: false, cannon: false, plane: false, dongfeng: false },
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
    u.cherryIntimacyScore = Math.max(0, (u.cherryIntimacyScore || 0) + n)
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
    // 闯关只管饱腹的前 80%：仅当未达 80% 时累加，封顶 80%（绝不把已喂食喂饱的拉回）；剩余 20% 必须由喂狗粮补满
    if (user.cherryFullness < 80) user.cherryFullness = Math.min(80, user.cherryFullness + 25)
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

  // ---- 营地物资站（重构后）----
  function getFoods() { return FOODS }
  function getSkins() { return SKINS }
  function getEquips() { return EQUIPS }
  function getWeapons() { return WEAPONS }
  // 军衔等级：基于 window.RANK 的累计训练天数
  function rankLevel() {
    const name = getRankInfo().name
    const idx = window.RANK.RANKS.findIndex(r => r.name === name)
    return idx < 0 ? 0 : idx
  }
  function skinUnlocked(skin) {
    const idx = window.RANK.RANKS.findIndex(r => r.name === skin.rank)
    return rankLevel() >= (idx < 0 ? 99 : idx)
  }
  function ownsSkin(id) { return user.ownedSkins.includes(id) }
  function setSkin(id) { if (user.ownedSkins.includes(id)) { user.currentSkin = id; save(); return true } return false }
  function ownsEquip(id) { return user.ownedItems.includes(id) }
  function isEquipOn(id) { return !!user.equippedItems[id] }
  function ownsWeapon(id) { return !!user.militaryCollection[id] }

  // 板块一：战备口粮（消耗品）
  function buyFood(f) {
    if (!f) return null
    // 已满饱：不扣子弹、不弹假 +X%，直接提示已吃饱
    if (user.cherryFullness >= 100) return { ok: true, kind: 'food-full', msg: '樱桃已经吃饱啦 🍖 不用再喂咯' }
    if (user.totalScore < f.price) return { ok: false, msg: '子弹不够，去做任务赚吧！' }
    user.totalScore -= f.price
    user.cherryFullness = Math.min(100, (user.cherryFullness || 0) + f.full)
    save()
    return { ok: true, kind: 'food', msg: '樱桃大口吃起来啦 🦴 谢谢主人！饱腹 +' + f.full + '%' }
  }
  // 板块二：军衔装束（皮肤）
  function buySkin(s) {
    if (!s) return null
    if (!skinUnlocked(s)) return { ok: false, msg: '🔒 晋升「' + s.rank + '」后解锁' }
    if (user.ownedSkins.includes(s.id)) { user.currentSkin = s.id; save(); return { ok: true, kind: 'skin', msg: '已切换为「' + s.name + '」' } }
    if (user.totalScore < s.price) return { ok: false, msg: '子弹不够，去做任务赚吧！' }
    user.totalScore -= s.price
    user.ownedSkins.push(s.id)
    user.currentSkin = s.id
    save()
    return { ok: true, kind: 'skin', msg: '购买并穿戴「' + s.name + '」成功！' }
  }
  // 板块三：装备宝库（配件，购买后需点击穿戴）
  function buyEquip(e) {
    if (!e) return null
    if (user.ownedItems.includes(e.id)) return { ok: false, msg: '已拥有' }
    if (user.totalScore < e.price) return { ok: false, msg: '子弹不够，去做任务赚吧！' }
    user.totalScore -= e.price
    user.ownedItems.push(e.id)
    save()
    return { ok: true, kind: 'equip', msg: '谢谢主人！已购买「' + e.name + '」，点击穿戴' }
  }
  // 穿戴/脱下配件（同部位互斥）
  function toggleEquip(id) {
    const e = EQUIPS.find(x => x.id === id)
    if (!e || !user.ownedItems.includes(id)) return false
    const m = (e.effect.match(/([0-9]+)/) || [])[1]
    if (user.equippedItems[id]) {
      user.equippedItems[id] = false
      if (m) addIntimacy(user, -parseInt(m))
    } else {
      // 同部位其他装备脱下（手部 compass/bugle/telescope 互斥）
      EQUIPS.forEach(o => { if (o.slot === e.slot && o.id !== id) user.equippedItems[o.id] = false })
      user.equippedItems[id] = true
      if (m) addIntimacy(user, parseInt(m))
    }
    save()
    return true
  }
  // 板块四：军事装备库（武器收藏）
  function buyWeapon(w) {
    if (!w) return null
    if (user.militaryCollection[w.id]) return { ok: false, msg: '已收藏' }
    if (user.totalScore < w.price) return { ok: false, msg: '子弹不够，去做任务赚吧！' }
    user.totalScore -= w.price
    user.militaryCollection[w.id] = true
    save()
    return { ok: true, kind: 'weapon', msg: '谢谢主人！已收藏「' + w.name + '」' }
  }
  // 统一购买入口（按 id 自动判定板块）
  function buyItem(id) {
    let r = buyFood(FOODS.find(x => x.id === id))
    if (r) return r
    r = buySkin(SKINS.find(x => x.id === id))
    if (r) return r
    r = buyEquip(EQUIPS.find(x => x.id === id))
    if (r) return r
    r = buyWeapon(WEAPONS.find(x => x.id === id))
    if (r) return r
    return { ok: false, msg: '物品不存在' }
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
  // 识字连通关后自动把"当前课文"推进到 LESSON_ORDER 中的下一课（跨单元连续）；
  // 已是最后一课（全部学完）或当前课异常时返回 null 不推进。
  function advanceLesson() {
    const W = window.WORDS
    if (!W || !W.getLessonOrder) return null
    const order = W.getLessonOrder()
    if (!order || !order.length) return null
    const cu = getCurrentUnit(), cl = String(getCurrentLesson())
    const idx = order.findIndex(x => x.unit === cu && String(x.lesson) === cl)
    if (idx < 0 || idx >= order.length - 1) return null
    const next = order[idx + 1]
    user.currentUnit = next.unit
    user.currentLesson = String(next.lesson)
    save()
    return next
  }
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
    getFoods, getSkins, getEquips, getWeapons,
    buyItem, buyFood, buySkin, buyEquip, buyWeapon, toggleEquip,
    skinUnlocked, ownsSkin, setSkin, ownsEquip, isEquipOn, ownsWeapon,
    checkAdminPassword, setAdminPassword, getActiveUnits, setActiveUnits, getCurrentUnit, setCurrentUnit, getCurrentLesson, setCurrentLesson, advanceLesson,
    getImportedWords, addImportedWord, clearImportedWords,
    getArticles, saveArticle, deleteArticle,
    addHistory, getReport, stageName,
    addWrong, getWrongBank, removeWrong, clearWrong
  }
})()
