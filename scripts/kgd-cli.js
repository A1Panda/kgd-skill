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
    "  node ./scripts/kgd-cli.js auth:test",
    "  node ./scripts/kgd-cli.js token [--show-secrets]",
    "  node ./scripts/kgd-cli.js build-fields --registry ./config/kgd-field-registry.example.json --input ./your-order.json --object goods",
    "  node ./scripts/kgd-cli.js openapi:post --path /open_api/pub_craft/list --input ./payload.json [--dry-run]",
    "  node ./scripts/kgd-cli.js upload:file --file ./demo.png [--dry-run]",
    "  node ./scripts/kgd-cli.js goods:list --keyword 石墨盘 --page 1 --page-size 20",
    "  node ./scripts/kgd-cli.js goods:add --input ./goods.json [--dry-run]",
    "  node ./scripts/kgd-cli.js goods:edit --input ./goods.json [--dry-run]",
    "  node ./scripts/kgd-cli.js goods:disable --id 8254248 --name 石墨盘 [--remark 误建停用] [--dry-run]",
    "  node ./scripts/kgd-cli.js pub-craft:list --keyword 打磨 --page 1 --page-size 20",
    "  node ./scripts/kgd-cli.js pub-craft:add --name 打磨 [--code GM001] [--reportable-user-ids-json '[1001,1002]'] [--dry-run]",
    "  node ./scripts/kgd-cli.js pub-craft:edit --id 123456 --name 打磨 [--code GM001] [--reportable-user-ids-json '[1001,1002]'] [--dry-run]",
    "  node ./scripts/kgd-cli.js else-stock-out:list [--keyword 石墨盘] [--page 1] [--page-size 20]",
    "  node ./scripts/kgd-cli.js else-stock-out:add --goods-id 8253995 --num 10 --ware-name 成品仓 --stock-type-name 普通出库 --shipper-id 100753 [--bill-date 2026-06-23] [--remark 备注] [--dry-run]",
    "  node ./scripts/kgd-cli.js else-stock-in:list [--keyword 石墨盘] [--page 1] [--page-size 20]",
    "  node ./scripts/kgd-cli.js else-stock-in:add --goods-id 8253995 --num 10 --ware-name 成品仓 --stock-type-name 普通入库 --consignee-id 100753 [--bill-date 2026-06-23] [--cost-price 0] [--selling-price 0] [--dry-run]",
    "  node ./scripts/kgd-cli.js customer:list --keyword 聚力 --page 1 --page-size 20",
    "  node ./scripts/kgd-cli.js customer:add --name 聚力 --linkman-name 张三 [--mobile 13800000000] [--province-name 广东省] [--city-name 深圳市] [--area-name 南山区] [--address 科技园] [--dry-run]",
    "  node ./scripts/kgd-cli.js supplier:list --keyword 碳材 --page 1 --page-size 20",
    "  node ./scripts/kgd-cli.js supplier:add --name 某供应商 [--linkman-name 李四] [--linkman-mobile 13800000000] [--address 东莞] [--dry-run]",
    "  node ./scripts/kgd-cli.js user:list --keyword 于英 --page 1 --page-size 20",
    "  node ./scripts/kgd-cli.js produce-bill:list [--keyword 20260305001-4] [--code JGD0001] [--page 1] [--page-size 20]",
    "  node ./scripts/kgd-cli.js produce-bill:add --goods-id 8253995 --num 10 [--code JGD20260624001] [--delivery-date 2026-06-30] [--craft-list-json '[\"打磨\",\"打码\"]'] [--dry-run]",
    "  node ./scripts/kgd-cli.js produce-bill:status --id 123456 --type 1 [--cancel-reason 原因] [--dry-run]",
    "  node ./scripts/kgd-cli.js produce-stock-in:list [--keyword JGD0001] [--page 1] [--page-size 20]",
    "  node ./scripts/kgd-cli.js produce-stock-in:add --produce-bill-id 123456 --num 10 --ware-name 成品仓 [--bill-date 2026-06-23] [--stock-type-name 完工入库] [--remark 备注] [--dry-run]",
    "  node ./scripts/kgd-cli.js task:list [--produce-bill-code 20260305001-4] [--craft-name 打磨] [--status 未开始] [--all]",
    "  node ./scripts/kgd-cli.js task:status --id 23437544 --status 3 [--dry-run]",
    "  node ./scripts/kgd-cli.js report:list [--produce-craft-id 23437544] [--page 1] [--page-size 20]",
    "  node ./scripts/kgd-cli.js report:add --input ./report.json [--dry-run]",
    "  node ./scripts/kgd-cli.js report:edit --id 123456 --report-user-id 100753 --valid-num 10 --waste-num 0 [--is-finish 1] [--remark 补充修正] [--dry-run]",
    "  node ./scripts/kgd-cli.js contract:list [--keyword 聚力] [--code HT20260623001] [--page 1] [--page-size 20]",
    "  node ./scripts/kgd-cli.js contract:add --input ./contract.json [--dry-run]",
    "  node ./scripts/kgd-cli.js contract:add --customer-id 1544650 --sales-user-id 144246 --goods-id 8253995 --num 10 --unit-price 100 --delivery-date 2026-06-30 --has-tax 1 [--linkman-id 1747835] [--money 1000] [--advance 300] [--code HT20260624001] [--remark 备注] [--dry-run]",
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

