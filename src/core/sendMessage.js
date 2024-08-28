import { log } from "wechaty";
import * as MessageType from "../entity/Message-Type.js";
import * as MYCONFIG from "../../config/config.js";
import axios from "axios";
import { WxPushData } from "../entity/wx-push-data.js";
import * as CHATGPT_CONFIG from "../../config/config-chatgpt.js";
import { ChatGPTModel } from "../entity/ChatGPTModel.js";
import { HttpsProxyAgent } from "https-proxy-agent";
import { PROXY_CONFIG } from "../../config/config-proxy.js";

import { FileBox } from "file-box";
import { figureOut } from "../ai/index.js";
import { randomImg } from "../api/index.js";
import fs from "fs";
/**
 * 处理消息是否需要回复
 * @param message 消息对象
 */
export async function sendMessage(message) {
  console.log("房间号", await message.room());
  const MyMessage = {
    type: await message.type(),
    self: await message.self(),
    text: await message.text(),
    room: await message.room(),
    mentionSelf: await message.mentionSelf(),
    roomName: (await message.room()?.topic()) || null,
    alias: await message.talker().alias(),
    date: await message.date(),
    talkerId: await message.payload.talkerId,
    listenerId:
      (await message.payload.listenerId) == undefined
        ? null
        : message.payload.listenerId,
    roomId:
      (await message.payload.roomId) == undefined
        ? null
        : message.payload.roomId,
  };
  //1、判断消息是否符合逻辑
  var checkResult = checkMessage(MyMessage);
  console.log("是否符合逻辑", checkResult);
  if (!checkResult) return;

  //2、发送后端处理消息,并返回发送微信
  forwardMsg(MyMessage, message);
}

/**
 * 判断消息是否符合逻辑
 *
 * @param {MyMessage} message 消息
 * @returns 符合逻辑返回true；否则返回false
 */
function checkMessage(message) {
  //消息类型不是文本
  console.log("消息类型", message.type);
  if (message.type != MessageType.MESSAGE_TYPE_TEXT) {
    return false;
  }
  //自己发送的消息不处理
  // if (message.self) {
  //   return false;
  // }
  //引用的文本不处理
  const regexp = /「[^」]+」\n- - - - - - - - - - - - - -/;
  if (regexp.test(message.text)) {
    return false;
  }
  //非白名单内的不处理
  if (isRoomOrPrivate(message) == 0) {
    return false;
  }
  return true;
}

/**
 * 判断消息是否
 *
 *      是房间消息且@机器人，则返回1
 *      是私聊且在白名单内，则返回2
 *      否则返回0
 *
 * @param {MyMessage} message 消息内容
 */
function isRoomOrPrivate(message) {
  console.log(message.room);
  //房间内的消息需要@ 且群聊在名单内 @机器人名或者微信号名
  if (
    message.room &&
    (message.mentionSelf || isCallRobot(message.text)) &&
    MYCONFIG.roomWhiteList.includes(message.roomName)
  ) {
    return 1;
  } //非房间内消息，且发送人备注在名单内
  else if (!message.room && MYCONFIG.aliasWhiteList.includes(message.alias)) {
    return 2;
  } else {
    return 0;
  }
}

function isCallRobot(content) {
  const reg = new RegExp(`@${MYCONFIG.robotName}`);
  const isCallRobot = reg.test(content);
  log.info(`是否@机器人:${isCallRobot}`);
  return isCallRobot;
}

/**
 * 发送后端处理消息，并返回发送微信
 * @param {Message} message 消息对象
 */
async function forwardMsg(MyMessage, message) {
  if (!isCallRobot) return;
  log.info(`\n 消息发送时间:${MyMessage.date}
    消息发送人:${MyMessage.alias} 
    消息类型:${MyMessage.type} 
    消息是否@我:${MyMessage.mentionSelf} 
    消息内容:${MyMessage.text} `);

  //1、简单返回消息
  // sendSay(message, "你好,我是阿罪", MyMessage);

  const problem = MyMessage.text.replace("@" + MYCONFIG.robotName, "").trim();
  console.log("问题是：", problem);
  // 指令
  if (problem == "1") {
    // 随机图片
    const url = await randomImg();
    console.log(url);
    // 网络静态图片
    // const res = FileBox.fromUrl(
    //   "https://wechaty.github.io/wechaty/images/bot-qr-code.png"
    // );
    // 本地图片
    const res = FileBox.fromFile(url);

    sendSay(message, res, MyMessage).then(() => {
      fs.unlinkSync(url);
    });
  } else {
    // AI回复
    const res = await figureOut(problem);
    sendSay(message, res, MyMessage);
  }
  //

  //2、发送后端
  // axios({
  //     url: MYCONFIG.msgPushUrl,
  //     method: 'post',
  //     headers: {
  //         'Content-Type': 'application/json'
  //     },
  //     data: JSON.stringify(
  //         new WxPushData(
  //             //消息
  //             MyMessage.text,
  //             //消息发送人备注
  //             MyMessage.alias,
  //             //消息发送者ID 微信ID不是永久性
  //             MyMessage.talkerId,
  //             //私聊才有listenerID
  //             MyMessage.listenerId,
  //             //群聊才有房间ID
  //             MyMessage.roomId,
  //             //apikey
  //             MYCONFIG.apiKey
  //             ))
  // }).then(result => {
  //     var reMsg = result.data.msg;
  //     sendSay(message, reMsg,MyMessage);
  // }).catch(response => {
  //     log.error(`异常响应：${response}`);
  //     sendSay(message, `异常响应:${response}`,MyMessage);
  //     return `异常响应：${responese}`;
  // })
}

/**
 * 发送回复逻辑
 *
 *      区分群聊私聊
 * @param {Message} message 消息内容
 * @param {String} reStr 回复内容
 */
function sendSay(message, reStr, MyMessage) {
  const isROP = isRoomOrPrivate(MyMessage);
  return new Promise(async resolve => {
    try {
      //房间内消息
      if (isROP == 1) {
        await message.room().say(reStr, message.talker());
      } else if (isROP == 2) {
        //私聊消息
        await message.talker().say(reStr);
      }
      resolve();
    } catch (error) {
      console.log(error);
    }
  });
}
