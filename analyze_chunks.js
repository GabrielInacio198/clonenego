// Busca os chunks JS do inlead e procura por textos do quiz
async function main() {
  const chunks = [
    'https://inlead.digital/_next/static/chunks/30645-24b4af8158d13628.js',
    'https://inlead.digital/_next/static/chunks/11831-ec0ecf948b80fd2e.js',
    'https://inlead.digital/_next/static/chunks/65025-2b0eab84093eb25a.js',
    'https://inlead.digital/_next/static/chunks/89674-ec2e92db7e440963.js',
    'https://inlead.digital/_next/static/chunks/pages/%5B...all%5D-312063730c154fcd.js',
  ];
  
  const keywords = ['plano de', 'plano anual', 'comprar', 'obter acesso', 'receber agora', 'quero o plano', 'obter meu plano', 'mensal', 'trimestral', 'pay.cakto', 'checkout', 'cakto'];
  
  for (const url of chunks) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      console.log('\n=== CHUNK:', url.split('/').pop(), '===');
      console.log('Tamanho:', text.length);
      
      keywords.forEach(kw => {
        const idx = text.toLowerCase().indexOf(kw.toLowerCase());
        if (idx >= 0) {
          const snippet = text.substring(Math.max(0, idx-60), idx+100);
          console.log('  >> KEYWORD "' + kw + '" em pos ' + idx + ':');
          console.log('     ' + snippet.replace(/\s+/g, ' ').substring(0, 150));
        }
      });
    } catch(e) {
      console.log('Erro ao buscar', url, e.message);
    }
  }
}

main().catch(console.error);
