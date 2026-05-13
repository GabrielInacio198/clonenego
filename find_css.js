const cheerio = require('cheerio');
fetch('https://www.dragonchi-taichi.online/q/0215d101-7999-4f29-891e-390462a27be5')
  .then(res => res.text())
  .then(html => {
    const $ = cheerio.load(html);
    $('link[rel="stylesheet"], link[as="style"]').each((i, el) => console.log($(el).attr('href')));
  });
