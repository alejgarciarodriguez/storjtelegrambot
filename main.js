const TelegramBot = require('node-telegram-bot-api');
const puppeteer = require('puppeteer');

const token = process.env.TELEGRAM_TOKEN;
const siteUrl = process.env.STORJ_URL || 'http://localhost:14002';
const CHAT_ID = process.env.CHAT_ID;

const bot = new TelegramBot(token, {polling: true});

const fetch = async (url, func) => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    await browser.newPage();
    const page = await browser.newPage();
    await page.goto(url);
    const data = await page.evaluate(func);
    await browser.close();
    return data;
}

const money = async () => {
    return await fetch(siteUrl + '/payout-information', () => {
        return document.querySelectorAll('.estimation-table-container__total-area__text')[3].innerText;
    })
}

const cristian = async () => {
    const realMoney = await money();
    const toNumber = realMoney.split('').slice(1).join('');
    return '$' + toNumber * 1000;
}

const status = async () => {
    return await fetch(siteUrl, () => {
        return document.querySelector('.online-status').innerText;
    });
}

const CronJob = require('cron').CronJob;
const job = new CronJob('5 * * * * *', async () => {
    bot.sendMessage(CHAT_ID, `Daily notification :D\nStatus: ${await status()}\nMoney: ${await money()}`);
}, null, true, 'Europe/Madrid');

bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, await status());
});

bot.onText(/\/money/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, await money());
});

bot.onText(/\/cristian/, async (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, await cristian());
});

job.start();