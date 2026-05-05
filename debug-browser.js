const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('ERROR:', msg.text());
    else if (msg.type() === 'warning') console.log('WARN:', msg.text());
  });
  
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.toString());
  });

  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText);
  });

  try {
    await page.goto('https://snapfunnel.vercel.app/q/d802ba2b-439d-4b1a-82e8-98cfa25e59db', { waitUntil: 'networkidle2', timeout: 20000 });
  } catch(e) {
    console.log("Goto timeout or error", e);
  }

  await browser.close();
})();
