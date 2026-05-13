async function testAll() {
    const htmlUrl = 'https://www.dragonchi-taichi.online/q/0215d101-7999-4f29-891e-390462a27be5';
    const res = await fetch(htmlUrl);
    const html = await res.text();
    const urls = [];
    const regex = /\/api\/proxy\?url=([^&"']+)/g;
    let m;
    while((m = regex.exec(html)) !== null) {
        urls.push(decodeURIComponent(m[1]));
    }
    
    console.log(`Found ${urls.length} scripts to test.`);
    
    for(const url of urls) {
        if(!url.includes('.js')) continue;
        try {
            const r = await fetch(url);
            const txt = await r.text();
            let replaced = txt;
            const r1 = /(?<!\.)\b(?:window\.)?location\.hostname\b/g;
            const r2 = /(?<!\.)\b(?:window\.)?location\.host\b/g;
            const r3 = /(?<!\.)\b(?:window\.)?location\.origin\b/g;
            
            replaced = replaced.replace(r1, `(window.__PROXY_HOST__ || window.location.hostname)`);
            replaced = replaced.replace(r2, `(window.__PROXY_HOST__ || window.location.host)`);
            replaced = replaced.replace(r3, `(window.__PROXY_ORIGIN__ || window.location.origin)`);
            
            new Function(replaced);
            // console.log(`OK: ${url}`);
        } catch(e) {
            console.log(`FAIL: ${url} - ${e.message}`);
        }
    }
}
testAll();
