const puppeteer = require('puppeteer');

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    console.log('Navigating to ORIGINAL page...');
    await page.goto('https://minha-figurinha-copa2026.vercel.app/', { waitUntil: 'networkidle2' });
    
    console.log('Page loaded. Clicking INICIAR button...');
    try {
        await page.waitForSelector('button', { timeout: 5000 });
        const buttons = await page.$$('button');
        for (const btn of buttons) {
            const text = await page.evaluate(el => el.textContent, btn);
            if (text.includes('INICIAR')) {
                console.log('Clicking button: ' + text);
                await btn.click();
                break;
            }
        }
    } catch (e) {
        console.log('Error finding button:', e.message);
    }

    console.log('Waiting 5 seconds...');
    await new Promise(r => setTimeout(r, 5000));
    
    const url = page.url();
    console.log('CURRENT URL AFTER CLICK:', url);
    
    await browser.close();
})();
