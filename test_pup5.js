const puppeteer = require('puppeteer');

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('response', response => {
        if (response.url().includes('.js')) {
            console.log('JS LOADED:', response.url(), response.status());
        }
    });
    
    console.log('Navigating to PROXIED page...');
    await page.goto('https://snapfunnel.vercel.app/p/c9e44635-7cbd-497f-96b8-89a57c71181a', { waitUntil: 'networkidle2' });
    
    console.log('Waiting 3 seconds for hydration...');
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('Clicking INICIAR...');
    const btn = await page.$('button');
    if (btn) await btn.click();
    
    await new Promise(r => setTimeout(r, 2000));
    const text = await page.evaluate(() => document.body.innerText);
    console.log('TEXT AFTER CLICK:', text.substring(0, 100));
    
    await browser.close();
})();
