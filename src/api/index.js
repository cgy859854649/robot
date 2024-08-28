import request from "../api/config.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// 获取 __dirname 等效值
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//随机图片
export const randomImg = () => {
  return new Promise(async resolve => {
    const res = await request.get({
      url: "https://cdn.seovx.com/?mom=302",
      responseType: "stream",
    });
    const filePath = path.join(__dirname, "output.png");
    // 创建一个写入流
    const fileStream = fs.createWriteStream(filePath);
    // 将响应流管道到文件写入流
    res.pipe(fileStream);
    fileStream.on("finish", () => {
      fileStream.close(); // 关闭文件流
      resolve(filePath);
    });
  });
};
