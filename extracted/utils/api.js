const axios=require("axios");
const https=require("https");
const {getConfig}=require("./runtimeConfig");
const {EmbedBuilder,WebhookClient}=require("discord.js");

const httpsAgent=new https.Agent({rejectUnauthorized:false});
const axiosInstance=axios.create({timeout:180000,httpsAgent,validateStatus:status=>status<500});
function normalizeUrl(hostname){if(!hostname)return "";if(/^https?:\/\//i.test(hostname))return hostname.replace(/\/+$/,"");return `http://${hostname.replace(/\/+$/,"")}`;}
function maskLicenseKey(key){if(!key||key.length<5)return "***";return `***${key.slice(-4)}`;}

const AVATAR="https://cdn.discordapp.com/attachments/1354403087476985938/1354403187074793564/image0.gif";

async function getAIPrediction(imageUrl){
  const config=getConfig();
  const baseUrl=normalizeUrl(config.aiHostname);
  const apiKey=config.aiApiKey||config.aiLicenseKey;
  if(!apiKey){console.error("❌ [AI-API] Missing aiApiKey in config");return {success:false,error:"Missing aiApiKey in config"};}
  if(typeof imageUrl!=="string"||!imageUrl.trim())return {success:false,error:"Image URL required"};
  let parsedUrl;
  try{parsedUrl=new URL(imageUrl.trim());if(!["http:","https:"].includes(parsedUrl.protocol))throw new Error("Only HTTP and HTTPS image URLs are supported");}catch(err){return {success:false,error:err.message==="Only HTTP and HTTPS image URLs are supported"?err.message:"Invalid image URL"};}
  if(!baseUrl)return {success:false,error:"Missing AI hostname in config"};
  const apiUrl=`${baseUrl}/predict`;
  try{
    const res=await axiosInstance.post(apiUrl,{url:parsedUrl.toString()},{headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},timeout:180000,maxContentLength:10*1024*1024,maxBodyLength:1024*1024});
    const data=res?.data;
    if(res.status>=400){
      const msg=data&&typeof data==="object"&&data.error?data.error:`HTTP ${res.status}`;
      console.error("❌ [AI-API]",msg,`(${apiUrl})`);
      return {success:false,error:String(msg),...(data?.detail?{detail:String(data.detail)}:{}),...(data?.retry!==undefined?{retry:data.retry}:{})};
    }
    if(!data||typeof data!=="object")return {success:false,error:"Invalid response from prediction API"};
    if(data.success===false)return {...data,error:String(data.error||"Prediction failed")};
    return data;
  }catch(err){
    if(err.response){
      const d=err.response.data;
      const msg=d&&typeof d==="object"&&d.error?d.error:`HTTP ${err.response.status}`;
      console.error("❌ [AI-API]",d||err.message,`(${apiUrl})`);
      return {success:false,error:String(msg),...(d?.detail?{detail:String(d.detail)}:{}),...(d?.retry!==undefined?{retry:d.retry}:{})};
    }
    const msg=err.request?"No response from prediction API (host down?)":err.message;
    console.error("❌ [AI-API]",msg,`(${apiUrl})`);
    return {success:false,error:msg};
  }
}

const getNamee=getAIPrediction;

async function getName(imageUrl){
  try{
    const result=await getAIPrediction(imageUrl);
    if(!result||result.error||result.success===false)return [null,0];
    const name=result.pokemon||result.predicted_class||result.prediction||result.name||null;
    const confidence=Number(result.confidence)||0;
    if(typeof name!=="string"||!name.trim())return [null,0];
    return [name.trim().toLowerCase(),confidence];
  }catch{return [null,0];}
}

async function solveCaptcha(token,userId){
  const config=getConfig();
  const payload={licenseKey:config.captchaLicenseKey,username:"Captcha Solver",token,userID:userId};
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const start=Date.now();
      const res=await axiosInstance.post(config.captchaSolveUrl,payload,{timeout:60000});
      if(res.status>=400)return {success:false,error:res.data?.error||`HTTP ${res.status}`};
      return {success:true,result:res.data,solveTime:((Date.now()-start)/1000).toFixed(2)};
    }catch(err){
      console.error(`Captcha attempt ${attempt} failed:`,err.message);
      if(attempt===3)return {success:false,error:err.message||"Solve failed"};
    }
  }
}

