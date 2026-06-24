#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const AUTH_CACHE_FILE_NAME = ".kgd-auth-cache.json";
const ACCESS_TOKEN_TTL_MS = 110 * 60 * 1000;

function loadDotEnv(envPath = path.resolve(process.cwd(), ".env")) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalIndex = line.indexOf("=");
    if (equalIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalIndex).trim();
    let value = line.slice(equalIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`缺少环境变量 ${name}`);
  }
  return String(value).trim();
}

function getConfigValue(envName, overrideValue) {
  const override = overrideValue === undefined || overrideValue === null ? "" : String(overrideValue).trim();
  if (override) {
    return override;
  }
  return getRequiredEnv(envName);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();

  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (error) {
    throw new Error(`响应不是合法 JSON: ${text}`);
  }

  return {
    ok: response.ok,
    status: response.status,
    json,
  };
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl).replace(/\/+$/, "");
}

function getAuthCacheFilePath() {
  return path.resolve(process.cwd(), AUTH_CACHE_FILE_NAME);
}

function getAuthCacheKey(baseUrl, apiKey, apiSecret, username) {
  return crypto
    .createHash("sha256")
    .update([baseUrl, apiKey, apiSecret, username].join("|"))
    .digest("hex");
}

function readAuthCache() {
  const filePath = getAuthCacheFilePath();
  if (!fs.existsSync(filePath)) {
    return {
      entries: {},
    };
  }

  try {
    const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!json || typeof json !== "object" || typeof json.entries !== "object" || !json.entries) {
      return {
        entries: {},
      };
    }
    return json;
  } catch (error) {
    return {
      entries: {},
    };
  }
}

function writeAuthCache(cacheData) {
  const filePath = getAuthCacheFilePath();
  fs.writeFileSync(filePath, JSON.stringify(cacheData, null, 2), "utf8");
}

function getCachedAuthEntry(cacheKey) {
  const cacheData = readAuthCache();
  const entry = cacheData.entries[cacheKey];
  if (!entry || typeof entry !== "object") {
    return null;
  }

  if (!entry.expires_at || Date.now() >= Number(entry.expires_at)) {
    delete cacheData.entries[cacheKey];
    writeAuthCache(cacheData);
    return null;
  }

  if (!entry.access_token || !entry.login_data || !entry.login_data.token) {
    delete cacheData.entries[cacheKey];
    writeAuthCache(cacheData);
    return null;
  }

  return entry;
}

function saveAuthCacheEntry(cacheKey, accessToken, loginData) {
  const cacheData = readAuthCache();
  cacheData.entries[cacheKey] = {
    access_token: accessToken,
    login_data: loginData,
    cached_at: Date.now(),
    expires_at: Date.now() + ACCESS_TOKEN_TTL_MS,
  };
  writeAuthCache(cacheData);
}

function removeAuthCacheEntry(cacheKey) {
  const cacheData = readAuthCache();
  if (!cacheData.entries[cacheKey]) {
    return;
  }
  delete cacheData.entries[cacheKey];
  writeAuthCache(cacheData);
}

function buildAuthContext(baseUrl, apiKey, apiSecret, username, overrides, accessToken, loginData, cacheKey) {
  return {
    baseUrl,
    apiKey,
    apiSecret,
    username,
    overrides,
    accessToken,
    loginData,
    cacheKey,
    headers: {
      "Content-Type": "application/json",
      "X-TOKEN": loginData.token,
    },
  };
}

async function getAccessToken(baseUrl, apiKey, apiSecret) {
  const url = new URL("/open_api/token", baseUrl);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("api_secret", apiSecret);

  const { json } = await requestJson(url.toString(), {
    method: "GET",
  });

  if (!json || !json.success) {
    throw new Error("获取 access_token 失败");
  }

  if (!json.data || !String(json.data).trim()) {
    throw new Error("获取 access_token 失败：data 为空");
  }

  return json.data;
}

