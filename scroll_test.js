const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  let scrollLeftBefore = await page.$eval('.stores-scroll-container', el => el.scrollLeft);
  console.log('Scroll Left Before:', scrollLeftBefore);
  
  await page.click('.right-btn');
  await new Promise(r => setTimeout(r, 1000));
  
  let scrollLeftAfter = await page.$eval('.stores-scroll-container', el => el.scrollLeft);
  console.log('Scroll Left After:', scrollLeftAfter);
  
  await browser.close();
})();
