#!/usr/bin/env node

const path = require("path");
const {
  buildFieldValueList,
  createAuthContext,
  openApiPost,
  openApiUploadFile,
  readJsonFile,
} = require("./kgd-common");

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
    "  node ./scripts/kgd-cli.js verify",
    "  node ./scripts/kgd-cli.js token",
    "  node ./scripts/kgd-cli.js build-fields --registry ./config/kgd-field-registry.example.json --input ./your-order.json --object goods",
    "  node ./scripts/kgd-cli.js openapi:post --path /open_api/pub_craft/list --input ./payload.json [--dry-run]",
    "  node ./scripts/kgd-cli.js upload:file --file ./demo.png [--dry-run]",
    "  node ./scripts/kgd-cli.js goods:list --keyword 石墨盘 --page 1 --page-size 20",
    "  node ./scripts/kgd-cli.js goods:add --input ./goods.json [--dry-run]",
    "  node ./scripts/kgd-cli.js goods:edit --input ./goods.json [--dry-run]",
    "  node ./scripts/kgd-cli.js else-stock-in:add --goods-id 8253995 --num 10 --ware-name 成品仓 --stock-type-name 普通入库 --consignee-id 100753 [--bill-date 2026-06-23] [--cost-price 0] [--selling-price 0] [--dry-run]",
    "  node ./scripts/kgd-cli.js user:list --keyword 于英 --page 1 --page-size 20",
    "  node ./scripts/kgd-cli.js produce-bill:list [--keyword 20260305001-4] [--code JGD0001] [--page 1] [--page-size 20]",
    "  node ./scripts/kgd-cli.js produce-bill:status --id 123456 --type 1 [--cancel-reason 原因] [--dry-run]",
    "  node ./scripts/kgd-cli.js task:list [--produce-bill-code 20260305001-4] [--craft-name 打磨] [--status 未开始] [--all]",
    "  node ./scripts/kgd-cli.js report:list [--produce-craft-id 23437544] [--page 1] [--page-size 20]",
    "  node ./scripts/kgd-cli.js report:add --input ./report.json [--dry-run]",
    "  node ./scripts/kgd-cli.js contract:list [--keyword 聚力] [--code HT20260623001] [--page 1] [--page-size 20]",
    "  node ./scripts/kgd-cli.js contract:add --input ./contract.json [--dry-run]",
    "  node ./scripts/kgd-cli.js contract:edit --input ./contract.json [--dry-run]",
    "",
    "全局鉴权参数:",
    "  --base-url    临时覆盖 KGD_BASE_URL",
    "  --api-key     临时覆盖 KGD_API_KEY，通常仅首次部署或切企业时使用",
    "  --api-secret  临时覆盖 KGD_API_SECRET，通常仅首次部署或切企业时使用",
    "  --username    临时覆盖 KGD_USERNAME，适合不同对话用户按会话确认",
    "说明:",
    "  建议把 KGD_API_KEY/KGD_API_SECRET 作为固定企业配置写入运行环境。",
    "  不同用户主要确认 KGD_USERNAME；命令行参数优先于 .env，不写入仓库。",
  ];

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

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getAuthOverrides(args) {
  return {
    baseUrl: args["base-url"],
    apiKey: args["api-key"],
    apiSecret: args["api-secret"],
    username: args.username,
  };
}

async function commandVerify(args) {
  const context = await createAuthContext(getAuthOverrides(args));
  printJson({
    success: true,
    user: {
      id: context.loginData.id,
      name: context.loginData.name,
      real_name: context.loginData.real_name,
    },
  });
}

