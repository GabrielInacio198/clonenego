// Analisa o chunk maior procurando por logica de navegacao e checkout
async function main() {
  const res = await fetch('https://inlead.digital/_next/static/chunks/89674-ec2e92db7e440963.js');
  const text = await res.text();
  
  // Procurar por window.open, location.href, router.push
  const navPatterns = [
    'window.open',
    'location.href',
    'router.push',
    'router.replace',
    'window.location',
    'nextStep',
    'next-step',
    'handleNext',
    'onNext',
    'navigate',
    'redirect',
  ];
  
  navPatterns.forEach(pat => {
    let idx = text.indexOf(pat);
    let count = 0;
    while (idx >= 0 && count < 3) {
      const snippet = text.substring(Math.max(0, idx-40), idx+120);
      console.log('>> "' + pat + '" em pos ' + idx + ':');
      console.log('   ' + snippet.replace(/\s+/g, ' ').substring(0, 200));
      idx = text.indexOf(pat, idx+1);
      count++;
    }
    if (count === 0) { /* nao encontrado */ }
  });
  
  // Procurar por 'cakto' ou 'pay.' nos chunks restantes
  const allChunks = [
    'https://inlead.digital/_next/static/chunks/32413-a455ec39e1a2920b.js',
    'https://inlead.digital/_next/static/chunks/4770-065027577b49f625.js',
    'https://inlead.digital/_next/static/chunks/75573-546908afd80e5ddf.js',
    'https://inlead.digital/_next/static/chunks/90575-beba4437be29c955.js',
  ];
  
  for (const url of allChunks) {
    const r = await fetch(url);
    const t = await r.text();
    if (t.includes('cakto') || t.includes('pay.') || t.includes('checkout')) {
      console.log('\n=== CHECKOUT ENCONTRADO em:', url.split('/').pop(), '===');
      const idx = t.indexOf('cakto') >= 0 ? t.indexOf('cakto') : t.indexOf('checkout');
      console.log(t.substring(Math.max(0, idx-100), idx+200));
    }
    // Procurar por window.open
    if (t.includes('window.open')) {
      console.log('\n=== window.open em:', url.split('/').pop(), '===');
      const idx = t.indexOf('window.open');
      console.log(t.substring(Math.max(0, idx-80), idx+200));
    }
  }
}

main().catch(console.error);
