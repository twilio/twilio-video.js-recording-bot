'use strict';

const browserify = require('browserify-middleware');
const express = require('express');
const expressWinston = require('express-winston');
const { appendFile } = require('fs');
const { sync: mkdirp } = require('mkdirp');
const { join } = require('path');
const puppeteer = require('puppeteer');
const winston = require('winston');

const app = express();

let browser = null;
let server = null;
let actualRoomSid = null;
let localParticipantSid = null;
let shouldClose = false;
let isClosing = false;

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`),
  ),
  transports: [
    new winston.transports.Console()
  ]
});

const loggerMiddleware = expressWinston.logger({ winstonInstance: logger });

app.get('/', (req, res) => res.sendFile(join(__dirname, 'index.html')));

app.get('/bundle.js', browserify([
  'twilio-video',
  { [join(__dirname, 'app.js')]: { run: true } }
]));

app.use(loggerMiddleware);

async function main({ port, token, roomSid }) {
  logger.info(`

  recording-bot's PID is ${process.pid}.

  You can send SIGUSR2 to this PID to cause recording-bot to stop recording and to
  disconnect from the Room. For example,

    kill -SIGUSR2 ${process.pid}

  Happy recording!
`);

  logger.debug('Starting HTTP server...');
  server = await listen(port);
  logger.info(`Started HTTP server. Listening on ${port}.`);
  if (shouldClose) {
    return close();
  }

  logger.debug('Launching browser...');
  browser = await puppeteer.launch({
    args: [
      '--disable-gesture-requirement-for-media-playback'
    ]
  });
  logger.info('Launched browser.');
  if (shouldClose) {
    return close();
  }

  logger.debug('Opening new page...');
  const page = await browser.newPage();
  logger.info('Opened new page.');
  if (shouldClose) {
    return close();
  }

  logger.debug(`Navigating to http://localhost:${port}...`);
  await page.goto(`http://localhost:${port}`, { waitUntil: 'domcontentloaded' });
  logger.info(`Navigated to http://localhost:${port}.`);

  logger.debug('Registering callback(s)...');
  await Promise.all([
    page.exposeFunction('debug', message => { logger.debug(message); }),
    page.exposeFunction('error', message => { logger.error(message); }),
    page.exposeFunction('info', message => { logger.info(message); }),
    page.exposeFunction('createRecording', filepath => {
      mkdirp(join(...filepath.slice(0, filepath.length - 1)));
    }),
    page.exposeFunction('appendRecording', (filepath, chunk) => {
      const filename = join(...filepath);
      const buffer = new Buffer(stringToArrayBuffer(chunk));
      appendFile(filename, buffer, error => {
        if (error) {
          logger.error(`\n\n${indent(error.stack)}\n`);
          return;
        }
        logger.info(`Wrote chunk (${buffer.byteLength} bytes)`);
      });
    })
  ]);
  logger.info('Registered callback(s).');

  const {
    roomSid: actualRoomSid,
    localParticipantSid
  } = await page.evaluate(`main("${token}", "${roomSid}")`);
}

function listen(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, error => error
      ? reject(error)
      : resolve(server));
  });
}

async function close(error) {
  if (isClosing) {
    return;
  }
  isClosing = true;

  if (error) {
    logger.error(`\n\n${indent(error.stack)}\n`);
  }

  if (server) {
    logger.debug('Closing HTTP server...');
    server.close();
    logger.info('Closed HTTP server.');
  }

  if (browser) {
    logger.debug('Closing browser...');
    await browser.close();
    logger.info('Closed browser.');
  }

  if (error) {
    process.exit(1);
    return;
  }
  process.exit();
}

function indent(str, n) {
  return str.split('\n').map(line => `  ${line}`).join('\n');
}

function stringToArrayBuffer(string) {
  const buf = new ArrayBuffer(string.length);
  const bufView = new Uint8Array(buf);

  for (let i=0; i < string.length; i++) {
    bufView[i] = string.charCodeAt(i);
  }

  return buf;
}

process.on('SIGUSR2', () => {
  logger.debug('Received SIGUSR2.');
  shouldClose = true;
  close();
});

const configuration = {
  port: 3000,
  // token: 'xyz',
  token: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsImN0eSI6InR3aWxpby1mcGE7dj0xIn0.eyJqdGkiOiJTS2U0NGRiMjRhZmE5MTg1YjQ2YWZjMDE1NTg2OTQxZDlhLTE1MzM2ODUxNjEiLCJncmFudHMiOnsiaWRlbnRpdHkiOiJhc2QiLCJ2aWRlbyI6eyJjb25maWd1cmF0aW9uX3Byb2ZpbGVfc2lkIjoiVlMzZjc1ZTBmMTRlN2M4YjIwOTM4ZmM1MDkyZTgyZjIzYSJ9fSwiaWF0IjoxNTMzNjg1MTYxLCJleHAiOjE1MzM2ODg3NjEsImlzcyI6IlNLZTQ0ZGIyNGFmYTkxODViNDZhZmMwMTU1ODY5NDFkOWEiLCJzdWIiOiJBQzk2Y2NjOTA0NzUzYjMzNjRmMjQyMTFlOGQ5NzQ2YTkzIn0.XGRcdGZXFGCpNH9lB1EWXcl9a7y7oYtF4xyHQ2Nes8g',
  roomSid: 'RM123'
};

main(configuration).catch(error => {
  shouldClose = true;
  close(error);
});
