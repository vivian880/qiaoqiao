function passFor(total){ if(total<=0) return 0; return Math.ceil(total*0.9) }
const cases=[[1,1],[2,2],[3,3],[9,9],[10,9],[15,14],[20,18],[30,27]]
let ok=true
cases.forEach(([t,e])=>{const r=passFor(t); if(r!==e){ok=false;console.log('FAIL',t,'got',r,'exp',e)}})
console.log('passFor阈值:', ok?'全部正确':'有错')
console.log('  ', cases.map(c=>c[0]+'题需'+passFor(c[0])+'对').join(', '))
function applyZhuantiOverride(hidden, added, lib){
  let out = lib.filter(x=>!x||!x.id||!hidden.includes(x.id))
  added.forEach(a=>out.push(a)); return out
}
const lib=[{id:'A',options:['x'],answer:0},{id:'B',options:['y'],answer:0},{id:'C',options:['z'],answer:0}]
const r1=applyZhuantiOverride(['B'],[],lib)
console.log('隐藏B:', r1.map(x=>x.id).join(','), r1.length===2?'OK':'FAIL')
const r2=applyZhuantiOverride(['B'],[{id:'D',options:['w'],answer:0}],lib)
console.log('隐藏B+新增D:', r2.map(x=>x.id).join(','), (r2.length===3 && r2.some(x=>x.id==='D'))?'OK':'FAIL')