function toMoneyString(value, fallback = "0") {
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }
  const parsed = toNumber(value, Number.NaN);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return String(parsed);
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

function normalizeHasTaxValue(value, commandName) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "y", "是"].includes(normalized)) {
    return 1;
  }
  if (["0", "false", "no", "n", "否"].includes(normalized)) {
    return 2;
  }
  throw new Error(`${commandName} 缺少或错误的参数：--has-tax 必须为 1/0/是/否`);
}

function inferEnterpriseIdFromLoginData(loginData) {
  if (Array.isArray(loginData?.team)) {
    for (const team of loginData.team) {
      const enterpriseId = toInt(team?.enterprise_id, 0);
      if (enterpriseId) {
        return enterpriseId;
      }
    }
  }

  const departmentEnterpriseId = toInt(loginData?.department?.enterprise_id, 0);
  if (departmentEnterpriseId) {
    return departmentEnterpriseId;
  }

  return 0;
}

function normalizeContractAddPayload(payload, context) {
  const nextPayload = payload && typeof payload === "object" ? { ...payload } : {};
  const inferredEnterpriseId = inferEnterpriseIdFromLoginData(context?.loginData);

  if (!toInt(nextPayload.enterprise_id, 0) && inferredEnterpriseId) {
    nextPayload.enterprise_id = inferredEnterpriseId;
  }

  if (!Array.isArray(nextPayload.fieldValueList)) {
    nextPayload.fieldValueList = [];
  }

  if (Array.isArray(nextPayload.item_list)) {
    nextPayload.item_list = nextPayload.item_list.map((item) => {
      const nextItem = item && typeof item === "object" ? { ...item } : {};
      const num = toNumber(nextItem.num, Number.NaN);
      const unitPrice = toNumber(nextItem.unit_price, Number.NaN);

      if (nextItem.money === undefined && Number.isFinite(num) && Number.isFinite(unitPrice)) {
        nextItem.money = toMoneyString(num * unitPrice);
      } else if (nextItem.money !== undefined) {
        nextItem.money = toMoneyString(nextItem.money);
      }

      if (nextItem.discount === undefined) {
        nextItem.discount = "10";
      } else {
        nextItem.discount = String(nextItem.discount);
      }

      if (nextItem.discount_money === undefined) {
        nextItem.discount_money = "0";
      } else {
        nextItem.discount_money = toMoneyString(nextItem.discount_money);
      }

      if (nextItem.after_discount_money === undefined) {
        const baseMoney = toNumber(nextItem.money, 0);
        const discountMoney = toNumber(nextItem.discount_money, 0);
        nextItem.after_discount_money = toMoneyString(baseMoney - discountMoney);
      } else {
        nextItem.after_discount_money = toMoneyString(nextItem.after_discount_money);
      }

      return nextItem;
    });
  }

  if (nextPayload.money !== undefined) {
    nextPayload.money = toMoneyString(nextPayload.money);
  }
  if (nextPayload.advance !== undefined) {
    nextPayload.advance = toMoneyString(nextPayload.advance);
  }

  return nextPayload;
}