async function checkApiKeyBalance(){return {success:false,error:"Balance checking not supported"};}

async function fetchLicenseBalance(licenseKey){
  if(!licenseKey)return null;
  try{
    const res=await axiosInstance.post("http://prem-eu1.bot-hosting.net:22498/check-balance",{licenseKey},{timeout:15000});
    const data=res?.data;
    if(!data||data.success!==true)return null;
    return {remaining:data.remaining,used:data.usedSolves??data.used??null,maxSolves:data.maxSolves??null};
  }catch{return null;}
}

async function sendCaptchaMessage(username,userId,status,method="lemonxdop captcha",timeTaken=null,balanceInfo=null,serverName="Unknown Server"){
  const config=getConfig();
  if(!config.captchaHook)return;
  let hook=null;
  try{
    hook=new WebhookClient({url:config.captchaHook});
    const ts=Math.floor(Date.now()/1000);
    const embed=new EmbedBuilder().setTimestamp().setFooter({text:method,iconURL:AVATAR});
    const verifyUrl=`https://verify.poketwo.net/captcha/${userId}`;
    if(status==="detected"){
      embed.setTitle("🔍 CAPTCHA Detected").setColor(0xffa500).setDescription(`👤 **${username}**\n🆔 \`${userId}\`\n🌐 ${serverName}\n\n🔗 [Verify](${verifyUrl})\n🕒 <t:${ts}:R>`);
    }else if(status==="solved"){
      const payload=balanceInfo&&typeof balanceInfo.data==="object"&&balanceInfo.data||balanceInfo||{};
      const remainingRaw=payload.remaining??payload.remainingSolves??payload.left??null;
      const usedRaw=payload.used??payload.usedSolves??payload.consumed??null;
      const maxRaw=payload.maxSolves??payload.max??null;
      const remainingNum=Number(remainingRaw),usedNum=Number(usedRaw),maxNum=Number(maxRaw);
      let remainingVal=remainingRaw??"N/A",usedVal=usedRaw??"N/A";
      if((usedRaw==null||usedRaw==="N/A")&&remainingRaw!=null&&Number.isFinite(remainingNum)&&Number.isFinite(maxNum)&&maxNum>=remainingNum)usedVal=String(maxNum-remainingNum);
      else if(usedRaw!=null&&Number.isFinite(usedNum))usedVal=String(usedNum);
      if(usedVal==="N/A"||remainingVal==="N/A"){
        const liveBalance=await fetchLicenseBalance(config.captchaLicenseKey);
        if(liveBalance){
          if(usedVal==="N/A"&&liveBalance.used!=null)usedVal=String(liveBalance.used);
          if(remainingVal==="N/A"&&liveBalance.remaining!=null)remainingVal=String(liveBalance.remaining);
        }
      }
      embed.setTitle("✅ CAPTCHA Solved").setColor(0x00ff00).setDescription(`👤 **${username}**\n🆔 \`${userId}\`\n⏱️ ${typeof timeTaken==="number"?`${timeTaken}s`:timeTaken??"N/A"}\n📉 Used: **${usedVal}**\n📈 Remaining: **${remainingVal}**\n🌐 ${serverName}\n\n🔗 [Verify](${verifyUrl})\n🕒 <t:${ts}:R>`);
    }else{
      embed.setTitle("❌ CAPTCHA Failed").setColor(0xff0000).setDescription(`👤 **${username}**\n🆔 \`${userId}\`\n🌐 ${serverName}\n\n⚠️ Manual verification required\n🔗 [Verify](${verifyUrl})`);
    }
    await hook.send({username:"lemonxdop solver",avatarURL:AVATAR,embeds:[embed]});
  }catch(err){console.error("Captcha webhook error:",err);}finally{if(hook){try{hook.destroy();}catch{}}}
}

