#!/usr/bin/env node

const path = require("path");
const {
  buildFieldValueList,
  createAuthContext,
  openApiPost,
  openApiUploadFile,
  readJsonFile,
} = require("./kgd-common");
const { createHandlerFactories } = require("./commands/factories");
const { buildContractCommands } = require("./commands/contract");
const { buildGoodsCommands } = require("./commands/goods");
const { buildListCommands } = require("./commands/list");
const { buildStatusCommands } = require("./commands/status");
const { buildWriteCommands } = require("./commands/write");
const { buildWarehouseCommands } = require("./commands/warehouse");
const { buildCommandDefinitions } = require("./commands/registry");

function parseArgs(argv) {
  const result = {
    _: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (!current.startsWith("--")) {
      result._.push(current);
      continue;
    }

    const key = current.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      result[key] = true;
      continue;
    }

    result[key] = next;
    index += 1;
  }

  return result;
}

function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNumber(value, fallback) {
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBool(value) {
  if (typeof value === "boolean") {
    return value;
  }

  return ["1", "true", "yes", "y"].includes(String(value).toLowerCase());
}

function printUsage() {
  const lines = [
    "用法:",
    "  node ./scripts/kgd-cli.js <命令> [--base-url https://api.kgd.ltd] [--api-key xxx] [--api-secret xxx] [--username xxx]",
  ];
  for (const definition of COMMAND_DEFINITIONS) {
    lines.push(...definition.usage);
  }
  lines.push(
    "",
    "全局鉴权参数:",
    "  --base-url    临时覆盖 KGD_BASE_URL",
    "  --api-key     临时覆盖 KGD_API_KEY，通常仅首次部署或切企业时使用",
    "  --api-secret  临时覆盖 KGD_API_SECRET，通常仅首次部署或切企业时使用",
    "  --username    临时覆盖 KGD_USERNAME，适合不同对话用户按会话确认",
    "说明:",
    "  建议把 KGD_API_KEY/KGD_API_SECRET 作为固定企业配置写入运行环境。",
    "  不同用户主要确认 KGD_USERNAME；命令行参数优先于 .env，不写入仓库。",
  );

  process.stderr.write(`${lines.join("\n")}\n`);
}

function loadJsonInput(args) {
  if (args.input) {
    const filePath = path.resolve(process.cwd(), args.input);
    return readJsonFile(filePath);
  }

  if (args.json) {
    try {
      return JSON.parse(args.json);
    } catch (error) {
      throw new Error("`--json` 不是合法 JSON");
    }
  }

  throw new Error("缺少输入参数：请提供 --input 或 --json");
}

function hasJsonInput(args) {
  return Boolean(args.input || args.json);
}

function normalizeApiPath(apiPath) {
  const normalized = String(apiPath || "").trim();
  if (!normalized) {
    throw new Error("缺少参数：--path");
  }
  if (!normalized.startsWith("/open_api/")) {
    throw new Error("`--path` 必须以 /open_api/ 开头");
  }
  return normalized;
}

function printJson(data) {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

function isBlankValue(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function getRequiredFileArg(args) {
  const fileArg = String(args.file || "").trim();
  if (!fileArg) {
    throw new Error("缺少参数：--file");
  }
  return path.resolve(process.cwd(), fileArg);
}

function getRequiredStringArg(args, name, commandName) {
  const value = String(args[name] || "").trim();
  if (!value) {
    throw new Error(`${commandName} 缺少参数：--${name}`);
  }
  return value;
}

function getRequiredPositiveNumberArg(args, name, commandName) {
  const value = toNumber(args[name], 0);
  if (!(value > 0)) {
    throw new Error(`${commandName} 缺少或错误的参数：--${name} 必须大于 0`);
  }
  return value;
}

function getOptionalNumberArg(args, name, fallback) {
  return args[name] === undefined ? fallback : toNumber(args[name], fallback);
}

function getRequiredPositiveIntValue(value, fieldName, commandName) {
  const parsed = toInt(value, 0);
  if (!parsed) {
    throw new Error(`${commandName} 缺少或错误的字段：${fieldName} 必须为正整数`);
  }
  return parsed;
}

function getRequiredPositiveNumberValue(value, fieldName, commandName) {
  const parsed = toNumber(value, Number.NaN);
  if (!(parsed > 0)) {
    throw new Error(`${commandName} 缺少或错误的字段：${fieldName} 必须大于 0`);
  }
  return parsed;
}

function getOptionalNumberValue(value, fieldName, commandName) {
  if (isBlankValue(value)) {
    return value;
  }
  const parsed = toNumber(value, Number.NaN);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${commandName} 缺少或错误的字段：${fieldName} 必须为数字`);
  }
  return parsed;
}

function getRequiredStringValue(value, fieldName, commandName) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    throw new Error(`${commandName} 缺少参数：${fieldName}`);
  }
  return normalized;
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseJsonArg(value, argName, fallback) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }
  try {
    return JSON.parse(String(value));
  } catch (error) {
    throw new Error(`--${argName} 不是合法 JSON`);
  }
}

function buildProduceBillAddPayloadFromArgs(args) {
  const commandName = "produce-bill:add";
  const goodsId = toInt(args["goods-id"], 0);
  if (!goodsId) {
    throw new Error(`${commandName} 缺少或错误的参数：--goods-id 必须为正整数`);
  }

  const payload = {
    goods_id: goodsId,
    num: getRequiredPositiveNumberArg(args, "num", commandName),
  };

  if (args.code) {
    payload.code = String(args.code);
  }
  if (args["delivery-date"]) {
    payload.delivery_date = getRequiredStringArg(args, "delivery-date", commandName);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.delivery_date)) {
      throw new Error(`${commandName} 参数错误：--delivery-date 必须是 YYYY-MM-DD`);
    }
  }
  if (args["priority-name"]) {
    payload.priority_name = String(args["priority-name"]);
  }
  if (args["start-produce-date"]) {
    payload.start_produce_date = String(args["start-produce-date"]);
  }
  if (args["end-produce-date"]) {
    payload.end_produce_date = String(args["end-produce-date"]);
  }
  if (args.remark) {
    payload.remark = String(args.remark);
  }

  const craftList = parseJsonArg(args["craft-list-json"], "craft-list-json", undefined);
  if (craftList !== undefined) {
    payload.craft_list = craftList;
  }

  const fieldValueList = parseJsonArg(args["field-values-json"], "field-values-json", undefined);
  if (fieldValueList !== undefined) {
    payload.fieldValueList = fieldValueList;
  }

  const attachments = parseJsonArg(args["attachments-json"], "attachments-json", undefined);
  if (attachments !== undefined) {
    payload.attachments = attachments;
  }

  return payload;
}

function buildCustomerAddPayloadFromArgs(args) {
  const commandName = "customer:add";
  const payload = {
    name: getRequiredStringArg(args, "name", commandName),
    linkman_name: getRequiredStringArg(args, "linkman-name", commandName),
  };

  if (args.mobile) {
    payload.mobile = String(args.mobile);
  }
  if (args["tag-names-json"]) {
    payload.tag_names = parseJsonArg(args["tag-names-json"], "tag-names-json", []);
  }
  if (args["province-name"]) {
    payload.province_name = String(args["province-name"]);
  }
  if (args["city-name"]) {
    payload.city_name = String(args["city-name"]);
  }
  if (args["area-name"]) {
    payload.area_name = String(args["area-name"]);
  }
  if (args.address) {
    payload.address = String(args.address);
  }

  return payload;
}

function buildSupplierAddPayloadFromArgs(args) {
  const commandName = "supplier:add";
  const payload = {
    name: getRequiredStringArg(args, "name", commandName),
  };

  if (args["linkman-name"]) {
    payload.linkman_name = String(args["linkman-name"]);
  }
  if (args["linkman-mobile"]) {
    payload.linkman_mobile = String(args["linkman-mobile"]);
  }
  if (args["tag-names-json"]) {
    payload.tag_names = parseJsonArg(args["tag-names-json"], "tag-names-json", []);
  }
  if (args["province-name"]) {
    payload.province_name = String(args["province-name"]);
  }
  if (args["city-name"]) {
    payload.city_name = String(args["city-name"]);
  }
  if (args["area-name"]) {
    payload.area_name = String(args["area-name"]);
  }
  if (args.address) {
    payload.address = String(args.address);
  }

  return payload;
}

function buildReportEditPayloadFromArgs(args) {
  const commandName = "report:edit";
  const id = toInt(args.id, 0);
  const reportUserId = toInt(args["report-user-id"], 0);
  if (!id) {
    throw new Error(`${commandName} 缺少或错误的参数：--id 必须为正整数`);
  }
  if (!reportUserId) {
    throw new Error(`${commandName} 缺少或错误的参数：--report-user-id 必须为正整数`);
  }

  const payload = {
    id,
    report_user_id: reportUserId,
    valid_num: getRequiredPositiveNumberArg(args, "valid-num", commandName),
    waste_num: getOptionalNumberArg(args, "waste-num", 0),
  };

  if (args["is-finish"] !== undefined) {
    payload.is_finish = toBool(args["is-finish"]) ? 1 : 0;
  }
  if (args.remark) {
    payload.remark = String(args.remark);
  }
  if (args["start-time"]) {
    payload.start_time = String(args["start-time"]);
  }
  if (args["end-time"]) {
    payload.end_time = String(args["end-time"]);
  }
  if (args["working-minutes"] !== undefined) {
    payload.working_minutes = getOptionalNumberArg(args, "working-minutes", 0);
  }
  if (args["traceability-codes-json"]) {
    payload.traceability_codes = parseJsonArg(args["traceability-codes-json"], "traceability-codes-json", []);
  }
  if (args["report-waste-array-json"]) {
    payload.report_waste_array = parseJsonArg(args["report-waste-array-json"], "report-waste-array-json", []);
  }
  if (args["field-values-json"]) {
    payload.fieldValueList = parseJsonArg(args["field-values-json"], "field-values-json", []);
  }
  if (args["attachments-json"]) {
    payload.attachments = parseJsonArg(args["attachments-json"], "attachments-json", []);
  }

  return payload;
}

function buildGoodsDisablePayloadFromArgs(args) {
  const commandName = "goods:disable";
  const id = toInt(args.id, 0);
  if (!id) {
    throw new Error(`${commandName} 缺少或错误的参数：--id 必须为正整数`);
  }

  const payload = {
    id,
    name: getRequiredStringArg(args, "name", commandName),
    is_enable: 0,
  };

  if (args.remark) {
    payload.remark = String(args.remark);
  }
  if (args.code) {
    payload.code = String(args.code);
  }
  if (args.standard) {
    payload.standard = String(args.standard);
  }
  if (args["unit-name"]) {
    payload.unit_name = String(args["unit-name"]);
  }

  return payload;
}

function buildPubCraftPayloadFromArgs(args, mode) {
  const commandName = mode === "edit" ? "pub-craft:edit" : "pub-craft:add";
  const payload = {
    name: getRequiredStringArg(args, "name", commandName),
  };

  if (mode === "edit") {
    payload.id = toInt(args.id, 0);
    if (!payload.id) {
      throw new Error(`${commandName} 缺少或错误的参数：--id 必须为正整数`);
    }
  }

  if (args.code) {
    payload.code = String(args.code);
  }
  if (args["need-quality"] !== undefined) {
    payload.need_quality = toBool(args["need-quality"]) ? 1 : 0;
  }
  if (args["need-scrap-rework"] !== undefined) {
    payload.need_scrap_rework = toBool(args["need-scrap-rework"]) ? 1 : 0;
  }
  if (args["price-mode"] !== undefined) {
    payload.price_mode = toInt(args["price-mode"], 0);
  }
  if (args["unit-money"] !== undefined) {
    payload.unit_money = getOptionalNumberArg(args, "unit-money", 0);
  }
  if (args["from-unit-num"] !== undefined) {
    payload.from_unit_num = getOptionalNumberArg(args, "from-unit-num", 0);
  }
  if (args["to-unit-num"] !== undefined) {
    payload.to_unit_num = getOptionalNumberArg(args, "to-unit-num", 0);
  }
  if (args["unit-name"]) {
    payload.unit_name = String(args["unit-name"]);
  }
  if (args["standard-working-minutes"] !== undefined) {
    payload.standard_working_minutes = getOptionalNumberArg(args, "standard-working-minutes", 0);
  }
  if (args["workshop-name"]) {
    payload.workshop_name = String(args["workshop-name"]);
  }
  if (args["produce-line-name"]) {
    payload.produce_line_name = String(args["produce-line-name"]);
  }
  if (args.remark) {
    payload.remark = String(args.remark);
  }

  const reportableUserIds = parseJsonArg(
    args["reportable-user-ids-json"],
    "reportable-user-ids-json",
    undefined
  );
  if (reportableUserIds !== undefined) {
    payload.reportable_user_ids = reportableUserIds;
  }

  const qualityAbleUserIds = parseJsonArg(
    args["quality-able-user-ids-json"],
    "quality-able-user-ids-json",
    undefined
  );
  if (qualityAbleUserIds !== undefined) {
    payload.quality_able_user_ids = qualityAbleUserIds;
  }

  const deviceIds = parseJsonArg(args["device-ids-json"], "device-ids-json", undefined);
  if (deviceIds !== undefined) {
    payload.device_ids = deviceIds;
  }

  const wasteItemCodes = parseJsonArg(
    args["waste-item-codes-json"],
    "waste-item-codes-json",
    undefined
  );
  if (wasteItemCodes !== undefined) {
    payload.waste_item_codes = wasteItemCodes;
  }

  return payload;
}

function getAuthOverrides(args) {
  return {
    baseUrl: args["base-url"],
    apiKey: args["api-key"],
    apiSecret: args["api-secret"],
    username: args.username,
  };
}

const { buildPaginationBody, buildKeywordListBody, createListHandler, createWriteHandler } = createHandlerFactories({
  createAuthContext,
  getAuthOverrides,
  openApiPost,
  printJson,
  toBool,
  toInt,
});
const {
  commandGoodsList,
  commandGoodsAdd,
  commandGoodsEdit,
  commandGoodsDisable,
} = buildGoodsCommands({
  buildGoodsDisablePayloadFromArgs,
  buildKeywordListBody,
  createAuthContext,
  createListHandler,
  getAuthOverrides,
  hasJsonInput,
  isBlankValue,
  loadJsonInput,
  openApiPost,
  printJson,
  toBool,
  toInt,
});
const {
  commandPubCraftList,
  commandElseStockOutList,
  commandElseStockInList,
  commandCustomerList,
  commandSupplierList,
  commandUserList,
  commandProduceBillList,
  commandProduceStockInList,
  commandTaskList,
  commandReportList,
  commandContractList,
} = buildListCommands({
  buildKeywordListBody,
  buildPaginationBody,
  createAuthContext,
  createListHandler,
  getAuthOverrides,
  openApiPost,
  printJson,
  toBool,
  toInt,
});
const {
  commandCustomerAdd,
  commandSupplierAdd,
  commandPubCraftAdd,
  commandPubCraftEdit,
  commandProduceBillAdd,
  commandReportAdd,
  commandReportEdit,
  commandContractEdit,
} = buildWriteCommands({
  buildCustomerAddPayloadFromArgs,
  buildProduceBillAddPayloadFromArgs,
  buildPubCraftPayloadFromArgs,
  buildReportEditPayloadFromArgs,
  buildSupplierAddPayloadFromArgs,
  createWriteHandler,
  hasJsonInput,
  loadJsonInput,
});
const {
  commandElseStockOutAdd,
  commandElseStockInAdd,
  commandProduceStockInAdd,
} = buildWarehouseCommands({
  createAuthContext,
  getAuthOverrides,
  getOptionalNumberArg,
  getOptionalNumberValue,
  getRequiredPositiveIntValue,
  getRequiredPositiveNumberArg,
  getRequiredPositiveNumberValue,
  getRequiredStringArg,
  getRequiredStringValue,
  getTodayDateString,
  hasJsonInput,
  isBlankValue,
  loadJsonInput,
  openApiPost,
  parseJsonArg,
  printJson,
  toBool,
  toInt,
});
const { commandProduceBillStatus, commandTaskStatus } = buildStatusCommands({
  createAuthContext,
  getAuthOverrides,
  openApiPost,
  printJson,
  toBool,
  toInt,
});
const { commandContractAdd } = buildContractCommands({
  createAuthContext,
  getAuthOverrides,
  getRequiredPositiveNumberArg,
  getRequiredStringArg,
  hasJsonInput,
  loadJsonInput,
  openApiPost,
  parseJsonArg,
  printJson,
  toBool,
  toInt,
  toMoneyString: (value, fallback = "0") => {
    if (value === undefined || value === null || String(value).trim() === "") {
      return fallback;
    }
    const parsed = toNumber(value, Number.NaN);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return String(parsed);
  },
  toNumber,
});

async function commandVerify(args) {
  const context = await createAuthContext(getAuthOverrides(args));
  printJson({
    success: true,
    base_url: context.baseUrl,
    username: context.username,
    user: {
      id: context.loginData.id,
      name: context.loginData.name,
      real_name: context.loginData.real_name,
    },
  });
}

async function commandAuthTest(args) {
  const context = await createAuthContext(getAuthOverrides(args));
  printJson({
    success: true,
    authenticated: true,
    base_url: context.baseUrl,
    username: context.username,
    user: {
      id: context.loginData.id,
      name: context.loginData.name,
      real_name: context.loginData.real_name,
    },
  });
}

async function commandToken(args) {
  const context = await createAuthContext(getAuthOverrides(args));
  const shouldShowSecrets = toBool(args["show-secrets"]);

  if (shouldShowSecrets) {
    printJson({
      warning: "敏感令牌输出已显式开启，请谨慎处理终端日志与历史记录。",
      access_token: context.accessToken,
      x_token: context.loginData.token,
      user: {
        id: context.loginData.id,
        name: context.loginData.name,
        real_name: context.loginData.real_name,
      },
    });
    return;
  }

  printJson({
    success: true,
    message: "敏感令牌默认不输出。如确需查看，请显式传入 --show-secrets。",
    secrets_hidden: true,
    base_url: context.baseUrl,
    username: context.username,
    user: {
      id: context.loginData.id,
      name: context.loginData.name,
      real_name: context.loginData.real_name,
    },
  });
}

async function commandOpenApiPost(args) {
  const apiPath = normalizeApiPath(args.path);
  const payload = loadJsonInput(args);

  if (toBool(args["dry-run"])) {
    printJson({
      dry_run: true,
      api: apiPath,
      payload,
    });
    return;
  }

  const context = await createAuthContext(getAuthOverrides(args));
  const json = await openApiPost(context, apiPath, payload);
  printJson(json);
}

async function commandUploadFile(args) {
  const filePath = getRequiredFileArg(args);

  if (toBool(args["dry-run"])) {
    printJson({
      dry_run: true,
      api: "/open_api/upload/file",
      file: filePath,
    });
    return;
  }

  const context = await createAuthContext(getAuthOverrides(args));
  const json = await openApiUploadFile(context, filePath);
  printJson(json);
}

function commandBuildFields(args) {
  if (!args.registry || !args.input || !args.object) {
    throw new Error("build-fields 缺少参数：--registry --input --object");
  }

  const registry = readJsonFile(path.resolve(process.cwd(), args.registry));
  const inputData = readJsonFile(path.resolve(process.cwd(), args.input));
  const fieldValueList = buildFieldValueList(registry, inputData, args.object);
  printJson(fieldValueList);
}

const COMMAND_DEFINITIONS = buildCommandDefinitions({
  commandVerify,
  commandAuthTest,
  commandToken,
  commandBuildFields,
  commandOpenApiPost,
  commandUploadFile,
  commandGoodsList,
  commandGoodsAdd,
  commandGoodsEdit,
  commandGoodsDisable,
  commandPubCraftList,
  commandPubCraftAdd,
  commandPubCraftEdit,
  commandElseStockOutList,
  commandElseStockOutAdd,
  commandElseStockInList,
  commandElseStockInAdd,
  commandCustomerList,
  commandCustomerAdd,
  commandSupplierList,
  commandSupplierAdd,
  commandUserList,
  commandProduceBillList,
  commandProduceBillAdd,
  commandProduceBillStatus,
  commandProduceStockInList,
  commandProduceStockInAdd,
  commandTaskList,
  commandTaskStatus,
  commandReportList,
  commandReportAdd,
  commandReportEdit,
  commandContractList,
  commandContractAdd,
  commandContractEdit,
});

const COMMAND_REGISTRY = Object.freeze(
  Object.fromEntries(COMMAND_DEFINITIONS.map((definition) => [definition.name, definition.handler])),
);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const handler = COMMAND_REGISTRY[command];

  if (!command || command === "help" || command === "--help") {
    printUsage();
    return;
  }

  if (!handler) {
    throw new Error(`未知命令: ${command}`);
  }

  await handler(args);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