async function loginWithAccessToken(baseUrl, accessToken, username) {
  const { json } = await requestJson(new URL("/open_api/user/login", baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      access_token: accessToken,
      username,
    }),
  });

  if (!json || !json.success) {
    const code = json && Object.prototype.hasOwnProperty.call(json, "code") ? json.code : null;
    const msg = json && Object.prototype.hasOwnProperty.call(json, "msg") ? json.msg : null;
    const suffix = [
      code !== null ? `code=${code}` : "",
      msg !== null ? `msg=${msg}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    throw new Error(suffix ? `登录失败 ${suffix}` : "登录失败");
  }

  if (!json.data) {
    throw new Error("登录失败：data 为空");
  }

  return json.data;
}

async function createAuthContext(overrides = {}, options = {}) {
  loadDotEnv();

  const baseUrl = normalizeBaseUrl(getConfigValue("KGD_BASE_URL", overrides.baseUrl));
  const apiKey = getConfigValue("KGD_API_KEY", overrides.apiKey);
  const apiSecret = getConfigValue("KGD_API_SECRET", overrides.apiSecret);
  const username = getConfigValue("KGD_USERNAME", overrides.username);
  const cacheKey = getAuthCacheKey(baseUrl, apiKey, apiSecret, username);

  if (!options.forceRefresh) {
    const cachedEntry = getCachedAuthEntry(cacheKey);
    if (cachedEntry) {
      return buildAuthContext(
        baseUrl,
        apiKey,
        apiSecret,
        username,
        overrides,
        cachedEntry.access_token,
        cachedEntry.login_data,
        cacheKey
      );
    }
  }

  const accessToken = await getAccessToken(baseUrl, apiKey, apiSecret);
  const loginData = await loginWithAccessToken(baseUrl, accessToken, username);
  saveAuthCacheEntry(cacheKey, accessToken, loginData);

  return buildAuthContext(baseUrl, apiKey, apiSecret, username, overrides, accessToken, loginData, cacheKey);
}

function buildApiErrorMessage(apiPath, json, fallbackMessage) {
  const msg = json && json.msg ? json.msg : fallbackMessage;
  const details = {};

  if (json && Object.prototype.hasOwnProperty.call(json, "code")) {
    details.code = json.code;
  }
  if (json && Object.prototype.hasOwnProperty.call(json, "post_track")) {
    details.post_track = json.post_track;
  }
  if (json && Object.prototype.hasOwnProperty.call(json, "data")) {
    details.data = json.data;
  }

  const suffix = Object.keys(details).length ? ` | details=${JSON.stringify(details)}` : "";
  return `${apiPath} 调用失败: ${msg}${suffix}`;
}

function isAuthFailure(json) {
  const code = json && Object.prototype.hasOwnProperty.call(json, "code") ? String(json.code) : "";
  const msg = json && Object.prototype.hasOwnProperty.call(json, "msg") ? String(json.msg) : "";
  const normalizedMsg = msg.toLowerCase();

  return (
    code === "401" ||
    normalizedMsg.includes("token") ||
    normalizedMsg.includes("登录") ||
    normalizedMsg.includes("鉴权") ||
    normalizedMsg.includes("认证")
  );
}

async function recreateAuthContext(context) {
  const overrides = context && context.overrides ? context.overrides : {};
  if (context && context.cacheKey) {
    removeAuthCacheEntry(context.cacheKey);
  }
  return createAuthContext(overrides, {
    forceRefresh: true,
  });
}

async function openApiPost(context, apiPath, body = {}) {
  const url = new URL(apiPath, `${context.baseUrl}/`);
  let activeContext = context;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { json } = await requestJson(url, {
      method: "POST",
      headers: activeContext.headers,
      body: JSON.stringify(body),
    });

    if (json && json.success) {
      return json;
    }

    if (attempt === 0 && isAuthFailure(json)) {
      activeContext = await recreateAuthContext(activeContext);
      continue;
    }

    throw new Error(buildApiErrorMessage(apiPath, json, "接口调用失败"));
  }

  throw new Error(buildApiErrorMessage(apiPath, null, "接口调用失败"));
}

async function openApiUploadFile(context, filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`找不到文件: ${filePath}`);
  }

  const url = new URL("/open_api/upload/file", `${context.baseUrl}/`);
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  let activeContext = context;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const formData = new FormData();
    const blob = new Blob([fileBuffer]);
    formData.append("file", blob, fileName);

    const { json } = await requestJson(url, {
      method: "POST",
      headers: {
        "X-TOKEN": activeContext.loginData.token,
      },
      body: formData,
    });

    if (json && json.success) {
      return json;
    }

    if (attempt === 0 && isAuthFailure(json)) {
      activeContext = await recreateAuthContext(activeContext);
      continue;
    }

    throw new Error(buildApiErrorMessage("/open_api/upload/file", json, "文件上传失败"));
  }

  throw new Error(buildApiErrorMessage("/open_api/upload/file", null, "文件上传失败"));
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`找不到文件: ${filePath}`);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`JSON 解析失败: ${filePath}`);
  }
}

function buildFieldValueList(registry, inputData, objectType) {
  if (!registry || typeof registry !== "object" || !registry.objects) {
    throw new Error("字段注册表缺少 objects 节点");
  }

  const definitions = registry.objects[objectType];
  if (!Array.isArray(definitions)) {
    throw new Error(`字段注册表中不存在对象类型: ${objectType}`);
  }

  const result = [];

  for (const definition of definitions) {
    const fieldName = String(definition.name || "").trim();
    const sourceKey = String(definition.sourceKey || "").trim();
    const required = Boolean(definition.required);

    if (!fieldName || !sourceKey) {
      continue;
    }

    const value = inputData[sourceKey];
    const isEmpty =
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim().length === 0);

    if (isEmpty) {
      if (required) {
        throw new Error(`字段缺失: ${sourceKey} -> ${fieldName}`);
      }
      continue;
    }

    result.push({
      name: fieldName,
      value: String(value),
    });
  }

  return result;
}

module.exports = {
  buildFieldValueList,
  createAuthContext,
  getConfigValue,
  getAccessToken,
  getRequiredEnv,
  loadDotEnv,
  loginWithAccessToken,
  normalizeBaseUrl,
  openApiPost,
  openApiUploadFile,
  readJsonFile,
  requestJson,
  buildApiErrorMessage,
  isAuthFailure,
};
