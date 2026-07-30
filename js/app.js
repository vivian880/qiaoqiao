// 主控制器
(function () {
  const TASKS = {
    scout: { key: 'scout', name: '侦察连·阅读', icon: '🔭', desc: '阅读理解（读短文答3题）· 突击挑战', baseTotal: 3 },
    artillery: { key: 'artillery', name: '炮兵连·乘除法', icon: '💣', desc: '九九乘除法 · 10题', baseTotal: 10 },
    intel_words: { key: 'intel_words', name: '识字连', icon: '📖', desc: '每日15字 · 全对通关', baseTotal: 15 },
    intel_special: { key: 'intel_special', name: '特训连', icon: '📝', desc: '拼音专项10题 · 全对通关', baseTotal: 10 },
    rifle: { key: 'rifle', name: '步枪连·加减法', icon: '🔫', desc: '100以内加减法 · 10题', baseTotal: 10 },
    logistics: { key: 'logistics', name: '后勤连·综合实践', icon: '🎒', desc: '长度/方向/钟表', baseTotal: 10 }
  }
  // 特训连轮换：周一同音字 / 周二多音字 / 周三前后鼻音 / 周四形近字 / 周五混合挑战（周末无此任务）
  const INTEL_SPECIAL_DESC = { 1: '同音字10题 · 全对通关', 2: '多音字10题 · 全对通关', 3: '前后鼻音10题 · 全对通关', 4: '形近字10题 · 全对通关', 5: '混合挑战10题 · 全对通关', 6: '混合挑战10题', 0: '混合挑战10题' }
  // 每项任务的通关奖励：基础任务 +8 / 突击挑战 +10
  function bulletsFor(key) { return Store.isAssault(key) ? 10 : 8 }
  // 游玩小建议
  const PLAY_TIP = '优先收集子弹喂饱樱桃，富余子弹慢慢收集装扮；终极珍藏装备需要长期坚持训练才能解锁！'
  // 营地物资站·兑换规则说明（四大板块版）
  const SHOP_RULES = '🔸 <b>子弹</b>是这里唯一的货币，靠完成每日作战任务赚取：<br>' +
    '· 基础任务每项完成 <b>+8</b> 子弹<br>' +
    '· 侦察连·阅读完成（周末）<b>+10</b> 子弹<br>' +
    '· 当日全部任务通关 额外 <b>+10</b> 子弹<br>' +
    '· 每日首次点击樱桃 <b>+2</b> 子弹<br>' +
    '· 连续 5 天完成基础任务 一次性 <b>+50</b> 子弹<br><br>' +
    '🍖 <b>战备粮</b>：消耗品，可反复兑换，兑换后樱桃饱腹值即时增加（每日重置为 0%）。<br>' +
    '🎖️ <b>军装库</b>：需达到对应军衔 + 消耗子弹，穿新自动脱旧；未达军衔显示「🔒 晋升XX后解锁」。<br>' +
    '🎒 <b>装备库</b>：配件按部位叠加穿戴，每个部位只能穿一件，已拥有显示「✅已拥有」，已穿戴显示「✅已穿戴」。<br>' +
    '🏠 <b>军备库</b>：武器兑换后陈列收藏，不穿戴到角色身上，按价格从低到高排列。<br>' +
    '⚠️ 子弹不够时按钮会变灰，去做任务赚子弹吧！'

  const app = document.getElementById('app')
  let state = { view: 'home', quiz: null, shopTab: 'feed', admin: { tab: 'words', unit: 1, editArticle: -1, editWord: -1, importOpen: false, importUnit: 1 }, greetShown: false }

  // ---------- 工具 ----------
  function rubyfy(s) {
    if (!s) return ''
    return String(s).replace(/([一-龥])\(([^)]+)\)/g, '<ruby>$1<rt>$2</rt></ruby>')
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) }
  function shuffle(a) { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = x[i]; x[i] = x[j]; x[j] = t } return x }
  function stars(n, total) {
    const got = Math.round(n / total * 5)
    let s = ''
    for (let i = 0; i < 5; i++) s += i < got ? '★' : '☆'
    return s
  }
  // 通关所需正确题数：按家长定的达标线执行「全对制」
  // 侦察3/3、炮兵10/10、情报30/30（认读20+专项10）、步枪10/10、后勤10/10
  // 没通关每天有3次重练机会（每次都是新题）
  function passFor(total) {
    return total
  }
  // 情报处·生字认读：15 字须全部答对才算通关；其余任务为全对制
  function quizPassed(q) {
    if (q.key === 'intel_words') return q.readingCorrect === q.readingTotal
    return q.correctCount >= passFor(q.total)
  }
  function toast(msg) {
    const t = document.createElement('div')
    t.className = 'toast'
    t.textContent = msg
    document.body.appendChild(t)
    setTimeout(() => t.classList.add('show'), 10)
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300) }, 1600)
  }

  // ---------- 形象场景 ----------
  // 穿戴道具叠加坐标：x/y 为道具中心在角色框内的百分比，w 为宽度占角色框宽度百分比
  // （通过 preview.html 测试台校准，2026-07-30）
  const EQUIP_POS = {
    waterBottle: { x: 59, y: 69, w: 19, rot: -10, behind: false },
    backpack:    { x: 40, y: 51, w: 33, rot: -7,  behind: true  },
    compass:     { x: 60, y: 68, w: 9,  rot: 27,  behind: false },
    bugle:       { x: 52, y: 68, w: 29, rot: -25, behind: false },
    telescope:   { x: 52, y: 37, w: 24, rot: 5,   behind: false },
    tracker:     { x: 44, y: 86, w: 16, rot: -13, behind: false },
    goggles:     { x: 50, y: 25, w: 29, rot: -14, behind: false },
    saddle:      { x: 87, y: 70, w: 42, rot: 4,   behind: true  }
  }

  // 生成某个角色身上的穿戴道具叠加层
  function buildOverlays(u, who) {
    if (!u.equippedItems) return ''
    return Store.getEquips().filter(e => e.who === who && u.equippedItems[e.id]).map(e => {
      const p = EQUIP_POS[e.id]
      if (!p || !e.img) return ''
      return `<div class="scene-ov ${p.behind ? 'behind' : 'front'}" style="left:${p.x}%;top:${p.y}%;width:${p.w}%;transform:translate(-50%,-50%) rotate(${p.rot}deg)"><img src="${e.img}" alt="${e.name}"></div>`
    }).join('')
  }

  function buildScene(u) {
    // 双角色同框：邱少云（按当前军衔皮肤）+ 警犬樱桃，含穿戴道具叠加
    const skinImg = u.currentSkin ? ('img/' + u.currentSkin + '.png') : 'img/qiaoqiao.png'
    return `
      <div class="scene-wrap">
        <div class="scene-stage">
          <div class="scene-char qiao-char" data-action="click-qiao">
            <div class="char-inner">
              <img class="char-base" src="${skinImg}" onerror="this.onerror=null;this.src='img/qiaoqiao.png'" alt="邱少云">
              ${buildOverlays(u, 'qiao')}
            </div>
          </div>
          <div class="scene-char cherry-char">
            <div class="char-inner">
              <img class="char-base" src="img/cherry.png" onerror="this.onerror=null;this.src='images/cherry.png'" alt="樱桃">
              ${buildOverlays(u, 'cherry')}
            </div>
            <div class="cherry-thanks">谢谢主人 😊</div>
            <div class="cherry-hearts"><span>💕</span><span>💕</span><span>💕</span></div>
          </div>
        </div>
      </div>`
  }

  // 当前穿戴装备名称条
  function wornNames(u) {
    const eq = Store.getEquips()
    const ids = eq.filter(e => u.equippedItems && u.equippedItems[e.id]).map(e => e.id)
    if (!ids.length) return '<span class="worn-none">还没有穿戴装备，去装备库看看吧</span>'
    return ids.map(id => {
      const it = eq.find(e => e.id === id)
      return it ? `<span class="worn-chip">${it.icon} ${it.name} ✔</span>` : ''
    }).join('')
  }

  // 通用图标渲染：优先图片，失败回退 emoji
  function renderIcon(it, cls = 'shop-icon') {
    if (it.img) return `<div class="${cls}"><img src="${it.img}" alt="${it.name}" onerror="this.onerror=null;this.outerHTML='${it.icon || '⭐'}'"></div>`
    return `<div class="${cls}">${it.icon || '⭐'}</div>`
  }

  // ---------- 渲染：首页 ----------
  function renderHome() {
    const u = Store.getUser()
    const rk = Store.getRankInfo()
    const keys = Store.getTodayKeys()
    const wd = Store.getWeekday()
    const wdName = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][wd]
    let cards = ''
    keys.forEach(k => {
      const t = TASKS[k]
      const passed = Store.isPassed(k)
      const desc = k === 'intel_special' ? (INTEL_SPECIAL_DESC[wd] || t.desc) : t.desc
      cards += `<div class="task-card ${passed ? 'done' : ''}" data-action="go-quiz" data-key="${k}">
        <div class="task-icon">${t.icon}</div>
        <div class="task-info"><div class="task-name">${t.name}</div><div class="task-desc">${desc}</div></div>
        <div class="task-btn">${passed ? '✅ 已完成' : '➡️ 出击'}</div>
      </div>`
    })
    const full = Store.getTodayKeys().every(k => Store.isPassed(k))
    app.innerHTML = `
      <div class="topbar">
        <div class="rank-badge">🎖 ${rk.name} 邱少云</div>
        <div class="stat">🔸 子弹 ${u.totalScore} ${u.streakDays ? '· 🔥 连续打卡 ' + u.streakDays + ' 天' : ''}</div>
        <div class="stat">📅 已训练${u.totalDays}天 ${rk.nextName ? '· 满' + rk.nextNeed + '天升「' + rk.nextName + '」' : '· 已达最高军衔'}</div>
      </div>
      <div class="home-head">
        <button class="admin-entry" data-action="go-admin">🪖 首长指挥部</button>
        <div class="today-label">${wdName} · 今日作战任务</div>
      </div>
      <div class="task-list">${cards}</div>
      ${full ? '<div class="full-tip">🎉 今日任务全部完成！明天再来练</div>' : ''}

      <div class="cherry-zone" data-action="click-cherry">
        ${buildScene(u)}
        <div class="cherry-info">
          <div class="cherry-name">🐕 警犬·樱桃 <span class="stage">${Store.stageName(u.cherryIntimacyLevel)}</span></div>
          <div class="bar-row"><span>饱腹</span><div class="bar"><div class="bar-fill" style="width:${u.cherryFullness}%"></div></div><b>${u.cherryFullness}%</b></div>
          <div class="bar-row"><span>亲密</span><div class="bar pink"><div class="bar-fill" style="width:${u.cherryIntimacyLevel * 10}%"></div></div><b>Lv.${u.cherryIntimacyLevel}</b></div>
          <div class="cherry-hint">👆 点樱桃互动 +2子弹</div>
        </div>
      </div>

      <button class="big-btn btn-pink shop-btn" data-action="go-shop">🎒 营地物资站</button>
      <div class="play-tip-entry" data-action="show-tip">💡 游玩小建议</div>
      <div class="foot-tip">学习数据存在本机浏览器 · 换设备不互通</div>
    `
  }

  // 游玩小建议弹窗
  function showPlayTip() {
    const mask = document.createElement('div')
    mask.className = 'tip-mask'
    mask.innerHTML = `<div class="tip-box">
      <div class="tip-title">💡 游玩小建议</div>
      <div class="tip-body">${PLAY_TIP}</div>
      <button class="big-btn btn-green tip-close">知道啦！</button>
    </div>`
    mask.addEventListener('click', e => {
      if (e.target === mask || e.target.closest('.tip-close')) mask.remove()
    })
    document.body.appendChild(mask)
  }

  // 营地物资站·兑换规则说明弹窗
  function showShopRules() {
    const mask = document.createElement('div')
    mask.className = 'tip-mask'
    mask.innerHTML = `<div class="tip-box">
      <div class="tip-title">📖 兑换规则说明</div>
      <div class="tip-body" style="text-align:left">${SHOP_RULES}</div>
      <button class="big-btn btn-green tip-close">知道啦！</button>
    </div>`
    mask.addEventListener('click', e => {
      if (e.target === mask || e.target.closest('.tip-close')) mask.remove()
    })
    document.body.appendChild(mask)
  }

  // ---------- 渲染：答题 ----------
  function startQuiz(key) {
    const u = Store.getUser()
    const rk = Store.getRankInfo()
    const opts = { units: Store.getActiveUnits(), weekday: Store.getWeekday(), articles: Store.getArticles(), currentUnit: Store.getCurrentUnit(), currentLesson: Store.getCurrentLesson() }
    const gen = window.QH.generate(key, rk, opts)
    let questions = gen.questions.slice()
    const normalTotal = questions.length
    // 错题库复习轮：从本课目的错题库抽 ≤10 道，追加在末尾（第二天再出一轮）
    let reviewCount = 0
    const wb = Store.getWrongBank().filter(w => w.task === key)
    if (wb.length) {
      const cap = Math.min(wb.length, 10)
      shuffle(wb).slice(0, cap).forEach(w => {
        questions.push({ text: w.text, options: w.options.slice(), answer: w.answer, _reviewKey: w.key })
      })
      reviewCount = cap
    }
    const total = questions.length
    const review = Store.isPassed(key)
    state.quiz = {
      key, meta: TASKS[key], questions, article: gen.article, mode: gen.mode,
      total, normalTotal, cur: 0, selected: -1, answered: false, correctCount: 0,
      readingTotal: gen.readingTotal || 0, readingCorrect: 0, reviewCount,
      wrongSel: -1, wrongLogged: false,
      phase: gen.article ? 'article' : 'quiz', review, wrongList: [], allDone: false
    }
    renderQuiz()
  }

  function renderQuiz() {
    const q = state.quiz
    if (!q) { state.view = 'home'; renderHome(); return }
    if (q.phase === 'article') {
      app.innerHTML = `
        <div class="quiz-head">
          <div class="quiz-back" data-action="quiz-back">← 营地</div>
          <span class="quiz-title">${q.meta.icon} ${q.meta.name}</span>
          <span class="quiz-progress"></span>
        </div>
        <div class="article-box">
          <div class="article-title">${rubyfy(q.article.title)}</div>
          <div class="article-body">${rubyfy(q.article.body)}</div>
        </div>
        <button class="big-btn btn-green" data-action="quiz-start">📖 开始答题</button>`
      return
    }
    if (q.phase === 'celebrate') {
      app.innerHTML = `<div class="celebrate"><div class="celebrate-emoji">🎉</div><div class="celebrate-title">大捷！</div><div class="celebrate-sub">今日任务全部通关，额外奖励 子弹 +10</div><button class="big-btn btn-green" data-action="quiz-back">🏠 返回营地</button></div>`
      return
    }
    if (q.phase === 'result') {
      const passed = quizPassed(q)
      const pct = Math.round(q.correctCount / q.total * 100)
      let wrong = ''
      if (q.wrongList.length) {
        wrong = '<div class="wrong-title">错题回顾</div>' + q.wrongList.map(w =>
          `<div class="wrong-item">❌ ${esc(w.text)}<br>你的答案：${esc(w.your)} → 正确：${esc(w.correct)}</div>`).join('')
      }
      let action
      if (passed) {
        action = `<button class="big-btn btn-green" data-action="quiz-back">🏠 返回营地</button>`
      } else {
        const can = Store.canRetry(q.key)
        action = can
          ? `<button class="big-btn btn-green" data-action="quiz-retry">🔁 再练一次（新题）</button><div class="retry-tip">今天还可重练 ${3 - (Store.getUser().retryCount[q.key] || 0)} 次</div>`
          : `<div class="retry-tip">今天已练3次，明天再来吧！</div><button class="big-btn btn-pink" data-action="quiz-back">🏠 返回营地</button>`
      }
      app.innerHTML = `
        <div class="quiz-head"><div class="quiz-back" data-action="quiz-back">← 营地</div><span class="quiz-title">${q.meta.icon} ${q.meta.name}</span><span class="quiz-progress"></span></div>
        <div class="result card">
          <div class="result-emoji">${passed ? '🎖' : '💪'}</div>
          <div class="result-title">${q.review ? '复习完成！' : (passed ? '任务完成！' : '再练一次！')}</div>
          <div class="result-score">答对 <span class="big-num">${q.correctCount}</span> / ${q.total} 题</div>
          <div class="result-stars">${stars(q.correctCount, q.total)}</div>
          <div class="result-bar"><div class="result-bar-fill" style="width:${pct}%"></div></div>
          ${q.review ? '<div class="result-reward">复习模式不重复发奖励</div>' : (passed ? '<div class="result-reward">🔸 子弹 +' + bulletsFor(q.key) + ' · 樱桃饱腹 +25%</div>' : (q.key === 'intel_words' ? '<div class="result-reward">识字连要全部答对才算通关，换一批新题再冲！</div>' : '<div class="result-reward">差一点点，换一批新题再冲！</div>'))}
          ${q.reviewCount ? '<div class="result-reward">📕 本轮含错题复习 ' + q.reviewCount + ' 道（答对已移出错题库）</div>' : ''}
          ${wrong}
          ${action}
        </div>`
      return
    }
    // quiz 逐题
    const item = q.questions[q.cur]
    const isScout = q.key === 'scout'
    const banner = (q.reviewCount > 0 && q.cur === q.normalTotal)
      ? `<div class="review-banner">📕 错题复习轮（共 ${q.reviewCount} 道，答对即移出错题库）</div>` : ''
    let html = `
      <div class="quiz-head">
        <div class="quiz-back" data-action="quiz-back">← 营地</div>
        <span class="quiz-title">${q.meta.icon} ${q.meta.name}${q.review ? ' <span class="review-tag">复习模式</span>' : ''}</span>
        <span class="quiz-progress">${q.cur + 1} / ${q.total}</span>
      </div>
      ${banner}
      <div class="q-text">${rubyfy(esc(item.text))}</div>
      <div class="options">`
    item.options.forEach((o, i) => {
      let cls = 'option'
      if (q.wrongSel === i) cls += ' wrong'
      else if (q.answered && i === item.answer) cls += ' correct'
      html += `<div class="${cls}" data-action="answer" data-i="${i}">${rubyfy(esc(o))}</div>`
    })
    html += `</div>`
    if (q.answered) {
      const ok = q.selected === item.answer
      html += `<div class="fb ${ok ? 'fb-ok' : 'fb-no'}">${ok ? '✅ 答对了！' : '❌ 再想想哦！'}</div>`
    } else if (q.wrongSel >= 0) {
      html += `<div class="fb fb-no">❌ 答错了，再试一次！</div>`
    }
    app.innerHTML = html
  }

  function onAnswer(i) {
    const q = state.quiz
    if (!q || q.phase !== 'quiz') return
    if (q.answered) return                       // 已答对锁定，等待进入下一题
    const item = q.questions[q.cur]
    const isReading = q.cur < q.readingTotal
    if (i === item.answer) {
      q.answered = true
      q.selected = i
      q.correctCount++
      if (isReading) q.readingCorrect++
      if (item._reviewKey) Store.removeWrong(item._reviewKey)   // 复习错题答对 → 移出错题库
      renderQuiz()
      setTimeout(advance, 750)
    } else {
      // 答错 → 给予重新回答机会（不限次，直到答对），并记入错题库
      q.wrongSel = i
      if (!q.wrongLogged) {
        Store.addWrong({ task: q.key, text: item.text, options: item.options.slice(), answer: item.answer })
        q.wrongList.push({ text: item.text, your: item.options[i], correct: item.options[item.answer] })
        q.wrongLogged = true
      }
      renderQuiz()
    }
  }
  function advance() {
    const q = state.quiz
    if (!q) return
    if (q.cur < q.total - 1) {
      q.cur++; q.answered = false; q.selected = -1; q.wrongSel = -1; q.wrongLogged = false
      renderQuiz()
    } else finishQuiz()
  }

  function finishQuiz() {
    const q = state.quiz
    const passed = quizPassed(q)
    let bonus = 0, allDone = false, earned = 0, streakBonus = 0
    if (passed && !q.review) {
      const res = Store.recordPass(q.key)
      bonus = res.bonus; allDone = res.allDone; streakBonus = res.streakBonus || 0
      earned = res.bullets + bonus + streakBonus
    }
    Store.addHistory({ date: Store.todayStr(), type: q.key, total: q.total, correct: q.correctCount, passed, bullets: earned })
    if (passed && !q.review) {
      q.phase = 'result'
      renderQuiz()
      if (streakBonus) setTimeout(() => toast('🔥 连续打卡满' + Store.getUser().streakDays + '天！奖励子弹 +50'), 900)
      if (allDone) setTimeout(() => { q.phase = 'celebrate'; renderQuiz() }, 1000)
      else toast('任务完成！子弹 +' + earned)
    } else {
      q.phase = 'result'
      renderQuiz()
      if (!passed && !q.review) toast('再练一次！')
      else if (q.review) toast('复习完成')
    }
  }

  // ---------- 渲染：营地物资站（四大板块 Tab）----------
  function renderShop() {
    const u = Store.getUser()
    const rk = Store.getRankInfo()
    const tabs = [
      { key: 'feed', name: '🍖 战备粮' },
      { key: 'skin', name: '🎖️ 军装库' },
      { key: 'equip', name: '🎒 装备库' },
      { key: 'weapon', name: '🏠 军备库' }
    ]
    let html = `<div class="shop-head">
      <div class="quiz-back" data-action="go-home">← 营地</div>
      <span class="quiz-title">🎒 营地物资站</span>
      <span class="shop-bullets">🔸 ${u.totalScore}</span>
      <span class="shop-rank">🎖 ${rk.name}</span>
    </div>`
    html += `<div class="play-tip-entry" data-action="show-shoprules">📖 兑换规则说明</div>`
    html += `<div class="shop-scene" data-action="shop-cherry">${buildScene(u)}<div class="worn-row">${wornNames(u)}</div></div>`
    html += `<div class="shop-tabs">` + tabs.map(t =>
      `<div class="shop-tab ${state.shopTab === t.key ? 'on' : ''}" data-action="shop-tab" data-tab="${t.key}">${t.name}</div>`).join('') + `</div>`
    if (state.shopTab === 'feed') html += renderFoods(u)
    else if (state.shopTab === 'skin') html += renderSkins(u)
    else if (state.shopTab === 'equip') html += renderEquips(u)
    else html += renderWeapons(u)
    html += `<div class="play-tip-entry" data-action="show-tip">💡 游玩小建议</div>`
    app.innerHTML = html
  }

  function renderFoods(u) {
    let h = `<div class="shop-panel"><div class="panel-tip">🍖 喂饱警犬樱桃的口粮，兑换后饱腹值即时增加（每日重置为 0%）</div><div class="shop-grid">`
    Store.getFoods().forEach(it => {
      const afford = u.totalScore >= it.price
      const btn = afford
        ? `<div class="shop-buy" data-action="buy" data-id="${it.id}">兑换 🔸${it.price}</div>`
        : `<div class="shop-buy disabled" data-action="buy-poor">需 ${it.price}🔸</div>`
      h += `<div class="shop-item">
        <div class="shop-icon"><img src="${it.img}" alt="${it.name}" onerror="this.onerror=null;this.outerHTML='${it.icon}'"></div>
        <div class="shop-name">${it.name}</div>
        <div class="shop-effect">${it.effect}</div>
        ${btn}
      </div>`
    })
    return h + `</div></div>`
  }

  function renderSkins(u) {
    let h = `<div class="shop-panel"><div class="panel-tip">🎖️ 邱少云军装库：达成对应军衔 + 消耗子弹即可购买穿戴，穿新自动脱旧。默认「新兵装束」初始拥有。</div><div class="skin-grid">`
    Store.getSkins().forEach(it => {
      const unlocked = Store.skinUnlocked(it)
      const worn = u.currentSkin === it.id
      const owned = Store.ownsSkin(it.id)
      let btn
      if (!unlocked) btn = `<div class="shop-buy locked" data-action="buy-poor">🔒 ${it.price}🔸</div>`
      else if (worn) btn = `<div class="shop-owned on">✅ 已穿戴</div>`
      else if (owned) btn = `<div class="shop-owned off" data-action="wear-skin" data-id="${it.id}">👕 点击穿戴</div>`
      else btn = `<div class="shop-buy" data-action="buy-skin" data-id="${it.id}">购买并穿戴 ${it.price}🔸</div>`
      const cls = 'skin-card' + (worn ? ' equipped' : '') + (owned ? ' owned' : '')
      h += `<div class="${cls}">
        <div class="skin-img"><img src="${it.img}" onerror="this.onerror=null;this.src='img/qiaoqiao.png'" alt="${it.name}"></div>
        <div class="skin-name">${it.name}</div>
        <div class="skin-rank">所需军衔：${it.rank}</div>
        ${btn}
      </div>`
    })
    return h + `</div></div>`
  }

  function renderEquips(u) {
    let h = `<div class="shop-panel"><div class="panel-tip">🎒 装备配件：按部位叠加穿戴，每个部位只能穿一件。点击已拥有的可穿戴 / 脱下。</div><div class="shop-grid">`
    Store.getEquips().forEach(it => {
      const owned = Store.ownsEquip(it.id)
      const on = Store.isEquipOn(it.id)
      const afford = u.totalScore >= it.price
      let btn
      if (!owned) btn = afford
        ? `<div class="shop-buy" data-action="buy-equip" data-id="${it.id}">兑换 🔸${it.price}</div>`
        : `<div class="shop-buy disabled" data-action="buy-poor">需 ${it.price}🔸</div>`
      else if (on) btn = `<div class="shop-owned on" data-action="toggle-equip" data-id="${it.id}">✅ 已穿戴 · 点击脱下</div>`
      else btn = `<div class="shop-owned off" data-action="toggle-equip" data-id="${it.id}">✅ 已拥有 · 点击穿戴</div>`
      const cls = 'shop-item' + (on ? ' equipped' : '')
      h += `<div class="${cls}">
        ${owned ? '<span class="shop-badge">✅拥有</span>' : ''}
        <div class="shop-icon"><img src="${it.img}" alt="${it.name}" onerror="this.onerror=null;this.outerHTML='${it.icon}'"></div>
        <div class="shop-name">${it.name}<span class="slot-tag">${it.slotName}</span></div>
        <div class="shop-effect">${it.effect}</div>
        ${btn}
      </div>`
    })
    return h + `</div></div>`
  }

  function renderWeapons(u) {
    let h = `<div class="shop-panel"><div class="panel-tip">🏠 军备库：兑换后陈列收藏，不穿戴到角色身上。按价格从低到高排列。</div><div class="coll-grid">`
    Store.getWeapons().slice().sort((a, b) => a.price - b.price).forEach(it => {
      const owned = Store.ownsWeapon(it.id)
      const afford = u.totalScore >= it.price
      let btn
      if (owned) btn = `<div class="coll-owned">✅ 已收藏</div>`
      else btn = afford
        ? `<div class="shop-buy" data-action="buy-weapon" data-id="${it.id}">解锁 🔸${it.price}</div>`
        : `<div class="shop-buy disabled" data-action="buy-poor">需 ${it.price}🔸</div>`
      const cls = 'coll-item' + (owned ? ' owned' : ' locked')
      h += `<div class="${cls}">
        <div class="coll-icon"><img src="${it.img}" alt="${it.name}" onerror="this.onerror=null;this.outerHTML='${it.icon}'"></div>
        <div class="coll-name">${it.name}</div>
        ${owned ? '<div class="coll-tag">已收藏</div>' : '<div class="coll-price">🔸 ' + it.price + '</div>'}
        ${btn}
      </div>`
    })
    return h + `</div></div>`
  }

  // ---------- 渲染：首长指挥部 ----------
  function renderAdmin() {
    const u = Store.getUser()
    const tabs = [['words', '生字管理'], ['articles', '文章管理'], ['report', '学习报告'], ['progress', '学习进度'], ['score', '积分调整'], ['wrong', '错题库']]
    let html = `<div class="quiz-head"><div class="quiz-back" data-action="go-home">← 营地</div><span class="quiz-title">🪖 首长指挥部</span><span class="quiz-progress"><span class="pw-btn" data-action="admin-pw">🔑 改密码</span></span></div>`
    html += '<div class="admin-tabs">'
    tabs.forEach(t => html += `<div class="admin-tab ${state.admin.tab === t[0] ? 'on' : ''}" data-action="admin-tab" data-tab="${t[0]}">${t[1]}</div>`)
    html += '</div><div class="admin-body">'
    if (state.admin.tab === 'words') html += adminWords()
    else if (state.admin.tab === 'articles') html += adminArticles()
    else if (state.admin.tab === 'report') html += adminReport()
    else if (state.admin.tab === 'progress') html += adminProgress()
    else if (state.admin.tab === 'score') html += adminScore()
    else if (state.admin.tab === 'wrong') html += adminWrong()
    html += '</div>'
    app.innerHTML = html
  }

  function adminWords() {
    const sel = state.admin.unit
    const cu = (typeof sel === 'number' && sel >= 0 && sel <= 8) ? sel : 0
    const all = window.WORDS.CHARS
    const unitOpts = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(u =>
      `<option value="${u}" ${u === cu ? 'selected' : ''}>${u === 0 ? '全部单元' : '第' + u + '单元'}</option>`).join('')
    // 两级选择：第X单元 · 第X课
    const wl = state.admin.wLesson || ''
    let lessonSel = ''
    if (cu > 0) {
      const lessons = window.WORDS.getUnitLessons(cu)
      const lOpts = `<option value="">全部课文</option>` + lessons.map(ls =>
        `<option value="${ls.lesson}" ${ls.lesson === wl ? 'selected' : ''}>${lessonLabel(ls.lesson)} · ${ls.lessonName}</option>`).join('')
      lessonSel = `<select class="unit-select" data-action="set-wlesson">${lOpts}</select>`
    }
    const imported = (window.Store.getImportedWords ? window.Store.getImportedWords() : [])
    let base = cu === 0 ? all : all.filter(w => w.unit === cu)
    let imp = cu === 0 ? imported : imported.filter(w => w.unit === cu)
    if (cu > 0 && wl) { base = base.filter(w => w.lesson === wl); imp = imp.filter(w => w.lesson === wl) }
    const rows = base.map(w => `<div class="word-row">
        <span class="w-c">${esc(w.char)}</span>
        <span class="w-p">${esc(w.pinyin)}</span>
        <span class="w-u">${esc(w.lessonName)}</span>
        <span class="w-t">${esc(w.type)}</span>
      </div>`).join('')
    const impRows = imp.map(w => `<div class="word-row imp">
        <span class="w-c">${esc(w.char)}</span>
        <span class="w-p">${esc(w.pinyin)}</span>
        <span class="w-u">${esc(w.lessonName || ('第' + w.unit + '单元'))}</span>
        <span class="w-t">${esc(w.type)}·导入</span>
      </div>`).join('')
    const iu = state.admin.importUnit || 1
    const iLessons = window.WORDS.getUnitLessons(iu)
    const iuOpts = [1, 2, 3, 4, 5, 6, 7, 8].map(u => `<option value="${u}" ${u === iu ? 'selected' : ''}>第${u}单元</option>`).join('')
    const ilOpts = iLessons.map(ls => `<option value="${ls.lesson}">${lessonLabel(ls.lesson)} · ${ls.lessonName}</option>`).join('')
    const form = state.admin.importOpen ? `<div class="edit-box import-box">
        汉字<input class="e-in" id="iw-char" placeholder="如：苹" maxlength="4">
        拼音<input class="e-in" id="iw-pinyin" placeholder="如：píng" maxlength="12">
        类型<select class="e-in" id="iw-type"><option value="会认">会认</option><option value="会写">会写</option></select>
        <div class="imp-sel">单元<select class="unit-select" data-action="iw-unit">${iuOpts}</select>
        课文<select class="unit-select" data-action="iw-lesson">${ilOpts}</select></div>
        <button class="big-btn btn-green" data-action="import-word-save">保存导入</button>
        <button class="big-btn btn-pink" data-action="import-word-cancel">取消</button>
      </div>` : ''
    const clearBtn = imported.length ? `<button class="add-btn danger" data-action="import-word-clear">清空导入的生字（${imported.length}）</button>` : ''
    return `<div class="word-filter"><label>查看：</label>
        <select class="unit-select" data-action="set-wunit">${unitOpts}</select>
        ${lessonSel}
        <span class="w-count">共 ${base.length} 字${imp.length ? ' + 导入 ' + imp.length : ''}</span>
        <button class="add-btn" data-action="import-word-open">＋ 导入生字</button></div>
      ${form}
      <div class="word-list">${rows}${impRows}</div>
      ${clearBtn}`
  }
  function tagName(t) { return { ty: '同音', qb: '前鼻', hb: '后鼻', pc: '平舌', qc: '翘舌', dy: '多音' }[t] }
  // 课号显示：数字课号 → "第X课"；"识字1/园地1" 等保持原样
  function lessonLabel(lesson) { return /^\d+$/.test(String(lesson)) ? '第' + lesson + '课' : String(lesson) }

  function adminArticles() {
    const list = Store.getArticles()
    let html = list.map((a, i) => {
      if (state.admin.editArticle === i) {
        return `<div class="edit-box">
          标题<input class="e-in" id="ea-title" value="${esc(a.title.replace(/\([^)]*\)/g, ''))}">
          类型<input class="e-in" id="ea-type" value="${esc(a.type)}">
          正文(汉字后用(拼音)标注)<textarea class="e-ta" id="ea-body">${esc(a.body)}</textarea>
          第1题<input class="e-in" id="ea-q0" value="${esc(a.questions[0].q)}">
          选项(逗号分隔)<input class="e-in" id="ea-o0" value="${esc(a.questions[0].options.join(','))}">
          正确项下标(0-3)<input class="e-in" id="ea-a0" value="${a.questions[0].answer}">
          <button class="big-btn btn-green" data-action="article-save" data-i="${i}">保存</button>
          <button class="big-btn btn-pink" data-action="article-cancel">取消</button>
        </div>`
      }
      return `<div class="art-row">
        <span class="art-title">${esc(a.title.replace(/\([^)]*\)/g, ''))}（${esc(a.type)}）</span>
        <span class="art-edit" data-action="article-edit" data-i="${i}">✎</span>
        <span class="art-del" data-action="article-del" data-i="${i}">🗑</span>
      </div>`
    }).join('')
    if (state.admin.editArticle === -2) {
      html = `<div class="edit-box">
        标题<input class="e-in" id="ea-title" value="">
        类型<input class="e-in" id="ea-type" value="">
        正文(汉字后用(拼音)标注)<textarea class="e-ta" id="ea-body"></textarea>
        第1题<input class="e-in" id="ea-q0" value="">
        选项(逗号分隔)<input class="e-in" id="ea-o0" value="">
        正确项下标(0-3)<input class="e-in" id="ea-a0" value="0">
        <button class="big-btn btn-green" data-action="article-save" data-i="-2">保存</button>
        <button class="big-btn btn-pink" data-action="article-cancel">取消</button>
      </div>` + html
    }
    html += `<button class="add-btn" data-action="article-add">＋ 添加文章</button>`
    return html
  }

  function adminReport() {
    const periods = [['today', '今日'], ['week', '本周'], ['month', '本月']]
    let html = '<div class="period-sel">' + periods.map(p => `<button class="period-btn ${state.admin.period === p[0] ? 'on' : ''}" data-action="admin-period" data-p="${p[0]}">${p[1]}</button>`).join('') + '</div>'
    const rep = Store.getReport(state.admin.period || 'today')
    let rows = rep.tasks.map(t => `<tr><td>${t.name}</td><td>${t.done ? '✅' : '⬜'}</td><td>${t.accuracy}</td><td>🔸${t.bullets}</td></tr>`).join('')
    html += `<table class="rep-table"><tr><th>任务</th><th>完成</th><th>正确率</th><th>子弹</th></tr>${rows}</table>
      <div class="rep-total">本时段获得子弹：🔸 ${rep.totalBullets}</div>`
    return html
  }

  function adminProgress() {
    const cu = Store.getCurrentUnit()
    const cl = Store.getCurrentLesson()
    const total = 8
    const learned = Store.getActiveUnits()           // 1..cu
    const set = new Set(learned)
    const pct = (n, t) => t ? Math.round(n / t * 100) : 0

    // —— 单元 + 课文 进度控制（下拉选择）——
    const unitOpts = [1,2,3,4,5,6,7,8].map(u => `<option value="${u}" ${u === cu ? 'selected' : ''}>第${u}单元</option>`).join('')
    const lessons = window.WORDS.getUnitLessons(cu)
    // 修复 undefined：当前课号不在本单元课程列表时，回退到本单元第一课
    const curLs = lessons.find(l => l.lesson === cl) || lessons[0] || { lesson: '1', name: '' }
    const clFixed = curLs.lesson
    const lessonName = curLs.lessonName || ''
    const lessonOpts = lessons.map(ls => `<option value="${ls.lesson}" ${ls.lesson === clFixed ? 'selected' : ''}>${lessonLabel(ls.lesson)} · ${ls.lessonName}</option>`).join('')
    const sel = `<div class="cu-box">
        <div class="cu-progress">🎯 当前进度：第${cu}单元 · ${lessonLabel(clFixed)}《${lessonName}》</div>
        <div class="cu-line">
          <label class="cu-label">🎚 当前学到</label>
          <select class="unit-select" data-action="set-current-unit">${unitOpts}</select>
          <label class="cu-label">单元的</label>
          <select class="unit-select lesson-select" data-action="set-current-lesson">${lessonOpts}</select>
          <label class="cu-label">课文</label>
        </div>
      </div>`

    // —— 阅读 / 语文 出题范围（随单元+课文进度变化）——
    const scoutTotal = window.ARTICLES.length
    const scoutElig = learned.length
      ? window.ARTICLES.filter(a => a.reqUnits.every(u => set.has(u))).length
      : scoutTotal
    const importedAll = (window.Store.getImportedWords ? window.Store.getImportedWords() : [])
    const allChars = window.WORDS.getWords(null).length + importedAll.length
    const importedHere = importedAll.filter(w => (w.lo || 999) <= window.WORDS.loOf(cu, clFixed)).length
    const coveredChars = window.WORDS.getCoveredWords(cu, clFixed).length + importedHere
    const cnScope = `
      <div class="scope-card">
        <div class="sc-head">🔭 侦察连·阅读</div>
        <div class="sc-num">${scoutElig}<span class="sc-sub">/${scoutTotal} 篇</span></div>
        <div class="sc-bar"><div class="sc-fill" style="width:${pct(scoutElig, scoutTotal)}%"></div></div>
        <div class="sc-note">${learned.length ? '已学单元覆盖的文章' : '未设单元 = 全册可读'}</div>
      </div>
      <div class="scope-card">
        <div class="sc-head">📖 识字连</div>
        <div class="sc-num">${coveredChars}<span class="sc-sub">/${allChars} 字</span></div>
        <div class="sc-bar"><div class="sc-fill" style="width:${pct(coveredChars, allChars)}%"></div></div>
        <div class="sc-note">生字范围：第1课 ~ ${lessonLabel(clFixed)}《${lessonName}》，共 ${coveredChars} 字 · 随机抽15字不超纲</div>
      </div>
      <div class="scope-card">
        <div class="sc-head">📝 特训连</div>
        <div class="sc-num">全量<span class="sc-sub">题库</span></div>
        <div class="sc-bar"><div class="sc-fill" style="width:100%"></div></div>
        <div class="sc-note">周一同音 / 周二多音 / 周三前后鼻音 / 周四形近 / 周五混合</div>
      </div>`

    // —— 数学连队（按军衔/训练天数解锁）——
    const rk = Store.getRankInfo()
    const ART_TIERS = ['口诀', '看图列式', '乘法应用', '表内除法', '除法应用', '乘除混合']
    const ART_U = [1, 2, 3, 5, 6, 6]
    const RIF_TIERS = ['不进位', '进位', '退位', '填空', '比大小', '连加连减', '两步应用']
    const RIF_U = [1, 3, 5, 6, 7, 7]
    const LOG_TIERS = ['长度', '方向', '钟表']
    const LOG_U = [1, 2, 3, 3, 3]
    const au = ART_U[rk.level], ru = RIF_U[rk.level], lu = LOG_U[rk.practice]
    const mathCard = (icon, name, tiers, unlocked) => {
      const chips = tiers.map((t, i) => `<span class="tier ${i < unlocked ? 'on' : 'off'}">${t}</span>`).join('')
      return `<div class="scope-card">
        <div class="sc-head">${icon} ${name}</div>
        <div class="sc-num">${unlocked}<span class="sc-sub">/${tiers.length} 类</span></div>
        <div class="sc-bar"><div class="sc-fill" style="width:${pct(unlocked, tiers.length)}%"></div></div>
        <div class="tier-row">${chips}</div>
      </div>`
    }
    const mathCards = mathCard('💣', '炮兵连·乘除法', ART_TIERS, au) +
      mathCard('🔫', '步枪连·加减法', RIF_TIERS, ru) +
      mathCard('🎒', '后勤连·实践', LOG_TIERS, lu)

    return `<div class="progress-box">
      <div class="progress-tip">设置「<b>当前单元 + 当前课文</b>」后：<b>识字连</b>从第1课到该课所有生字随机抽15字（<b>不超纲</b>）；<b>侦察连·阅读</b>按已学单元解锁；<b>特训连</b>按周几轮换专项、从<b>全量题库</b>出题。数学连队按<b>军衔/训练天数</b>解锁。</div>
      <div class="progress-sum">当前学到：第${cu}单元 · ${lessonLabel(clFixed)}《${lessonName}》<br><span class="progress-range">生字范围：第1课 ~ ${lessonLabel(clFixed)}，共 ${coveredChars} 字</span></div>
      <div class="scope-sec"><div class="scope-title">🎚 学习进度</div>${sel}</div>
      <div class="scope-sec"><div class="scope-title">📚 阅读·语文 出题范围（随进度变化）</div><div class="scope-grid">${cnScope}</div></div>
      <div class="scope-sec"><div class="scope-title">🎖 数学连队·按军衔解锁（当前：${rk.name}）</div><div class="scope-grid">${mathCards}</div></div>
    </div>`
  }

  function adminScore() {
    const u = Store.getUser()
    return `<div class="score-box">
      <div class="score-now">当前子弹：🔸 ${u.totalScore}</div>
      <div class="score-row">
        <button class="big-btn btn-green" data-action="adj" data-d="10">+10</button>
        <button class="big-btn btn-green" data-action="adj" data-d="20">+20</button>
        <button class="big-btn btn-green" data-action="adj" data-d="50">+50</button>
      </div>
      <div class="score-row">
        <button class="big-btn btn-pink" data-action="adj" data-d="-10">-10</button>
        <button class="big-btn btn-pink" data-action="adj" data-d="-20">-20</button>
      </div>
      <div class="custom-row">
        <input class="custom-input" id="adj-val" type="number" placeholder="自定义数量">
        <span class="custom-btn add" data-action="adj-custom" data-sign="1">增加</span>
        <span class="custom-btn sub" data-action="adj-custom" data-sign="-1">扣除</span>
      </div>
    </div>`
  }

  function adminWrong() {
    const wb = Store.getWrongBank()
    if (!wb.length) return '<div class="wrongbank-empty">📭 暂无错题记录</div>'
    const meta = { scout: '侦察连·阅读', artillery: '炮兵连·乘除法', intel: '识字连', intel_words: '识字连', intel_special: '特训连', rifle: '步枪连·加减法', logistics: '后勤连·综合实践' }
    const rows = wb.map(w => `<div class="wrong-row">
      <span class="w-task">${meta[w.task] || w.task}</span>
      <span class="w-q">${esc(w.text)}</span>
      <span class="w-a">正确答案：${esc(w.options[w.answer])}</span>
    </div>`).join('')
    return `<div class="wrongbank-box">
      <div class="wrongbank-tip">错题会在第二天对应科目里再出一轮；答对后自动移出。</div>
      ${rows}
      <button class="add-btn" data-action="wrong-clear">🧹 清空错题库</button>
    </div>`
  }

  // ---------- 事件 ----------
  function bindEvents() {
    app.addEventListener('click', e => {
      const el = e.target.closest('[data-action]')
      if (!el) return
      const a = el.dataset.action
      const d = el.dataset
      switch (a) {
        case 'go-quiz':
          if (Store.isPassed(d.key)) { toast('已通关·进入复习'); startQuiz(d.key) }
          else startQuiz(d.key)
          break
        case 'go-shop': state.view = 'shop'; state.shopTab = 'feed'; renderShop(); break
        case 'go-admin': adminGate(); break
        case 'go-home': state.view = 'home'; state.quiz = null; renderHome(); break
        case 'quiz-back': state.view = 'home'; state.quiz = null; renderHome(); break
        case 'quiz-start': state.quiz.phase = 'quiz'; renderQuiz(); break
        case 'answer': onAnswer(parseInt(d.i)); break
        case 'quiz-retry':
          if (Store.canRetry(state.quiz.key)) { Store.incRetry(state.quiz.key); startQuiz(state.quiz.key) }
          else toast('今天已练3次'); break
        case 'click-cherry': {
          // 先播放"吃东西+谢谢主人"动画（无论今天是否已领过奖励，点击都给反馈）
          const wrap = document.querySelector('.cherry-char')
          if (wrap) {
            wrap.classList.remove('eating')
            void wrap.offsetWidth // 强制 reflow，确保动画可重复触发
            wrap.classList.add('eating')
          }
          const add = Store.clickCherry()
          if (add) {
            toast('樱桃开心地吃起来啦 🦴 谢谢主人！子弹 +' + add)
            setTimeout(() => renderHome(), 4800) // 动画结束后再刷新，更新子弹数
          } else {
            toast('樱桃蹭了蹭你 🐾 谢谢主人~')
            setTimeout(() => { const w = document.querySelector('.cherry-char'); if (w) w.classList.remove('eating') }, 4800)
          }
          break
        }
        case 'click-qiao': {
          // 邱少云被点击：俏皮小跳（重新触发动画）
          el.classList.remove('tap')
          void el.offsetWidth // 强制 reflow，确保动画可重复触发
          el.classList.add('tap')
          setTimeout(() => el.classList.remove('tap'), 620)
          toast('邱少云给你敬了个礼 🫡')
          break
        }
        case 'shop-tab': state.shopTab = d.tab; renderShop(); break
        case 'buy': {
          const r = Store.buyItem(d.id)
          if (!r.ok) { toast(r.msg); break }
          toast(r.msg || '兑换成功！')
          if (r.kind === 'food') {
            // 先重渲染（刷新饱腹/子弹），再给重渲染后的狗狗加动画，否则动画会被冲掉
            renderShop()
            const dog = document.querySelector('.shop-scene .cherry-char')
            if (dog) {
              dog.classList.remove('eating')
              void dog.offsetWidth
              dog.classList.add('eating')
              setTimeout(() => { const d2 = document.querySelector('.shop-scene .cherry-char'); if (d2) d2.classList.remove('eating') }, 4800)
            }
          } else renderShop()
          break
        }
        case 'buy-skin': {
          const r = Store.buyItem(d.id)
          if (!r.ok) { toast(r.msg); break }
          toast(r.msg); renderShop(); break
        }
        case 'wear-skin': { if (Store.setSkin(d.id)) toast('穿戴成功！'); renderShop(); break }
        case 'buy-equip': {
          const r = Store.buyItem(d.id)
          if (!r.ok) { toast(r.msg); break }
          toast(r.msg); renderShop(); break
        }
        case 'toggle-equip': { if (Store.toggleEquip(d.id)) toast('已更新穿戴'); renderShop(); break }
        case 'buy-weapon': {
          const r = Store.buyItem(d.id)
          if (!r.ok) { toast(r.msg); break }
          toast(r.msg); renderShop(); break
        }
        case 'buy-poor': toast('子弹不够，去做任务赚吧！'); break
        case 'show-tip': showPlayTip(); break
        case 'show-shoprules': showShopRules(); break
        case 'shop-cherry': break
        case 'admin-tab': state.admin.tab = d.tab; renderAdmin(); break
        case 'admin-period': state.admin.period = d.p; renderAdmin(); break
        case 'article-add': state.admin.editArticle = -2; renderAdmin(); break
        case 'article-edit': state.admin.editArticle = parseInt(d.i); renderAdmin(); break
        case 'article-cancel': state.admin.editArticle = -1; renderAdmin(); break
        case 'article-del': Store.deleteArticle(parseInt(d.i)); state.admin.editArticle = -1; renderAdmin(); break
        case 'article-save': {
          const title = document.getElementById('ea-title').value.trim()
          const type = document.getElementById('ea-type').value.trim()
          const body = document.getElementById('ea-body').value.trim()
          const q = document.getElementById('ea-q0').value.trim()
          const opts = document.getElementById('ea-o0').value.split(',').map(s => s.trim()).filter(Boolean)
          const ans = parseInt(document.getElementById('ea-a0').value)
          if (!title || !body || !q || opts.length < 2 || isNaN(ans)) { toast('请填完整'); break }
          const art = { title, type: type || '生活故事', body, questions: [{ q, options: opts, answer: ans }] }
          Store.saveArticle(art, parseInt(d.i) === -2 ? undefined : parseInt(d.i))
          state.admin.editArticle = -1; renderAdmin(); break
        }
        case 'adj': Store.adjustBullets(parseInt(d.d)); toast('子弹 ' + (parseInt(d.d) > 0 ? '+' : '') + d.d); renderAdmin(); break
        case 'adj-custom': {
          const v = parseInt(document.getElementById('adj-val').value) || 0
          if (!v) { toast('请输入数量'); break }
          Store.adjustBullets(v * parseInt(d.sign)); renderAdmin(); break
        }
        case 'admin-pw': changePw(); break
        case 'wrong-clear': Store.clearWrong(); renderAdmin(); break
        case 'import-word-open': state.admin.importOpen = true; renderAdmin(); break
        case 'import-word-cancel': state.admin.importOpen = false; renderAdmin(); break
        case 'import-word-save': {
          const ch = (document.getElementById('iw-char') || {}).value || ''
          const py = (document.getElementById('iw-pinyin') || {}).value || ''
          const ty = (document.getElementById('iw-type') || {}).value || '会认'
          const iu = state.admin.importUnit || 1
          const ilEl = document.querySelector('[data-action="iw-lesson"]')
          const il = ilEl ? ilEl.value : '1'
          const ln = (window.WORDS.getUnitLessons(iu).find(l => l.lesson === il) || {}).lessonName || ''
          const ok = window.Store.addImportedWord({ char: ch, pinyin: py, unit: iu, lesson: il, lessonName: ln, type: ty })
          if (!ok) toast('请填写汉字和拼音')
          else { toast('已导入「' + ch.trim() + '」'); state.admin.importOpen = false; renderAdmin() }
          break
        }
        case 'import-word-clear': Store.clearImportedWords(); renderAdmin(); break
        // 单元控制（当前学到第X单元）改由下方 change 事件处理（set-current-unit）
      }
    })
    // 下拉选择（当前单元 / 当前课文）
    app.addEventListener('change', e => {
      const el = e.target.closest('[data-action]')
      if (!el) return
      if (el.dataset.action === 'set-current-unit') {
        const n = parseInt(el.value)
        if (n >= 1 && n <= 8) {
          Store.setCurrentUnit(n)
          const first = window.WORDS.getUnitLessons(n)[0]
          if (first) Store.setCurrentLesson(first.lesson)
          renderAdmin()
        }
      } else if (el.dataset.action === 'set-current-lesson') {
        Store.setCurrentLesson(el.value); renderAdmin()
      } else if (el.dataset.action === 'set-wunit') {
        state.admin.unit = parseInt(el.value) || 0; state.admin.wLesson = ''; renderAdmin()
      } else if (el.dataset.action === 'set-wlesson') {
        state.admin.wLesson = el.value; renderAdmin()
      } else if (el.dataset.action === 'iw-unit') {
        state.admin.importUnit = parseInt(el.value) || 1; renderAdmin()
      }
    })
  }

  function adminGate() {
    const pwd = prompt('请输入指挥部密码（默认8888）')
    if (pwd === null) return
    if (Store.checkAdminPassword(pwd)) { state.view = 'admin'; state.admin.tab = 'words'; renderAdmin() }
    else toast('密码错误')
  }
  function changePw() {
    const p1 = prompt('输入新密码')
    if (!p1) return
    const p2 = prompt('再次确认新密码')
    if (p1 !== p2) { toast('两次不一致'); return }
    Store.setAdminPassword(p1); toast('密码已修改')
  }

  // ---------- 启动 ----------
  function maybeGreet() {
    const g = localStorage.getItem('qiaoqiao_greet')
    const t = Store.todayStr()
    if (g !== t && Store.getTodayKeys().some(k => !Store.isPassed(k))) {
      localStorage.setItem('qiaoqiao_greet', t)
      setTimeout(() => toast('邱少云，樱桃等你来训练哦！'), 400)
    }
  }

  // 本地测试专用：仅在 localhost/127.0.0.1 下生效，线上（GitHub Pages）无效
  // 用法：
  //   http://localhost:8083/?bullets=9999&days=999 → 子弹 9999 + 军衔天数 999（团长）
  function devCheat() {
    const h = location.hostname
    if (h !== 'localhost' && h !== '127.0.0.1') return
    const p = new URLSearchParams(location.search)
    const msgs = []
    if (p.has('bullets')) {
      const target = Math.max(0, parseInt(p.get('bullets')) || 9999)
      Store.adjustBullets(target - Store.getUser().totalScore)
      msgs.push('子弹 ' + target + ' 🔸')
    }
    if (p.has('days')) {
      const days = Math.max(0, parseInt(p.get('days')) || 999)
      const u = Store.getUser()
      u.totalDays = days
      Store.save()
      msgs.push('军衔 ' + Store.getRankInfo().name + ' · 累计 ' + days + ' 天')
    }
    if (msgs.length) setTimeout(() => toast('🧪 测试模式：' + msgs.join(' · ')), 500)
  }

  function init() {
    Store.init()
    bindEvents()
    devCheat()
    maybeGreet()
    renderHome()
  }
  init()
})()
