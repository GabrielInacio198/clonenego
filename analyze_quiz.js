const fs = require('fs');
const html = fs.readFileSync('quiz_live.html', 'utf8');

// Procurar nos scripts por keywords perigosas
const keywords = ['plano de', 'plano anual', 'comprar', 'obter acesso', 'receber agora', 'quero o plano', 'plano 1', 'plano 2', 'plano 3', 'obter meu plano', 'mensal', 'trimestral', 'anual'];
keywords.forEach(kw => {
  const count = (html.toLowerCase().split(kw.toLowerCase()).length - 1);
  if (count > 0) console.log('KEYWORD no HTML: "' + kw + '" (' + count + ' ocorrencias)');
});

// Extrair URLs presentes no HTML
const urls = html.match(/https?:\/\/[^\s"'<>]+/g) || [];
const unique = [...new Set(urls.filter(u => u.includes('cakto') || u.includes('pay.') || u.includes('checkout') || u.includes('kirvano')))];
console.log('\nURLs de checkout no HTML:', unique);

// Verificar se o funil usa inlead.digital
const inlead = html.indexOf('inlead.digital');
console.log('\ninlead.digital encontrado:', inlead >= 0 ? 'SIM' : 'NAO');

// Ver todos os chunks JS carregados
const chunks = html.match(/src="[^"]*\.js"/g) || [];
console.log('\nChunks JS:', chunks.slice(0, 10).join('\n'));
