import OpenAI from "openai";
import { ARK_API_KEY } from "../../config/config-doubao.js";

const openai = new OpenAI({
  apiKey: ARK_API_KEY,
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
});

export function figureOut(problem) {
  console.log(problem);
  return new Promise(async (resolve, reject) => {
    try {
      const completion = await openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "你叫阿罪，是个牛马",
          },
          { role: "user", content: problem },
        ],
        model: "ep-20240826163945-jkvxw",
      });
      console.log(completion.choices[0]?.message?.content);
      resolve(completion.choices[0]?.message?.content);
    } catch (error) {
      console.log(error);
      reject("出错了，等会再问我吧");
    }
  });

  // Streaming: 流式输出
  // console.log("----- streaming request -----");
  // const stream = await openai.chat.completions.create({
  //   messages: [
  //     {
  //       role: "system",
  //       content: "你是豆包，是由字节跳动开发的 AI 人工智能助手",
  //     },
  //     { role: "user", content: "常见的十字花科植物有哪些？" },
  //   ],
  //   model: "doubao-pro-4k",
  //   stream: true,
  // });
  // for await (const part of stream) {
  //   process.stdout.write(part.choices[0]?.delta?.content || "");
  // }
  // process.stdout.write("\n");
}
