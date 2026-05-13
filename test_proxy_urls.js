const urls = [
'/api/proxy?url=https%3A%2F%2Finlead.digital%2F_next%2Fstatic%2Fchunks%2Fpolyfills-42372ed130431b0a.js&overrideHost=app.dragonchi.site',
'/api/proxy?url=https%3A%2F%2Finlead.digital%2F_next%2Fstatic%2Fchunks%2Fwebpack-1756b0565e660b81.js&overrideHost=app.dragonchi.site',
'/api/proxy?url=https%3A%2F%2Finlead.digital%2F_next%2Fstatic%2Fchunks%2Fframework-b21a9a9d949ebca4.js&overrideHost=app.dragonchi.site',
'/api/proxy?url=https%3A%2F%2Finlead.digital%2F_next%2Fstatic%2Fchunks%2Fmain-3cf205d1b9424f88.js&overrideHost=app.dragonchi.site',
'/api/proxy?url=https%3A%2F%2Finlead.digital%2F_next%2Fstatic%2Fchunks%2Fpages%2F_app-b1a9998cb32a1f37.js&overrideHost=app.dragonchi.site',
'/api/proxy?url=https%3A%2F%2Finlead.digital%2F_next%2Fstatic%2Fchunks%2F30645-24b4af8158d13628.js&overrideHost=app.dragonchi.site',
'/api/proxy?url=https%3A%2F%2Finlead.digital%2F_next%2Fstatic%2Fchunks%2F50778-c3a200dda30ed882.js&overrideHost=app.dragonchi.site',
'/api/proxy?url=https%3A%2F%2Finlead.digital%2F_next%2Fstatic%2Fchunks%2F32413-a455ec39e1a2920b.js&overrideHost=app.dragonchi.site',
'/api/proxy?url=https%3A%2F%2Finlead.digital%2F_next%2Fstatic%2Fchunks%2F4770-7461c12b3c81e599.js&overrideHost=app.dragonchi.site',
'/api/proxy?url=https%3A%2F%2Finlead.digital%2F_next%2Fstatic%2Fchunks%2F75573-546908afd80e5ddf.js&overrideHost=app.dragonchi.site',
'/api/proxy?url=https%3A%2F%2Finlead.digital%2F_next%2Fstatic%2Fchunks%2F82112-c2f1725e6c3504e1.js&overrideHost=app.dragonchi.site',
'/api/proxy?url=https%3A%2F%2Finlead.digital%2F_next%2Fstatic%2Fchunks%2F47951-0834dc745ccc5d54.js&overrideHost=app.dragonchi.site',
'/api/proxy?url=https%3A%2F%2Finlead.digital%2F_next%2Fstatic%2Fchunks%2F820-d57fa2dc4c14cc2e.js&overrideHost=app.dragonchi.site',
'/api/proxy?url=https%3A%2F%2Finlead.digital%2F_next%2Fstatic%2Fchunks%2F32159-29e399059d61f593.js&overrideHost=app.dragonchi.site',
'/api/proxy?url=https%3A%2F%2Finlead.digital%2F_next%2Fstatic%2Fchunks%2F28949-c54bc24912bcabe8.js&overrideHost=app.dragonchi.site',
'/api/proxy?url=https%3A%2F%2Finlead.digital%2F_next%2Fstatic%2Fchunks%2Fpages%2F%255B...all%255D-af914d65aaadaae7.js&overrideHost=app.dragonchi.site',
'/api/proxy?url=https%3A%2F%2Finlead.digital%2F_next%2Fstatic%2FbYPwRH8AMTuMbr-XHcGCw%2F_buildManifest.js&overrideHost=app.dragonchi.site',
'/api/proxy?url=https%3A%2F%2Finlead.digital%2F_next%2Fstatic%2FbYPwRH8AMTuMbr-XHcGCw%2F_ssgManifest.js&overrideHost=app.dragonchi.site'
];

async function check() {
  for (const u of urls) {
    try {
      const res = await fetch('https://www.dragonchi-taichi.online' + u);
      if (res.status !== 200) {
         console.log('BAD STATUS:', res.status, u);
         continue;
      }
      const txt = await res.text();
      try {
         // evaluate to see if there is syntax error
         new Function(txt);
      } catch(e) {
         console.log('SYNTAX ERROR IN:', u);
         console.log(e.message);
         // console.log(txt.slice(0, 100)); // or find where the error is
      }
    } catch(e) {
      console.log('FETCH ERROR:', u, e.message);
    }
  }
}
check();
