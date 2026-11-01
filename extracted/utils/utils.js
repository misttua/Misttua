const { WebhookClient } = require("discord.js");
const config = require("../config");
const checkRarity = require("pokehint/functions/checkRarity");
const { addCatchLog } = require("../dashboard/events");

function format(content) {
  let tokens = [];
  content.forEach((e) => {
    let x = e
      .split(";")
      .map((T) => {
        if (T) T.trim();
        return T;
      })
      .filter((x) => x);
    tokens.push(x[0]);
  });
  return tokens;
}

require("colors");

function log(message) {
  const timestamp = new Date().toISOString().slice(11, -5).cyan; // Extracting time in HH:mm:ss format and colorizing it
  const formattedMessage = `[${timestamp}] ${message}`;

  console.log(formattedMessage);
}
function status(type, message) {
  const stamp = new Date().toISOString().slice(11, -5).dim;
  const labels = {
    success: " SUCCESS ".bgGreen.black.bold,
    info: " INFO ".bgBlue.white.bold,
    warn: " WARN ".bgYellow.black.bold,
    error: " ERROR ".bgRed.white.bold,
    auth: " AUTH ".bgMagenta.white.bold,
    system: " SYSTEM ".bgCyan.black.bold,
    catch: " CATCH ".bgRed.white.bold,
  };
  const colorMap = {
    success: "green",
    info: "cyan",
    warn: "yellow",
    error: "red",
    auth: "magenta",
    system: "blue",
    catch: "red",
  };
  const label = labels[type] || labels.info;
  const color = colorMap[type] || "white";
  let coloredMessage = typeof message === "string" && message[color] ? message[color] : message;

  if (type === "catch" && typeof message === "string") {
    const match = message.match(
      /^(.+?) Caught (.+?) in (.+?) \| IV: (.+?) \| Level: (.+?) \| Gender: (.+)$/
    );
    if (match) {
      const [, tag, name, location, iv, level, gender] = match;
      coloredMessage =
        `${tag}`.magenta +
        ` Caught `.white +
        `${name}`.red.bold +
        ` in `.white +
        `${location}`.magenta +
        ` | IV: `.white +
        `${iv}`.red +
        ` | Level: `.white +
        `${level}`.magenta +
        ` | Gender: `.white +
        `${gender}`.red;
    }
  }

  console.log(`${stamp} ${label} ${coloredMessage}`);
  if (type === "catch" && typeof message === "string") {
    addCatchLog(message);
  }
}
function getRate(initialDate, totalItems) {
  const currentDate = new Date();
  const timeElapsedInSeconds =
    (currentDate.getTime() - initialDate.getTime()) / 1000;
  const rate = totalItems / timeElapsedInSeconds;
  return rate.toFixed(2);
}
function formatPokemon(content) {
  let str = content; //`Congratulations <@1231528050127016009>! You caught a Level 4 Cacnea Sir<:female:1207734084210532483> (58.60%)!`;
  if (!content.startsWith("Congratulations")) return;
  let mainStr = str.split("!")[1].trim().split(" ");
  let main = str.split("!")[1].trim();
  //Name & level
  let levelIndex = main.split(" ").findIndex((x) => x == "Level") + 2;
  let nameStr = mainStr.slice(levelIndex).join(" ").trim();
  let iv = parseFloat(
    nameStr.substring(nameStr.indexOf(`(`) + 1, nameStr.length - 2)
  );
  nameStr = nameStr.substring(0, nameStr.indexOf(`(`));
  let level = parseInt(mainStr[4]),
    name = nameStr.substring(0, nameStr.indexOf("<"));
  let gender = nameStr.includes("female")
    ? `female`
    : nameStr.includes("male")
    ? `male`
    : `none`;
  return {
    name: name.trim(),
    level: level,
    gender: gender,
    iv: iv,
    shiny: str.includes("✨") || str.includes(":sparkles:"),
  };
}
checkRarity;
const colors = {
  Legendary: "Red",
  Mythical: "Red",
  "Ultra Beast": "Red",
  Regional: "Red",
  Event: "Green",
  Regular: "DarkButNotBlack",
  "Rare IV": "DarkButNotBlack",
  Shiny: "Gold",
};
function logHook(embeds) {
  if (embeds.length <= 0) return;
  let hook = new WebhookClient({
    url: config.logHook,
  });
  hook.send({
    username: `Hoopa Logger`,
    avatarURL: `https://cdn.discordapp.com/avatars/1231471729004646451/a_dd8d0d8528b1820f3e1d7e8298a4fd71.gif`,
    embeds: embeds,
  }).then(() => {
    // Destroy webhook client to prevent memory leak
    hook.destroy().catch(() => {});
  }).catch(() => {
    // Destroy even on error
    hook.destroy().catch(() => {});
  });
}
function chunk(array, size) {
  const chunkedArray = [];
  for (let i = 0; i < array.length; i += size) {
    chunkedArray.push(array.slice(i, i + size));
  }
  return chunkedArray;
}

