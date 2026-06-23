#!/usr/bin/env node

const {
  getAccessToken,
  getRequiredEnv,
  loadDotEnv,
  loginWithAccessToken,
} = require("./kgd-common");

async function main() {
  loadDotEnv();

  const baseUrl = getRequiredEnv("KGD_BASE_URL");
  const apiKey = getRequiredEnv("KGD_API_KEY");
  const apiSecret = getRequiredEnv("KGD_API_SECRET");
  const username = getRequiredEnv("KGD_USERNAME");

  const accessToken = await getAccessToken(baseUrl, apiKey, apiSecret);
  const loginData = await loginWithAccessToken(baseUrl, accessToken, username);

  console.log("OK: 鉴权成功");
  console.log(`User: ${loginData.real_name}(${loginData.name})`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
