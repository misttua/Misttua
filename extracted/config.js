module.exports = {
  /* ================================
   *  BOT CONFIG
   * ================================ */

  botToken: "Bot_Token", //your bot token
  prefix: ".", //prefix for the bot
  owners: ["1113414151256154122", "1053675577191702538"],

  /* ================================
   *  DASHBOARD AUTH
   * ================================ */
  dashboardPort: "25739", //dashboard port
  dashboardUser: "username", //dashboard username
  dashboardPass: "ahm", //dashboard password

  /* ================================
   *  WEBHOOKS
   * ================================ */

  captchaHook: "https://discord.com/api/webhooks/1560240561016012810/1JWuOMluEqhvaDlrUhBmeboqWvbtCwhnrRNxMMwob1z15lOugfUL_UQjQs40VbGvwiaG", //captcha webhook url
  webHook: "https://discord.com/api/webhooks/1560241111572684933/ulk7sHuToA_c0ClHjvUcbysDHpTzqyLtty1W-_qjfX-YZ7tJfkZUXlkDHoaMOXntTNaS", //webhook url
  logHook: "https://discord.com/api/webhooks/1560241111572684933/ulk7sHuToA_c0ClHjvUcbysDHpTzqyLtty1W-_qjfX-YZ7tJfkZUXlkDHoaMOXntTNaS", //log webhook url
  questHook: "https://discord.com/api/webhooks/1560241286374629516/rkMFa1xgtQJmfcrMJ-xhAZv8GzeZiYeMVjgaGGZav2X_ZwnPVJqeezTeh4Fk0foFaGx_", //quest webhook url
  rarityHook: "https://discord.com/api/webhooks/1560242969452351532/sDpsp8Q5RJzKazS74HC2B7fzrl7OBqkQbrtdKc4I7HmfpJMOP0a6KGRggwCuEwgx6V7O", //rarity webhook url

  /* ================================
   *  LOGGING
   * ================================ */

  logs: {
    HighLowIVs: true, //high low ivs
    Quests: true, //quests
    Rare: false, //rare
    Shiny: true, //shiny
  },

  /* ================================
   *  AI PREDICTION (only when aiCatch is true)
   * ================================ */

  aiCatch: true, //ai catch

  // Base URL only (no /predict path). data/runtime-config.json can override aiHostname & aiApiKey.
  aiHostname: "http://veda.hidencloud.com:24667", //ai hostname

  // License for the predict API (sent as x-api-key, x-license-key, Bearer, and in JSON body)
  aiLicenseKey: "Your_apikey", //ai license key

  // Minimum model confidence (0–100) to auto-catch; use 0 to catch on any non-empty name
  aiMinConfidence: 65, //ai min confidence

  /* ================================
   *  CAPTCHA SOLVER CONFIG (REQUIRED)
   * ================================ */

  captchaSolveUrl: "http://prem-eu1.bot-hosting.net:22498/solve", //captcha solve url

  captchaLicenseKey: "your-captcha-license-key", //captcha license key        

};
