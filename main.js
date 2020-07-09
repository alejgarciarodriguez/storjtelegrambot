const TelegramBot = require('node-telegram-bot-api');
const puppeteer = require('puppeteer');
const fs = require('fs');

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
    await page.waitFor(1000);
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
const job = new CronJob('0 0 8 * * *', async () => {
    const status = await status();
    const currentMoney = await money();
    let yesterdayMoney;
    try {
        yesterdayMoney = require('./data.json')['money'];
    } catch (err){
        yesterdayMoney = undefined;
    }
    const data = JSON.stringify({"money": currentMoney});
    fs.writeFile('data.json', data, (err) => {
        if (err) throw err;
        console.log('Data written to file');
    });
    let todayEarning = undefined !== yesterdayMoney ? currentMoney - yesterdayMoney : 0;
    const message = `Daily notification :D\nStatus: ${status}\nMoney: ${currentMoney}\nEarning: ${todayEarning.toFixed(2)}`;
    bot.sendMessage(CHAT_ID, message);
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
