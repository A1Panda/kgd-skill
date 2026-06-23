#!/usr/bin/env node

const path = require("path");
const {
  buildFieldValueList,
  createAuthContext,
  openApiPost,
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

function toBool(value) {
  if (typeof value === "boolean") {
    return value;
  }

  return ["1", "true", "yes", "y"].includes(String(value).toLowerCase());
}

function printUsage() {
  const lines = [
    "用法:",
    "  node ./scripts/kgd-cli.js verify",
    "  node ./scripts/kgd-cli.js token",
    "  node ./scripts/kgd-cli.js build-fields --registry ./config/kgd-field-registry.example.json --input ./your-order.json --object goods",
    "  node ./scripts/kgd-cli.js goods:list --keyword 石墨盘 --page 1 --page-size 20",
    "  node ./scripts/kgd-cli.js goods:add --input ./goods.json [--dry-run]",
    "  node ./scripts/kgd-cli.js goods:edit --input ./goods.json [--dry-run]",
    "  node ./scripts/kgd-cli.js user:list --keyword 于英 --page 1 --page-size 20",
    "  node ./scripts/kgd-cli.js produce-bill:list [--keyword 20260305001-4] [--code JGD0001] [--page 1] [--page-size 20]",
    "  node ./scripts/kgd-cli.js produce-bill:status --id 123456 --type 1 [--cancel-reason 原因] [--dry-run]",
    "  node ./scripts/kgd-cli.js task:list [--produce-bill-code 20260305001-4] [--craft-name 打磨] [--status 未开始] [--all]",
    "  node ./scripts/kgd-cli.js report:list [--produce-craft-id 23437544] [--page 1] [--page-size 20]",
    "  node ./scripts/kgd-cli.js report:add --input ./report.json [--dry-run]",
    "  node ./scripts/kgd-cli.js contract:list [--keyword 聚力] [--code HT20260623001] [--page 1] [--page-size 20]",
    "  node ./scripts/kgd-cli.js contract:add --input ./contract.json [--dry-run]",
    "  node ./scripts/kgd-cli.js contract:edit --input ./contract.json [--dry-run]",
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

function printJson(data) {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

async function commandVerify() {
  const context = await createAuthContext();
  printJson({
    success: true,
    user: {
      id: context.loginData.id,
      name: context.loginData.name,
      real_name: context.loginData.real_name,
    },
  });
}

async function commandToken() {
  const context = await createAuthContext();
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
  const context = await createAuthContext();
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

  const context = await createAuthContext();
  const apiPath = mode === "add" ? "/open_api/goods/add" : "/open_api/goods/edit";
  const json = await openApiPost(context, apiPath, payload);
  printJson(json);
}

async function commandUserList(args) {
  const context = await createAuthContext();
  const body = {
    keyword: args.keyword ? String(args.keyword) : "",
    pageNo: toInt(args.page, 1),
    pageSize: toInt(args["page-size"], 20),
  };
  const json = await openApiPost(context, "/open_api/user/list", body);
  printJson(json);
}

async function commandProduceBillList(args) {
  const context = await createAuthContext();
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

  const context = await createAuthContext();
  const json = await openApiPost(context, "/open_api/produce_bill/edit_status", payload);
  printJson(json);
}

async function commandTaskList(args) {
  const context = await createAuthContext();
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

  const context = await createAuthContext();
  const json = await openApiPost(context, "/open_api/report_work_record/add", payload);
  printJson(json);
}

async function commandReportList(args) {
  const context = await createAuthContext();
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
  const context = await createAuthContext();
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

  const context = await createAuthContext();
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

  const context = await createAuthContext();
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
      await commandVerify();
      return;
    case "token":
      await commandToken();
      return;
    case "build-fields":
      commandBuildFields(args);
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
