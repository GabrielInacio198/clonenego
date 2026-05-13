const url = 'https://inlead.digital/_next/static/chunks/main-3cf205d1b9424f88.js';
fetch(url).then(res => res.text()).then(txt => {
    try {
        new Function(txt);
        console.log('Original is valid');
    } catch(e) {
        console.log('Original is invalid:', e.message);
    }
    
    let replaced = txt;
    replaced = replaced.replace(/window\.location\.hostname/g, `(window.__PROXY_HOST__ || window.location.hostname)`);
    replaced = replaced.replace(/location\.hostname/g, `(window.__PROXY_HOST__ || location.hostname)`);
    replaced = replaced.replace(/window\.location\.host/g, `(window.__PROXY_HOST__ || window.location.host)`);
    replaced = replaced.replace(/location\.host/g, `(window.__PROXY_HOST__ || location.host)`);
    replaced = replaced.replace(/window\.location\.origin/g, `(window.__PROXY_ORIGIN__ || window.location.origin)`);
    replaced = replaced.replace(/location\.origin/g, `(window.__PROXY_ORIGIN__ || location.origin)`);
    
    try {
        new Function(replaced);
        console.log('Replaced is valid');
    } catch(e) {
        console.log('Replaced is invalid:', e.message);
        
        // Find which line causes it
        const lines = replaced.split(/([;.{}])/);
        for(let i=0; i<lines.length; i++) {
            try {
                new Function(lines[i]);
            } catch(err) {
                if(err.message === e.message) {
                    console.log('Error in chunk:', lines[i]);
                    // break;
                }
            }
        }
    }
});
