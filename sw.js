// 邱少云小八路 Service Worker —— 让网站可被"安装"为全屏 PWA 应用
// network-first：每次优先取网络最新内容（保证部署即生效），网络失败再用缓存兜底（离线可用）
// 注意：fetch 用 {cache:'reload'} 绕过浏览器 HTTP 缓存，确保部署后立即生效，避免 PWA 一直显示旧页面
const CACHE = 'qiaoqiao-v51'

self.addEventListener('install', function (e) {
  self.skipWaiting()
})

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.map(function (k) {
        return k !== CACHE ? caches.delete(k) : null
      }))
    }).then(function () { return self.clients.claim() })
  )
})

self.addEventListener('fetch', function (e) {
  var r = e.request
  if (r.method !== 'GET') return
  e.respondWith(
    fetch(r, { cache: 'reload' }).then(function (res) {
      var cp = res.clone()
      caches.open(CACHE).then(function (c) { c.put(r, cp) })
      return res
    }).catch(function () {
      return caches.match(r).then(function (m) { return m || caches.match('./index.html') })
    })
  )
})
