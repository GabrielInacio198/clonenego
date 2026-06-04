const puppeteer = require('puppeteer');

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    let logRequests = false;
    page.on('request', request => {
        if (logRequests) {
            console.log('FETCH OUT:', request.url(), request.resourceType());
        }
    });
    page.on('response', response => {
        if (logRequests) {
            console.log('FETCH IN:', response.url(), response.status());
        }
    });
    page.on('console', msg => {
        if (logRequests || msg.type() === 'error') console.log('PAGE LOG:', msg.text());
    });
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    console.log('Navigating to PROXIED page...');
    await page.goto('https://snapfunnel.vercel.app/p/c9e44635-7cbd-497f-96b8-89a57c71181a', { waitUntil: 'networkidle2' });
    
    console.log('Waiting 3 seconds for hydration...');
    await new Promise(r => setTimeout(r, 3000));
    
    logRequests = true; // START LOGGING NOW!
    
    console.log('Clicking INICIAR...');
    const btn = await page.$('button');
    if (btn) await btn.click();
    
    await new Promise(r => setTimeout(r, 5000));
    const text = await page.evaluate(() => document.body.innerText);
    console.log('TEXT AFTER CLICK:', text.substring(0, 100).replace(/\n/g, ' '));
    
    await browser.close();
})();
