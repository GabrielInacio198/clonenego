const cheerio = require('cheerio');
fetch('https://app.dragonchi.site/0215d101-7999-4f29-891e-390462a27be5')
  .then(res => res.text())
  .then(html => {
    const $ = cheerio.load(html);
    console.log('Live __next length:', $('#__next').html()?.length);
  });
