const { WebSocketServer } = require('ws');
const { getSession, touchSession, destroySession } = require('./browserService');

const FRAME_INTERVAL_MS = 50; // ~20 fps

const startBrowserStreamServer = () => {
  const port = parseInt(process.env.BROWSER_WS_PORT || '8080');
  const wss = new WebSocketServer({ port });

  console.log(`[browser-stream] WebSocket server listening on port ${port}`);

  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url, `ws://localhost`);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      ws.close(1008, 'sessionId is required');
      return;
    }

    const session = getSession(sessionId);
    if (!session) {
      ws.close(1008, 'Session not found or already closed');
      return;
    }

    const { page } = session;
    let frameInterval = null;
    let streaming = true;

    // Start sending JPEG frames
    frameInterval = setInterval(async () => {
      if (!streaming || ws.readyState !== ws.OPEN) {
        clearInterval(frameInterval);
        return;
      }
      try {
        const frame = await page.screenshot({ type: 'jpeg', quality: 85 });
        ws.send(frame);
      } catch (err) {
        clearInterval(frameInterval);
      }
    }, FRAME_INTERVAL_MS);

    // Handle input events forwarded from the frontend canvas
    ws.on('message', async (data) => {
      try {
        const event = JSON.parse(data.toString());
        touchSession(sessionId);

        switch (event.type) {
          case 'mousemove':
            await page.mouse.move(event.x, event.y);
            break;
          case 'mousedown':
            await page.mouse.move(event.x, event.y);
            await page.mouse.down();
            break;
          case 'mouseup':
            await page.mouse.up();
            break;
          case 'click':
            await page.mouse.click(event.x, event.y);
            break;
          case 'dblclick':
            await page.mouse.click(event.x, event.y, { clickCount: 2 });
            break;
          case 'scroll':
            await page.mouse.move(event.x, event.y);
            await page.mouse.wheel({ deltaX: event.deltaX || 0, deltaY: event.deltaY || 0 });
            break;
          case 'keydown':
            await page.keyboard.down(event.key);
            break;
          case 'keyup':
            await page.keyboard.up(event.key);
            break;
          case 'type':
            await page.keyboard.type(event.text);
            break;
          case 'viewport':
            if (event.width && event.height) {
              await page.setViewport({ width: Math.round(event.width), height: Math.round(event.height) });
            }
            break;
          case 'close':
            streaming = false;
            clearInterval(frameInterval);
            await destroySession(sessionId);
            ws.close();
            break;
          default:
            break;
        }
      } catch (err) {
        console.error('[browser-stream] event relay error:', err.message);
      }
    });

    ws.on('close', () => {
      streaming = false;
      clearInterval(frameInterval);
    });

    ws.on('error', () => {
      streaming = false;
      clearInterval(frameInterval);
    });
  });

  return wss;
};

module.exports = { startBrowserStreamServer };
