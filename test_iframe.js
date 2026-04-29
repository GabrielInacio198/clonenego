const http = require('http');
const fs = require('fs');

http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<iframe src="http://localhost:8082" width="400" height="800"></iframe>');
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(8083);

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(fs.readFileSync('temp_html.html'));
}).listen(8082);

const puppeteer = require('puppeteer');

(async () => {
  const b = await puppeteer.launch();
  const p = await b.newPage();
  p.on('console', m => console.log('LOG:', m.text()));
  await p.goto('http://localhost:8083');
  await new Promise(r => setTimeout(r, 2000));
  await p.screenshot({ path: 'iframe_test.png' });
  console.log('Done screenshot');
  await b.close();
  process.exit(0);
})();