function buildContractAddPayloadFromArgs(args) {
  const commandName = "contract:add";
  const deliveryDate = getRequiredStringArg(args, "delivery-date", commandName);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) {
    throw new Error(`${commandName} 参数错误：--delivery-date 必须是 YYYY-MM-DD`);
  }

  const customerId = toInt(args["customer-id"], 0);
  const salesUserId = toInt(args["sales-user-id"], 0);
  const goodsId = toInt(args["goods-id"], 0);
  if (!customerId) {
    throw new Error(`${commandName} 缺少或错误的参数：--customer-id 必须为正整数`);
  }
  if (!salesUserId) {
    throw new Error(`${commandName} 缺少或错误的参数：--sales-user-id 必须为正整数`);
  }
  if (!goodsId) {
    throw new Error(`${commandName} 缺少或错误的参数：--goods-id 必须为正整数`);
  }

  const num = getRequiredPositiveNumberArg(args, "num", commandName);
  const unitPrice = getRequiredPositiveNumberArg(args, "unit-price", commandName);
  const itemRemark = args["item-remark"] ? String(args["item-remark"]) : args.remark ? String(args.remark) : "";
  const itemMoney =
    args["item-money"] !== undefined
      ? toMoneyString(args["item-money"])
      : toMoneyString(num * unitPrice);
  const discountMoney = args["discount-money"] !== undefined ? toMoneyString(args["discount-money"]) : "0";
  const afterDiscountMoney =
    args["after-discount-money"] !== undefined
      ? toMoneyString(args["after-discount-money"])
      : toMoneyString(toNumber(itemMoney, 0) - toNumber(discountMoney, 0));

  const payload = {
    customer_id: customerId,
    sales_user_id: salesUserId,
    delivery_date: deliveryDate,
    has_tax: normalizeHasTaxValue(args["has-tax"], commandName),
    money: args.money !== undefined ? toMoneyString(args.money) : afterDiscountMoney,
    advance: args.advance !== undefined ? toMoneyString(args.advance) : "0",
    item_list: [
      {
        goods_id: goodsId,
        num,
        unit_price: toMoneyString(unitPrice),
        remark: itemRemark,
        money: itemMoney,
        discount: args.discount !== undefined ? String(args.discount) : "10",
        discount_money: discountMoney,
        after_discount_money: afterDiscountMoney,
      },
    ],
    fieldValueList: parseJsonArg(args["field-values-json"], "field-values-json", []),
  };

  if (args["linkman-id"]) {
    payload.linkman_id = toInt(args["linkman-id"], 0);
    if (!payload.linkman_id) {
      throw new Error(`${commandName} 缺少或错误的参数：--linkman-id 必须为正整数`);
    }
  }
  if (args.code) {
    payload.code = String(args.code);
  }
  if (args.remark) {
    payload.remark = String(args.remark);
  }
  if (args["enterprise-id"]) {
    payload.enterprise_id = toInt(args["enterprise-id"], 0);
    if (!payload.enterprise_id) {
      throw new Error(`${commandName} 缺少或错误的参数：--enterprise-id 必须为正整数`);
    }
  }

  const itemFieldValueList = parseJsonArg(args["item-field-values-json"], "item-field-values-json", undefined);
  if (itemFieldValueList !== undefined) {
    payload.item_list[0].fieldValueList = itemFieldValueList;
  }

  return payload;
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

