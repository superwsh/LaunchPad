/**
 * Windows / cross-platform 版本的 generate_update_data
 * 替代 generate_update_data.sh，不依赖 jq 和 sh
 *
 * usage:
 *   node generate_update_data.js '<json_string>' [server_url]
 */

const http = require("http");
const https = require("https");

const JSON1 = process.argv[2];
const SERVER_URL = process.argv[3] || "localhost:30001";

if (!JSON1) {
  console.error("Error: JSON data is required as the first argument.");
  process.exit(1);
}

// 解析输入 JSON
let obj;
try {
  obj = JSON.parse(JSON1);
} catch (err) {
  console.error("Error: Invalid JSON input.", err.message);
  process.exit(1);
}

// 转换 JSON：对应原 jq 逻辑
//   + {"id": 3}
//   | .tokenPriceInPT = .tokenPriceInEth
//   | del(.tokenPriceInEth)
//   | 所有时间戳字段 * 1000 → 追加 "000"
obj.id = 3;
obj.tokenPriceInPT = obj.tokenPriceInEth;
delete obj.tokenPriceInEth;
obj.saleEndTime = String(obj.saleEndTime) + "000";
obj.tokensUnlockTime = String(obj.tokensUnlockTime) + "000";
obj.registrationStart = String(obj.registrationStart) + "000";
obj.registrationEnd = String(obj.registrationEnd) + "000";
obj.saleStartTime = String(obj.saleStartTime) + "000";

const jsonBody = JSON.stringify(obj);

console.log(`SERVER_URL: ${SERVER_URL}`);
console.log(`request json: ${jsonBody}`);

// 发送 POST 请求
const postData = Buffer.from(jsonBody, "utf-8");
const url = new URL(`http://${SERVER_URL}/boba/update`);

const options = {
  hostname: url.hostname,
  port: url.port,
  path: url.pathname,
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": postData.length,
  },
};

const transport = url.protocol === "https:" ? https : http;

const req = transport.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    console.log(`Response (${res.statusCode}):`, data);
  });
});

req.on("error", (err) => {
  console.error("Request failed:", err.message);
  process.exit(1);
});

req.write(postData);
req.end();