/**
 * Safely send a message to a channel with error handling
 * Prevents unhandled promise rejections from crashing the bot
 * @param {TextChannel|DMChannel} channel - The channel to send the message to
 * @param {string|MessageOptions} content - The message content or options
 * @returns {Promise<Message|null>} The sent message or null if failed
 */
async function safeSend(channel, content) {
  if (!channel || !channel.send) {
    console.error('Invalid channel provided to safeSend');
    return null;
  }

  try {
    return await channel.send(content);
  } catch (error) {
    // Handle common Discord API errors gracefully
    if (error.code === 50013) {
      // Missing permissions
      console.error(`Missing permissions to send message in channel: ${channel.id}`);
    } else if (error.code === 50035) {
      // Invalid form body
      console.error(`Invalid message content: ${error.message}`);
    } else if (error.code === 50001) {
      // Missing access
      console.error(`Missing access to channel: ${channel.id}`);
    } else if (error.code === 50016) {
      // Rate limited - this is usually handled by discord.js automatically
      console.warn(`Rate limited in channel: ${channel.id}`);
    } else {
      console.error(`Error sending message to channel ${channel.id}:`, error.message);
    }
    return null;
  }
}

async function getGuilds(bot) {
  let def;
  let guildsWithMembers = [];
  let both = false;
  for (let guild of bot.guilds.cache.values()) {
    let p2, p2ass;
    try {
      p2ass = await guild.members.fetch("854233015475109888");
    } catch (error) {}
    try {
      p2 = await guild.members.fetch("716390085896962058");
    } catch (error) {}

    // Add properties to guild object
    guild.hasP2 = !!p2;
    guild.hasAssistant = !!p2ass;

    guildsWithMembers.push(guild);

    // Check if both members exist and a default guild is not set yet
    if (p2 && p2ass && !def && !both) {
      def = guild;
      both = true;
    }
    if ((p2 || p2ass) && !def && !both) def = guild;
  }
  if (!def) def = guildsWithMembers[0];

  // Return array with guilds and the default guild (if found)
  return [guildsWithMembers, def];
}
function commatize(number) {
  let numStr = number.toString();
  let formattedNumber = "";

  for (let i = numStr.length - 1, count = 0; i >= 0; i--) {
    formattedNumber = numStr[i] + formattedNumber;
    count++;
    if (count % 3 === 0 && i !== 0) {
      formattedNumber = "," + formattedNumber;
    }
  }
  return formattedNumber;
}
function errorHook(embeds) {
  if (embeds.length <= 0 || !config.webHook) return;
  let errorWebhook = new WebhookClient({
    url: config.webHook,
  });
  errorWebhook.send({
    username: `Zeta Errors`,
    avatarURL: `https://cdn.discordapp.com/attachments/1253902709912899687/1258054652881141892/d88a5c869741decc1e553ae8e8e86104.jpg?ex=6686a632&is=668554b2&hm=5b5ce79767154bbce3d8a1df338b4d41f7b4a77c2d5a9a92639313058392a230&`,
    embeds: embeds,
  }).then(() => {
    // Destroy webhook client to prevent memory leak
    errorWebhook.destroy().catch(() => {});
  }).catch(err => {
    console.log("Error webhook failed:", err.message);
    // Destroy even on error
    errorWebhook.destroy().catch(() => {});
  });
}
module.exports = {
  format,
  log,
  formatPokemon,
  logHook,
  colors,
  chunk,
  getGuilds,
  commatize,
  getRate,
  errorHook,
  safeSend,
  status,
};