function buildElseStockOutPayloadFromArgs(args) {
  const commandName = "else-stock-out:add";
  const payload = {
    bill_date: args["bill-date"] ? String(args["bill-date"]).trim() : getTodayDateString(),
    ware_name: getRequiredStringArg(args, "ware-name", commandName),
    stock_type_name: getRequiredStringArg(args, "stock-type-name", commandName),
    shipper_id: toInt(args["shipper-id"], 0),
    item_list: [
      {
        goods_id: toInt(args["goods-id"], 0),
        num: getRequiredPositiveNumberArg(args, "num", commandName),
      },
    ],
  };

  if (!payload.shipper_id) {
    throw new Error(`${commandName} 缺少或错误的参数：--shipper-id 必须为正整数`);
  }
  if (!payload.item_list[0].goods_id) {
    throw new Error(`${commandName} 缺少或错误的参数：--goods-id 必须为正整数`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.bill_date)) {
    throw new Error(`${commandName} 参数错误：--bill-date 必须是 YYYY-MM-DD`);
  }
  if (args.remark) {
    payload.remark = String(args.remark);
  }
  if (args["item-remark"]) {
    payload.item_list[0].remark = String(args["item-remark"]);
  }
  if (args["field-values-json"]) {
    payload.fieldValueList = parseJsonArg(args["field-values-json"], "field-values-json", []);
  }

  return payload;
}

