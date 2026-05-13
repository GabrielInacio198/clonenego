fetch('https://inlead.digital/_next/static/chunks/framework-b21a9a9d949ebca4.js')
  .then(res => res.text())
  .then(txt => {
    console.log('Contains "window.location.hostname"?', txt.includes('"window.location.hostname"'));
    console.log('Contains \'window.location.hostname\'?', txt.includes("'window.location.hostname'"));
    console.log('Contains window.location.hostname?', txt.includes("window.location.hostname"));
  });
