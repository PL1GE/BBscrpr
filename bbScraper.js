// playwright_telegram_bot.js
const { chromium } = require('playwright');
const TelegramBot = require('node-telegram-bot-api');
const logging = console;

// Telegram Bot Configuration – fill in your values
const BOT_TOKEN = "7665126963:AAHGo7N9h883QhLF9SigrWZRVbrwjuuuUi0";
const CHANNEL_ID = "-1002541944979";
const bot = new TelegramBot(BOT_TOKEN, { polling: false });

// Global sets to track seen matches (using a sorted string as key)
let seenLolMatches = new Set();
let seenDotaMatches = new Set();

// Helper function to clean team names (remove non-alphanumeric characters, lowercase)
function cleanTeamName(name) {
  return name.replace(/[^\w\s]/g, '').toLowerCase().trim();
}

console.log('shes thirteen')

// Function to scrape BetBoom matches for a given URL using Playwright
async function scrapeBetBoom(url) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Click on expand buttons (if any) to reveal hidden matches
  try {
    const expandButtons = await page.$$('xpath=//span[contains(@class, "mkx1j")]');
    // Skip the first button (assuming the first group is already expanded)
    for (let i = 1; i < expandButtons.length; i++) {
      try {
        await expandButtons[i].click();
        await page.waitForTimeout(1000);
      } catch (e) {
        logging.warn(`Could not click expand button ${i+1}: ${e}`);
      }
    }
  } catch (e) {
    logging.error(`Error finding expand buttons on ${url}: ${e}`);
  }

  let matches = [];
  try {
    // Find match blocks by searching for div elements whose class contains a known substring
    const matchBlocks = await page.$$('xpath=//div[contains(@class, "TF0HN")]');
    logging.info(`Found ${matchBlocks.length} match blocks on ${url}`);
    for (const block of matchBlocks) {
      try {
        // Look for team names inside the current match block (using relative xpath)
        const teamElements = await block.$$('xpath=.//div[contains(@class, "eOSe1")]');
        if (teamElements.length < 2) continue;
        const team1 = cleanTeamName(await teamElements[0].innerText());
        const team2 = cleanTeamName(await teamElements[1].innerText());

        // Look for odds inside the match block
        const multiplierElements = await block.$$('xpath=.//span[contains(@class, "do7iP")]');
        if (multiplierElements.length < 2) continue;
        const multiplier1Text = (await multiplierElements[0].innerText()).trim();
        const multiplier2Text = (await multiplierElements[1].innerText()).trim();
        const multiplier1 = parseFloat(multiplier1Text);
        const multiplier2 = parseFloat(multiplier2Text);
        if (isNaN(multiplier1) || isNaN(multiplier2)) continue;

        matches.push({
          teams: [team1, team2],
          multiplier1,
          multiplier2
        });
      } catch (e) {
        logging.warn(`Error processing a match block on ${url}: ${e}`);
      }
    }
  } catch (e) {
    logging.error(`Error finding matches on ${url}: ${e}`);
  }
  await browser.close();
  return matches;
}

// Function to determine which matches are new
function findNewMatches(currentMatches, seenSet) {
  let newMatches = [];
  for (const match of currentMatches) {
    // Create a unique key based on sorted team names
    const key = match.teams.slice().sort().join(" vs ");
    if (!seenSet.has(key)) {
      newMatches.push(match);
    }
  }
  return newMatches;
}
ccpdkmfd.net
function updateSeenMatches(currentMatches, seenSet) {
  for (const match of currentMatches) {
    const key = match.teams.slice().sort().join(" vs ");
    seenSet.add(key);
  }
}

function sendToTelegram(matches, gameType) {
  if (matches.length > 0) {
    let message = `*New BetBoom ${gameType} Matches:*\n`;
    for (const match of matches) {
      message += `\n*${match.teams[0]}* vs *${match.teams[1]}*\nOdds: ${match.multiplier1} | ${match.multiplier2}\n`;
    }
    //bot.sendMessage(CHANNEL_ID, message, { parse_mode: "Markdown" });
    print(message)
  }
}

async function main() {
  try {
    const currentLolMatches = await scrapeBetBoom("https://betboom.ru/esport/league-of-legends");
    const currentDotaMatches = await scrapeBetBoom("https://betboom.ru/esport/dota-2");

    const newLolMatches = findNewMatches(currentLolMatches, seenLolMatches);
    const newDotaMatches = findNewMatches(currentDotaMatches, seenDotaMatches);

    sendToTelegram(newLolMatches, "League of Legends");
    sendToTelegram(newDotaMatches, "Dota 2");

    updateSeenMatches(currentLolMatches, seenLolMatches);
    updateSeenMatches(currentDotaMatches, seenDotaMatches);
  } catch (e) {
    bot.sendMessage(CHANNEL_ID, `ERROR:\n${e.stack}`);
  }
}

main();
setInterval(main, 130 * 1000);
