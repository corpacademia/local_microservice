const puppeteer = require('puppeteer');

const sessions = new Map(); // sessionId -> { browser, page, lastActivity }

const POOL_SIZE = parseInt(process.env.BROWSER_POOL_SIZE || '5');
const IDLE_TIMEOUT_MS = parseInt(process.env.BROWSER_IDLE_TIMEOUT_MINUTES || '1') * 60 * 1000;
const PUPPETEER_ARGS = (process.env.PUPPETEER_ARGS || '--no-sandbox --disable-setuid-sandbox')
  .split(' ')
  .filter(Boolean);

const createSession = async (sessionId, consoleUrl, username, password) => {
  if (sessions.size >= POOL_SIZE) {
    throw new Error(`Browser pool limit (${POOL_SIZE}) reached. Please wait for another session to end.`);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: PUPPETEER_ARGS,
    defaultViewport: { width: 1280, height: 800 },
  });

  const page = await browser.newPage();

  // Navigate to the AWS sign-in page
  await page.goto(consoleUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Fill username
  await page.waitForSelector('#username, input[name="username"]', { timeout: 20000 });
  const usernameField = (await page.$('#username')) || (await page.$('input[name="username"]'));
  await usernameField.click({ clickCount: 3 });
  await usernameField.type(username, { delay: 40 });

  // Fill password
  await page.waitForSelector('#password, input[name="password"]', { timeout: 10000 });
  const passwordField = (await page.$('#password')) || (await page.$('input[name="password"]'));
  await passwordField.click({ clickCount: 3 });
  await passwordField.type(password, { delay: 40 });

  // Submit
  const submitBtn =
    (await page.$('#signin_button')) ||
    (await page.$('button[type="submit"]')) ||
    (await page.$('input[type="submit"]'));
  await submitBtn.click();

  // 'load' is much faster than 'networkidle2' — AWS console keeps background XHR alive indefinitely
  await page.waitForNavigation({ waitUntil: 'load', timeout: 30000 });

  sessions.set(sessionId, {
    browser,
    page,
    lastActivity: Date.now(),
  });

  console.log(`[browser-pool] session created: ${sessionId} (pool: ${sessions.size}/${POOL_SIZE})`);
  return sessionId;
};

const getSession = (sessionId) => sessions.get(sessionId);

const destroySession = async (sessionId) => {
  const session = sessions.get(sessionId);
  if (!session) return;
  try {
    await session.browser.close();
  } catch (_) {}
  sessions.delete(sessionId);
  console.log(`[browser-pool] session destroyed: ${sessionId} (pool: ${sessions.size}/${POOL_SIZE})`);
};

const touchSession = (sessionId) => {
  const session = sessions.get(sessionId);
  if (session) session.lastActivity = Date.now();
};

// Kill sessions idle longer than IDLE_TIMEOUT_MS
setInterval(async () => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActivity > IDLE_TIMEOUT_MS) {
      console.log(`[browser-pool] idle timeout — killing session ${id}`);
      await destroySession(id);
    }
  }
}, 60000);

module.exports = { createSession, getSession, destroySession, touchSession };