async function commandToken(args) {
  const context = await createAuthContext(getAuthOverrides(args));
  printJson({
    access_token: context.accessToken,
    x_token: context.loginData.token,
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

async function commandGoodsList(args) {
  const context = await createAuthContext(getAuthOverrides(args));
  const body = {
    goods_keyword: args.keyword ? String(args.keyword) : "",
    pageNo: toInt(args.page, 1),
    pageSize: toInt(args["page-size"], 20),
  };
  const json = await openApiPost(context, "/open_api/goods/list", body);
  printJson(json);
}

async function commandGoodsWrite(args, mode) {
  const payload = loadJsonInput(args);
  if (toBool(args["dry-run"])) {
    printJson({
      dry_run: true,
      api: mode === "add" ? "/open_api/goods/add" : "/open_api/goods/edit",
      payload,
    });
    return;
  }

  const context = await createAuthContext(getAuthOverrides(args));
  const apiPath = mode === "add" ? "/open_api/goods/add" : "/open_api/goods/edit";
  const json = await openApiPost(context, apiPath, payload);
  printJson(json);
}

async function commandElseStockInAdd(args) {
  const commandName = "else-stock-in:add";
  const payload = {
    bill_date: args["bill-date"] ? String(args["bill-date"]).trim() : getTodayDateString(),
    ware_name: getRequiredStringArg(args, "ware-name", commandName),
    stock_type_name: getRequiredStringArg(args, "stock-type-name", commandName),
    consignee_id: toInt(args["consignee-id"], 0),
    item_list: [
      {
        goods_id: toInt(args["goods-id"], 0),
        num: getRequiredPositiveNumberArg(args, "num", commandName),
        cost_price: getOptionalNumberArg(args, "cost-price", 0),
        selling_price: getOptionalNumberArg(args, "selling-price", 0),
      },
    ],
  };

  if (!payload.consignee_id) {
    throw new Error(`${commandName} 缺少或错误的参数：--consignee-id 必须为正整数`);
  }
  if (!payload.item_list[0].goods_id) {
    throw new Error(`${commandName} 缺少或错误的参数：--goods-id 必须为正整数`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.bill_date)) {
    throw new Error(`${commandName} 参数错误：--bill-date 必须是 YYYY-MM-DD`);
  }
  if (args["supplier-id"]) {
    payload.supplier_id = toInt(args["supplier-id"], 0);
    if (!payload.supplier_id) {
      throw new Error(`${commandName} 缺少或错误的参数：--supplier-id 必须为正整数`);
    }
  }
  if (args.remark) {
    payload.remark = String(args.remark);
  }

  if (toBool(args["dry-run"])) {
    printJson({
      dry_run: true,
      api: "/open_api/else_stock_in_bill/add",
      payload,
    });
    return;
  }

  const context = await createAuthContext(getAuthOverrides(args));
  const json = await openApiPost(context, "/open_api/else_stock_in_bill/add", payload);
  printJson(json);
}

async function commandUserList(args) {
  const context = await createAuthContext(getAuthOverrides(args));
  const body = {
    keyword: args.keyword ? String(args.keyword) : "",
    pageNo: toInt(args.page, 1),
    pageSize: toInt(args["page-size"], 20),
  };
  const json = await openApiPost(context, "/open_api/user/list", body);
  printJson(json);
}

async function commandProduceBillList(args) {
  const context = await createAuthContext(getAuthOverrides(args));
  const body = {
    pageNo: toInt(args.page, 1),
    pageSize: toInt(args["page-size"], 20),
  };

  if (args.keyword) {
    body.keyword = String(args.keyword);
  }
  if (args.code) {
    body.code = String(args.code);
  }
  if (args.status) {
    body.status = args.status;
  }

  const json = await openApiPost(context, "/open_api/produce_bill/list", body);
  printJson(json);
}

async function commandProduceBillStatus(args) {
  const id = toInt(args.id, 0);
  const type = toInt(args.type, 0);

  if (!id) {
    throw new Error("produce-bill:status 缺少参数：--id");
  }
  if (![1, 2, 3, 4].includes(type)) {
    throw new Error("produce-bill:status 缺少或错误的参数：--type 必须为 1/2/3/4");
  }

  const payload = {
    id,
    type,
  };

  if (type === 4) {
    if (!args["cancel-reason"]) {
      throw new Error("取消加工单时必须提供 --cancel-reason");
    }
    payload.cancel_reason = String(args["cancel-reason"]);
  }

  if (toBool(args["dry-run"])) {
    printJson({
      dry_run: true,
      api: "/open_api/produce_bill/edit_status",
      payload,
    });
    return;
  }

  const context = await createAuthContext(getAuthOverrides(args));
  const json = await openApiPost(context, "/open_api/produce_bill/edit_status", payload);
  printJson(json);
}

async function commandTaskList(args) {
  const context = await createAuthContext(getAuthOverrides(args));
  const targetProduceBillCode = args["produce-bill-code"] ? String(args["produce-bill-code"]) : "";
  const targetCraftName = args["craft-name"] ? String(args["craft-name"]) : "";
  const targetStatus = args.status ? String(args.status) : "";
  const fetchAll = toBool(args.all);
  const pageSize = toInt(args["page-size"], 200);

  const allRows = [];
  let pageNo = toInt(args.page, 1);

  while (true) {
    const json = await openApiPost(context, "/open_api/produce_bill_craft/list", {
      pageNo,
      pageSize,
    });
    const rows = Array.isArray(json.data) ? json.data : [];
    if (!rows.length) {
      break;
    }

    allRows.push(...rows);

    if (!fetchAll || rows.length < pageSize) {
      break;
    }

    pageNo += 1;
  }

  const filtered = allRows.filter((item) => {
    const matchedProduceBillCode =
      !targetProduceBillCode || item?.produce_bill?.code === targetProduceBillCode;
    const matchedCraftName = !targetCraftName || item?.pub_craft?.name === targetCraftName;
    const matchedStatus = !targetStatus || item?.status_name === targetStatus;
    return matchedProduceBillCode && matchedCraftName && matchedStatus;
  });

  printJson({
    count: filtered.length,
    data: filtered,
  });
}

async function commandReportAdd(args) {
  const payload = loadJsonInput(args);
  if (toBool(args["dry-run"])) {
    printJson({
      dry_run: true,
      api: "/open_api/report_work_record/add",
      payload,
    });
    return;
  }

  const context = await createAuthContext(getAuthOverrides(args));
  const json = await openApiPost(context, "/open_api/report_work_record/add", payload);
  printJson(json);
}

async function commandReportList(args) {
  const context = await createAuthContext(getAuthOverrides(args));
  const body = {
    pageNo: toInt(args.page, 1),
    pageSize: toInt(args["page-size"], 20),
  };

  if (args["produce-craft-id"]) {
    body.produce_craft_id = toInt(args["produce-craft-id"], 0);
  }
  if (args["produce-bill-code"]) {
    body.produce_bill_code = String(args["produce-bill-code"]);
  }
  if (args.keyword) {
    body.keyword = String(args.keyword);
  }

  const json = await openApiPost(context, "/open_api/report_work_record/list", body);
  printJson(json);
}

async function commandContractList(args) {
  const context = await createAuthContext(getAuthOverrides(args));
  const body = {
    keyword: args.keyword ? String(args.keyword) : "",
    code: args.code ? String(args.code) : "",
    pageNo: toInt(args.page, 1),
    pageSize: toInt(args["page-size"], 20),
  };
  const json = await openApiPost(context, "/open_api/customer_contract/list", body);
  printJson(json);
}

async function commandContractAdd(args) {
  const payload = loadJsonInput(args);
  if (toBool(args["dry-run"])) {
    printJson({
      dry_run: true,
      api: "/open_api/customer_contract/add",
      payload,
    });
    return;
  }

  const context = await createAuthContext(getAuthOverrides(args));
  const json = await openApiPost(context, "/open_api/customer_contract/add", payload);
  printJson(json);
}

async function commandContractEdit(args) {
  const payload = loadJsonInput(args);
  if (toBool(args["dry-run"])) {
    printJson({
      dry_run: true,
      api: "/open_api/customer_contract/edit",
      payload,
    });
    return;
  }

  const context = await createAuthContext(getAuthOverrides(args));
  const json = await openApiPost(context, "/open_api/customer_contract/edit", payload);
  printJson(json);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];

  if (!command || command === "help" || command === "--help") {
    printUsage();
    return;
  }

  switch (command) {
    case "verify":
      await commandVerify(args);
      return;
    case "token":
      await commandToken(args);
      return;
    case "build-fields":
      commandBuildFields(args);
      return;
    case "openapi:post":
      await commandOpenApiPost(args);
      return;
    case "upload:file":
      await commandUploadFile(args);
      return;
    case "goods:list":
      await commandGoodsList(args);
      return;
    case "goods:add":
      await commandGoodsWrite(args, "add");
      return;
    case "goods:edit":
      await commandGoodsWrite(args, "edit");
      return;
    case "else-stock-in:add":
      await commandElseStockInAdd(args);
      return;
    case "user:list":
      await commandUserList(args);
      return;
    case "produce-bill:list":
      await commandProduceBillList(args);
      return;
    case "produce-bill:status":
      await commandProduceBillStatus(args);
      return;
    case "task:list":
      await commandTaskList(args);
      return;
    case "report:list":
      await commandReportList(args);
      return;
    case "report:add":
      await commandReportAdd(args);
      return;
    case "contract:list":
      await commandContractList(args);
      return;
    case "contract:add":
      await commandContractAdd(args);
      return;
    case "contract:edit":
      await commandContractEdit(args);
      return;
    default:
      throw new Error(`未知命令: ${command}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
