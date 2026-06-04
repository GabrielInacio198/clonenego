const puppeteer = require('puppeteer');

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));
    
    console.log('Navigating to LOCAL PROXIED page...');
    await page.goto('http://localhost:3000/p/c9e44635-7cbd-497f-96b8-89a57c71181a', { waitUntil: 'networkidle2' });
    
    console.log('Waiting 3 seconds for hydration...');
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('Clicking INICIAR...');
    const btn = await page.$('button');
    if (btn) {
        await btn.click();
        console.log('Button clicked.');
    } else {
        console.log('Button not found.');
    }
    
    await new Promise(r => setTimeout(r, 2000));
    const text = await page.evaluate(() => document.body.innerText);
    console.log('TEXT AFTER CLICK:', text.substring(0, 100).replace(/\n/g, ' '));
    
    await browser.close();
})();
