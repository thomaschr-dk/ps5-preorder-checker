require("dotenv").config();
const puppeteer = require("puppeteer");
const superagent = require("superagent");
const moment = require("moment");
const shops = require("./shops.config");

exports.scrape = async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setUserAgent(process.env.PUPPETEER_USER_AGENT);

  const postToDiscord = async (webhookContent) => {
    await superagent
      .post(process.env.DISCORD_WEBHOOK)
      .set("Content-Type", "application/json")
      .send(JSON.stringify(webhookContent));
  };

  for await (shop of shops) {
    try {
      await page.goto(shop.url);
    } catch (error) {
      let webhookContent = {
        embeds: [
          {
            author: {
              name: "PS5 Preorder Checker 🎮",
            },
            title: `${shop.name} - error`,
            description: `Error while trying to visit [${shop.name}](${shop.url}):\n${'```' + error + '```'}`,
            color: 16198186,
            timestamp: moment().toISOString(),
          },
        ],
      };
      postToDiscord(webhookContent);
      continue;
    }

    let productStatus = await page.$eval(shop.addToCartSelector, (element) =>
      element.textContent.trim()
    );

    if (productStatus && productStatus !== shop.outOfStockMessage) {
      let webhookContent = {
        embeds: [
          {
            author: {
              name: "PS5 Preorder Checker 🎮",
            },
            title: `${shop.name} - PS5`,
            url: shop.url,
            description: `Available now at [${shop.name}](${shop.url})!`,
            color: 3535451,
            timestamp: moment().toISOString(),
          },
        ],
      };
      await postToDiscord(webhookContent);
    }
  }

  await browser.close();
};
