const url = 'https://inlead.digital/_next/static/chunks/main-3cf205d1b9424f88.js';
fetch(url).then(res => res.text()).then(txt => {
    let replaced = txt;
    const r1 = /(?<!\.)\b(?:window\.)?location\.hostname\b/g;
    const r2 = /(?<!\.)\b(?:window\.)?location\.host\b/g;
    const r3 = /(?<!\.)\b(?:window\.)?location\.origin\b/g;
    
    replaced = replaced.replace(r1, `(window.__PROXY_HOST__ || window.location.hostname)`);
    replaced = replaced.replace(r2, `(window.__PROXY_HOST__ || window.location.host)`);
    replaced = replaced.replace(r3, `(window.__PROXY_ORIGIN__ || window.location.origin)`);
    
    try {
        new Function(replaced);
        console.log('Replaced is valid');
    } catch(e) {
        console.log('Replaced is invalid:', e.message);
        
        // Find which chunk causes it
        const chunks = replaced.split(/([;.{}])/);
        for(let i=0; i<chunks.length; i++) {
            try {
                new Function(chunks[i]);
            } catch(err) {
                if(err.message === e.message) {
                    console.log('Error in chunk:', chunks[i]);
                }
            }
        }
    }
});
