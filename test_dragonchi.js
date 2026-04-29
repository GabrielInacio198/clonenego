const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data: quizzes } = await supabase.from('quizzes').select('*').order('created_at', { ascending: false }).limit(1);
  if (!quizzes || quizzes.length === 0) {
    console.log('No quizzes found');
    process.exit(0);
  }
  const quiz = quizzes[0];
  console.log('Testing Quiz ID:', quiz.id, quiz.original_url);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[BROWSER LOG] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.log(`[BROWSER ERROR] ${error.message}`);
  });

  page.on('response', response => {
    if (!response.ok()) {
       console.log(`[NETWORK ERROR] ${response.status()} ${response.url()}`);
    }
  });

  await page.goto(`http://localhost:3000/q/${quiz.id}`, { waitUntil: 'networkidle2' });
  
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'puppeteer_test_q.png' });
  console.log('Screenshot saved to puppeteer_test_q.png');
  
  await browser.close();
  process.exit(0);
})();
