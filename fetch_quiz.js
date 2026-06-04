// Busca o HTML renderizado pelo God Mode e analisa textos de botoes/opcoes
async function main() {
  const res = await fetch('https://quiz.secajejumturbo.site/');
  const html = await res.text();
  
  // Salvar o HTML completo para analise
  const fs = require('fs');
  fs.writeFileSync('quiz_live.html', html, 'utf8');
  console.log('HTML salvo em quiz_live.html, tamanho:', html.length);
  
  // Procurar por textos que poderiam coincidir com keywords de checkout
  const keywords = ['comprar', 'checkout', 'receber agora', 'obter acesso', 'quero o plano', 'plano de', 'plano anual', 'obter meu plano', 'pay.', 'cakto', 'kirvano', 'kiwify', 'lastlink', 'perfectpay'];
  
  keywords.forEach(kw => {
    const idx = html.toLowerCase().indexOf(kw.toLowerCase());
    if (idx >= 0) {
      const snippet = html.substring(Math.max(0, idx-80), idx+120);
      console.log(`\n[KEYWORD "${kw}" ENCONTRADA em pos ${idx}]:`);
      console.log(snippet.replace(/\s+/g, ' '));
    }
  });

  // Extrair textos de opcoes do quiz (elements com 'option' na class)
  const optionMatches = html.match(/class="[^"]*option[^"]*"[^>]*>([\s\S]{0,200}?)(?=<\/div>|<\/li>|<\/a>)/gi) || [];
  console.log('\n\n=== OPCOES DO QUIZ ===');
  optionMatches.slice(0, 15).forEach(m => console.log(m.replace(/<[^>]+>/g, '').trim().substring(0, 100)));
}

main().catch(console.error);
