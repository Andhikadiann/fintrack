/* FinTrack service worker.
   - Halaman utama (index.html): ambil dari internet lebih dulu (selalu cek versi terbaru, melewati cache HTTP),
     tunggu maksimal 4 detik; jika offline atau lambat, pakai salinan tersimpan.
   - File lain (ikon, manifest): tampilkan salinan tersimpan, lalu perbarui di belakang layar.
   - Tidak menyentuh permintaan ke server lain (Apps Script). */
var CACHE='fintrack-20261119014725';
var ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
var WAIT=4000;
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(ASSETS.map(function(u){return new Request(u,{cache:'reload'})}))}).then(function(){return self.skipWaiting()}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}));
});
function save(r,res){if(res&&res.ok){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(r,cp)})}return res}
function cached(r){return caches.match(r,{ignoreSearch:true}).then(function(hit){return hit||caches.match('./index.html')})}
function isPage(r,u){return r.mode==='navigate'||/\/(index\.html)?$/.test(u.pathname)}
self.addEventListener('fetch',function(e){
  var r=e.request;
  if(r.method!=='GET')return;
  var u=new URL(r.url);
  if(u.origin!==self.location.origin)return;
  if(isPage(r,u)){
    var fetching=fetch(r,{cache:'no-cache'}).then(function(res){return save(r,res)});
    e.waitUntil(fetching.catch(function(){}));
    var timer=new Promise(function(done){setTimeout(function(){done(null)},WAIT)});
    e.respondWith(Promise.race([fetching.catch(function(){return null}),timer]).then(function(res){
      if(res)return res;
      return cached(r).then(function(hit){return hit||fetching});
    }));
    return;
  }
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(function(hit){
    var net=fetch(r,{cache:'no-cache'}).then(function(res){return save(r,res)}).catch(function(){return hit||caches.match('./index.html')});
    return hit||net;
  }));
});
