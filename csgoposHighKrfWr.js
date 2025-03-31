const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  // Launch browser in headless mode with stealth arguments
  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  });
  
  const page = await context.newPage();
  
  // Navigate to the esports page
  await page.goto('https://fonbet.kz/sports/esports', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(5000);
  
  // Scroll the page until no new content loads.
  let previousHeight = await page.evaluate(() => document.body.scrollHeight);
  while (true) {
    await page.evaluate(() => window.scrollBy(0, 200));
    await page.waitForTimeout(1000);
    let newHeight = await page.evaluate(() => document.body.scrollHeight);
    if (newHeight === previousHeight) break;
    previousHeight = newHeight;
  }
  
  await page.screenshot({ path: 'fonbet_esports.png', fullPage: true });
  
  const matchElements = await page.$$('a[class*="sport-event__name"]');
  console.log(`Found ${matchElements.length} match elements.`);
  
  let matches = [];
  
  for (const matchEl of matchElements) {
    let teamNamesText = "";
    try {
      teamNamesText = await matchEl.innerText();
    } catch (err) {
      teamNamesText = "N/A";
    }
    const teams = teamNamesText.split(/\s*[-–—]\s*/);
    const multiplierEls = await matchEl.$$(`span[class*="value"]`);
    let multipliers = [];
    for (const mEl of multiplierEls) {
      try {
        const mText = await mEl.innerText();
        multipliers.push(mText.trim());
      } catch (err) {
        multipliers.push("N/A");
      }
    }
    
    // We expect that the multipliers of interest are the first and third in this container.
    // If not present, default to "N/A".
    const firstMultiplier = multipliers[0] ? multipliers[0] : "N/A";
    const thirdMultiplier = multipliers[2] ? multipliers[2] : "N/A";
    
    matches.push({
      teams,
      multipliers: [firstMultiplier, thirdMultiplier]
    });
  }
  
  // Load existing matches from file, merge new data, and write back
  const filePath = 'matches.json';
  let existingMatches = [];
  if (fs.existsSync(filePath)) {
    existingMatches = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  
  const updatedMatches = [...existingMatches, ...matches];
  fs.writeFileSync(filePath, JSON.stringify(updatedMatches, null, 2));
  
  console.log(`Extracted ${matches.length} new matches. Total stored: ${updatedMatches.length}`);
  
  await browser.close();
})();