async function sendQuestMessage(username,userId,questContent,coinsEarned=null,serverName="Unknown Server",channelName=null){
  const config=getConfig();
  if(!config.questHook)return;
  let hook=null;
  try{
    hook=new WebhookClient({url:config.questHook});
    const ts=Math.floor(Date.now()/1000);
    const color=coinsEarned>=50000?0xffd700:coinsEarned>=10000?0xffa500:0x00ff00;
    const embed=new EmbedBuilder().setTitle("🎯 Quest Completed").setColor(color).setTimestamp().setFooter({text:"Quest Logger",iconURL:AVATAR}).setDescription(coinsEarned?`💰 **${coinsEarned.toLocaleString()} Pokécoins earned**`:"✅ Quest completed successfully").addFields(
      {name:"👤 User",value:String(username||"Unknown").slice(0,1024),inline:true},
      {name:"🆔 ID",value:`\`${userId}\``,inline:true},
      {name:"🌐 Server",value:String(serverName||"Unknown Server").slice(0,1024),inline:true},
      {name:"🕒 Time",value:`<t:${ts}:R>`,inline:true}
    );
    if(channelName)embed.addFields({name:"📍 Channel",value:`#${String(channelName).slice(0,1000)}`,inline:true});
    if(questContent)embed.addFields({name:"📜 Quest",value:"```\n"+String(questContent).slice(0,900)+"\n```"});
    await hook.send({embeds:[embed]});
  }catch(err){console.error("Quest webhook error:",err);}finally{if(hook){try{hook.destroy();}catch{}}}
}

async function sendRarityMessage(username,userId,token,pokemonName,level,iv,shiny,gender,rarity,loggable,stats,messageUrl,channelName,serverName,pokemonImage=null){
  const config=getConfig();
  if(!config.rarityHook)return;
  let hook=null;
  try{
    hook=new WebhookClient({url:config.rarityHook});
    const ts=Math.floor(Date.now()/1000);
    const tokenMasked=token?`••••${token.slice(-5)}`:"N/A";
    const embed=new EmbedBuilder().setTitle("✨ Pokémon Caught").setColor(shiny?0xffd700:0x808080).setTimestamp().setFooter({text:loggable?.length?loggable.join(" • ").slice(0,2048):"Regular Catch",iconURL:AVATAR}).setDescription(`**${pokemonName}** • Lv ${level}\nIV **${Number(iv).toFixed(2)}%**`).addFields(
      {name:"👤 Trainer",value:String(username||"Unknown").slice(0,1024),inline:true},
      {name:"🆔 ID",value:`\`${userId}\``,inline:true},
      {name:"🔑 Token",value:tokenMasked,inline:true},
      {name:"⚧ Gender",value:String(gender||"Unknown"),inline:true},
      {name:"✨ Shiny",value:shiny?"Yes":"No",inline:true},
      {name:"⭐ Rarity",value:String(rarity||"Normal"),inline:true},
      {name:"📍 Location",value:`${channelName||"Unknown"}\n${serverName||"Unknown"}`.slice(0,1024),inline:false},
      {name:"🕒 Time",value:`<t:${ts}:R>`}
    );
    if(pokemonImage)embed.setThumbnail(pokemonImage);
    if(messageUrl)embed.setURL(messageUrl);
    await hook.send({embeds:[embed]});
  }catch(err){console.error("Rarity webhook error:",err);}finally{if(hook){try{hook.destroy();}catch{}}}
}

module.exports={getAIPrediction,getName,getNamee,solveCaptcha,checkApiKeyBalance,sendCaptchaMessage,sendQuestMessage,sendRarityMessage};