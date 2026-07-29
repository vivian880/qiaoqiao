// 军衔解锁表
// 累计训练天数(当天所有开放任务全通计1天) → 军衔 → 各项难度
window.RANK = (function () {
  const RANKS = [
    { level: 0, name: '新兵', need: 0,
      addLevel: 0, mulTables: [2, 3, 4], mulApp: false, div: false, practice: 0 },
    { level: 1, name: '班长', need: 3,
      addLevel: 1, mulTables: [2, 3, 4, 5, 6], mulApp: false, div: false, practice: 1 },
    { level: 2, name: '排长', need: 7,
      addLevel: 2, mulTables: [2, 3, 4, 5, 6, 7], mulApp: true, div: false, practice: 2 },
    { level: 3, name: '连长', need: 14,
      addLevel: 3, mulTables: [2, 3, 4, 5, 6, 7, 8, 9], mulApp: true, div: true, practice: 3 },
    { level: 4, name: '营长', need: 30,
      addLevel: 4, mulTables: [2, 3, 4, 5, 6, 7, 8, 9], mulApp: true, div: true, practice: 4 }
  ]
  function getRank(days) {
    let r = RANKS[0]
    for (const x of RANKS) if (days >= x.need) r = x
    const idx = RANKS.indexOf(r)
    const next = idx < RANKS.length - 1 ? RANKS[idx + 1] : null
    return Object.assign({}, r, {
      nextName: next ? next.name : null,
      nextNeed: next ? next.need : null
    })
  }
  return { RANKS, getRank }
})()
