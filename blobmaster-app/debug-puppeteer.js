const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Inject mock window.ethereum
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(window, 'ethereum', {
      value: {
        isMetaMask: true,
        on: () => {},
        request: async () => []
      }
    });
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('PAGE EXCEPTION:', err.toString());
  });

  await page.goto('https://blobmaster-j1pjq7qrg-mohamed-aaftaabs-projects.vercel.app/dashboard', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