function buildProduceStockInPayloadFromArgs(args) {
  const commandName = "produce-stock-in:add";
  const payload = {
    bill_date: args["bill-date"] ? String(args["bill-date"]).trim() : getTodayDateString(),
    ware_name: getRequiredStringArg(args, "ware-name", commandName),
    item_list: [
      {
        produce_bill_id: toInt(args["produce-bill-id"], 0),
        num: getRequiredPositiveNumberArg(args, "num", commandName),
      },
    ],
  };

  if (!payload.item_list[0].produce_bill_id) {
    throw new Error(`${commandName} 缺少或错误的参数：--produce-bill-id 必须为正整数`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.bill_date)) {
    throw new Error(`${commandName} 参数错误：--bill-date 必须是 YYYY-MM-DD`);
  }
  if (args["stock-type-name"]) {
    payload.stock_type_name = String(args["stock-type-name"]);
  }
  if (args.remark) {
    payload.remark = String(args.remark);
  }
  if (args["item-remark"]) {
    payload.item_list[0].remark = String(args["item-remark"]);
  }
  if (args["field-values-json"]) {
    payload.fieldValueList = parseJsonArg(args["field-values-json"], "field-values-json", []);
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

async function commandGoodsDisable(args) {
  const payload = hasJsonInput(args) ? loadJsonInput(args) : buildGoodsDisablePayloadFromArgs(args);
  payload.is_enable = 0;

  if (toBool(args["dry-run"])) {
    printJson({
      dry_run: true,
      api: "/open_api/goods/edit",
      payload,
    });
    return;
  }

  const context = await createAuthContext(getAuthOverrides(args));
  const json = await openApiPost(context, "/open_api/goods/edit", payload);
  printJson(json);
}

async function commandPubCraftList(args) {
  const context = await createAuthContext(getAuthOverrides(args));
  const body = {
    keyword: args.keyword ? String(args.keyword) : "",
    pageNo: toInt(args.page, 1),
    pageSize: toInt(args["page-size"], 20),
  };
  const json = await openApiPost(context, "/open_api/pub_craft/list", body);
  printJson(json);
}

async function commandPubCraftWrite(args, mode) {
  const payload = hasJsonInput(args) ? loadJsonInput(args) : buildPubCraftPayloadFromArgs(args, mode);
  const api = mode === "edit" ? "/open_api/pub_craft/edit" : "/open_api/pub_craft/add";
  if (toBool(args["dry-run"])) {
    printJson({
      dry_run: true,
      api,
      payload,
    });
    return;
  }

  const context = await createAuthContext(getAuthOverrides(args));
  const json = await openApiPost(context, api, payload);
  printJson(json);
}

async function commandElseStockOutList(args) {
  const context = await createAuthContext(getAuthOverrides(args));
  const body = {
    keyword: args.keyword ? String(args.keyword) : "",
    pageNo: toInt(args.page, 1),
    pageSize: toInt(args["page-size"], 20),
  };
  const json = await openApiPost(context, "/open_api/else_stock_out_bill/list", body);
  printJson(json);
}

async function commandElseStockOutAdd(args) {
  const payload = hasJsonInput(args) ? loadJsonInput(args) : buildElseStockOutPayloadFromArgs(args);
  if (toBool(args["dry-run"])) {
    printJson({
      dry_run: true,
      api: "/open_api/else_stock_out_bill/add",
      payload,
    });
    return;
  }

  const context = await createAuthContext(getAuthOverrides(args));
  const json = await openApiPost(context, "/open_api/else_stock_out_bill/add", payload);
  printJson(json);
}

async function commandElseStockInList(args) {
  const context = await createAuthContext(getAuthOverrides(args));
  const body = {
    keyword: args.keyword ? String(args.keyword) : "",
    pageNo: toInt(args.page, 1),
    pageSize: toInt(args["page-size"], 20),
  };
  const json = await openApiPost(context, "/open_api/else_stock_in_bill/list", body);
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

async function commandCustomerList(args) {
  const context = await createAuthContext(getAuthOverrides(args));
  const body = {
    keyword: args.keyword ? String(args.keyword) : "",
    pageNo: toInt(args.page, 1),
    pageSize: toInt(args["page-size"], 20),
  };
  const json = await openApiPost(context, "/open_api/customer/list", body);
  printJson(json);
}

async function commandCustomerAdd(args) {
  const payload = hasJsonInput(args) ? loadJsonInput(args) : buildCustomerAddPayloadFromArgs(args);
  if (toBool(args["dry-run"])) {
    printJson({
      dry_run: true,
      api: "/open_api/customer/add",
      payload,
    });
    return;
  }

  const context = await createAuthContext(getAuthOverrides(args));
  const json = await openApiPost(context, "/open_api/customer/add", payload);
  printJson(json);
}

async function commandSupplierList(args) {
  const context = await createAuthContext(getAuthOverrides(args));
  const body = {
    keyword: args.keyword ? String(args.keyword) : "",
    pageNo: toInt(args.page, 1),
    pageSize: toInt(args["page-size"], 20),
  };
  const json = await openApiPost(context, "/open_api/supplier/list", body);
  printJson(json);
}

async function commandSupplierAdd(args) {
  const payload = hasJsonInput(args) ? loadJsonInput(args) : buildSupplierAddPayloadFromArgs(args);
  if (toBool(args["dry-run"])) {
    printJson({
      dry_run: true,
      api: "/open_api/supplier/add",
      payload,
    });
    return;
  }

  const context = await createAuthContext(getAuthOverrides(args));
  const json = await openApiPost(context, "/open_api/supplier/add", payload);
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

async function commandProduceBillAdd(args) {
  const payload = hasJsonInput(args) ? loadJsonInput(args) : buildProduceBillAddPayloadFromArgs(args);
  if (toBool(args["dry-run"])) {
    printJson({
      dry_run: true,
      api: "/open_api/produce_bill/add",
      payload,
    });
    return;
  }

  const context = await createAuthContext(getAuthOverrides(args));
  const json = await openApiPost(context, "/open_api/produce_bill/add", payload);
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

async function commandProduceStockInList(args) {
  const context = await createAuthContext(getAuthOverrides(args));
  const body = {
    keyword: args.keyword ? String(args.keyword) : "",
    pageNo: toInt(args.page, 1),
    pageSize: toInt(args["page-size"], 20),
  };
  const json = await openApiPost(context, "/open_api/produce_stock_in_bill/list", body);
  printJson(json);
}

async function commandProduceStockInAdd(args) {
  const payload = hasJsonInput(args) ? loadJsonInput(args) : buildProduceStockInPayloadFromArgs(args);
  if (toBool(args["dry-run"])) {
    printJson({
      dry_run: true,
      api: "/open_api/produce_stock_in_bill/add",
      payload,
    });
    return;
  }

  const context = await createAuthContext(getAuthOverrides(args));
  const json = await openApiPost(context, "/open_api/produce_stock_in_bill/add", payload);
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

async function commandTaskStatus(args) {
  const status = toInt(args.status, 0);
  const id = toInt(args.id, 0);
  if (!id) {
    throw new Error("task:status 缺少参数：--id");
  }
  if (![1, 2, 3, 4].includes(status)) {
    throw new Error("task:status 缺少或错误的参数：--status 必须为 1/2/3/4");
  }

  const payload = {
    id,
    status,
  };

  if (toBool(args["dry-run"])) {
    printJson({
      dry_run: true,
      api: "/open_api/produce_bill_craft/edit_status",
      payload,
    });
    return;
  }

  const context = await createAuthContext(getAuthOverrides(args));
  const json = await openApiPost(context, "/open_api/produce_bill_craft/edit_status", payload);
  printJson(json);
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

async function commandReportEdit(args) {
  const payload = hasJsonInput(args) ? loadJsonInput(args) : buildReportEditPayloadFromArgs(args);
  if (toBool(args["dry-run"])) {
    printJson({
      dry_run: true,
      api: "/open_api/report_work_record/edit",
      payload,
    });
    return;
  }

  const context = await createAuthContext(getAuthOverrides(args));
  const json = await openApiPost(context, "/open_api/report_work_record/edit", payload);
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
  if (hasJsonInput(args)) {
    const rawPayload = loadJsonInput(args);
    if (toBool(args["dry-run"])) {
      printJson({
        dry_run: true,
        api: "/open_api/customer_contract/add",
        payload: rawPayload,
      });
      return;
    }

    const context = await createAuthContext(getAuthOverrides(args));
    const payload = normalizeContractAddPayload(rawPayload, context);
    const json = await openApiPost(context, "/open_api/customer_contract/add", payload);
    printJson(json);
    return;
  }

  const context = await createAuthContext(getAuthOverrides(args));
  const payload = normalizeContractAddPayload(buildContractAddPayloadFromArgs(args), context);
  if (toBool(args["dry-run"])) {
    printJson({
      dry_run: true,
      api: "/open_api/customer_contract/add",
      payload,
    });
    return;
  }

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
    case "auth:test":
      await commandAuthTest(args);
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
    case "goods:disable":
      await commandGoodsDisable(args);
      return;
    case "pub-craft:list":
      await commandPubCraftList(args);
      return;
    case "pub-craft:add":
      await commandPubCraftWrite(args, "add");
      return;
    case "pub-craft:edit":
      await commandPubCraftWrite(args, "edit");
      return;
    case "else-stock-out:list":
      await commandElseStockOutList(args);
      return;
    case "else-stock-out:add":
      await commandElseStockOutAdd(args);
      return;
    case "else-stock-in:list":
      await commandElseStockInList(args);
      return;
    case "else-stock-in:add":
      await commandElseStockInAdd(args);
      return;
    case "customer:list":
      await commandCustomerList(args);
      return;
    case "customer:add":
      await commandCustomerAdd(args);
      return;
    case "supplier:list":
      await commandSupplierList(args);
      return;
    case "supplier:add":
      await commandSupplierAdd(args);
      return;
    case "user:list":
      await commandUserList(args);
      return;
    case "produce-bill:list":
      await commandProduceBillList(args);
      return;
    case "produce-bill:add":
      await commandProduceBillAdd(args);
      return;
    case "produce-bill:status":
      await commandProduceBillStatus(args);
      return;
    case "produce-stock-in:list":
      await commandProduceStockInList(args);
      return;
    case "produce-stock-in:add":
      await commandProduceStockInAdd(args);
      return;
    case "task:list":
      await commandTaskList(args);
      return;
    case "task:status":
      await commandTaskStatus(args);
      return;
    case "report:list":
      await commandReportList(args);
      return;
    case "report:add":
      await commandReportAdd(args);
      return;
    case "report:edit":
      await commandReportEdit(args);
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
