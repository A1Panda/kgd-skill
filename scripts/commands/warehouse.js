function buildWarehouseCommands(deps) {
  const {
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
  } = deps;

  function normalizeWarehouseBillItem(item, itemIndex, commandName, schema) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`${commandName} 缺少或错误的字段：item_list[${itemIndex}] 必须为对象`);
    }

    const nextItem = { ...item };
    const requiredStringFields = schema.requiredStringFields || [];
    const optionalStringFields = schema.optionalStringFields || [];
    const requiredIntegerFields = schema.requiredIntegerFields || [];
    const requiredNumberFields = schema.requiredNumberFields || [];
    const optionalNumberFields = schema.optionalNumberFields || [];

    for (const fieldName of requiredStringFields) {
      nextItem[fieldName] = getRequiredStringValue(nextItem[fieldName], `item_list[${itemIndex}].${fieldName}`, commandName);
    }
    for (const fieldName of optionalStringFields) {
      if (!isBlankValue(nextItem[fieldName])) {
        nextItem[fieldName] = String(nextItem[fieldName]).trim();
      }
    }
    for (const fieldName of requiredIntegerFields) {
      nextItem[fieldName] = getRequiredPositiveIntValue(nextItem[fieldName], `item_list[${itemIndex}].${fieldName}`, commandName);
    }
    for (const fieldName of requiredNumberFields) {
      nextItem[fieldName] = getRequiredPositiveNumberValue(nextItem[fieldName], `item_list[${itemIndex}].${fieldName}`, commandName);
    }
    for (const fieldName of optionalNumberFields) {
      if (!isBlankValue(nextItem[fieldName])) {
        nextItem[fieldName] = getOptionalNumberValue(nextItem[fieldName], `item_list[${itemIndex}].${fieldName}`, commandName);
      }
    }

    return nextItem;
  }

  function normalizeWarehouseBillPayload(payload, commandName, schema) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error(`${commandName} 缺少或错误的参数：payload 必须为对象`);
    }

    const nextPayload = { ...payload };
    const requiredStringFields = schema.requiredStringFields || [];
    const optionalStringFields = schema.optionalStringFields || [];
    const requiredIntegerFields = schema.requiredIntegerFields || [];
    const optionalIntegerFields = schema.optionalIntegerFields || [];

    nextPayload.bill_date = isBlankValue(nextPayload.bill_date)
      ? getTodayDateString()
      : String(nextPayload.bill_date).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextPayload.bill_date)) {
      throw new Error(`${commandName} 参数错误：bill_date 必须是 YYYY-MM-DD`);
    }

    for (const fieldName of requiredStringFields) {
      nextPayload[fieldName] = getRequiredStringValue(nextPayload[fieldName], fieldName, commandName);
    }
    for (const fieldName of optionalStringFields) {
      if (!isBlankValue(nextPayload[fieldName])) {
        nextPayload[fieldName] = String(nextPayload[fieldName]).trim();
      }
    }
    for (const fieldName of requiredIntegerFields) {
      nextPayload[fieldName] = getRequiredPositiveIntValue(nextPayload[fieldName], fieldName, commandName);
    }
    for (const fieldName of optionalIntegerFields) {
      if (!isBlankValue(nextPayload[fieldName])) {
        nextPayload[fieldName] = getRequiredPositiveIntValue(nextPayload[fieldName], fieldName, commandName);
      }
    }

    if (!Array.isArray(nextPayload.item_list) || nextPayload.item_list.length === 0) {
      throw new Error(`${commandName} 缺少或错误的字段：item_list 至少需要一条明细`);
    }

    nextPayload.item_list = nextPayload.item_list.map((item, index) =>
      normalizeWarehouseBillItem(item, index, commandName, schema.itemSchema),
    );

    return nextPayload;
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

  function buildElseStockInPayloadFromArgs(args) {
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
    if (args["item-remark"]) {
      payload.item_list[0].remark = String(args["item-remark"]);
    }
    if (args["field-values-json"]) {
      payload.fieldValueList = parseJsonArg(args["field-values-json"], "field-values-json", []);
    }

    return payload;
  }

  async function commandWarehouseBillAdd(args, schema) {
    const rawPayload = hasJsonInput(args) ? loadJsonInput(args) : schema.buildPayloadFromArgs(args);
    const payloadList = Array.isArray(rawPayload) ? rawPayload : [rawPayload];
    const normalizedPayloadList = payloadList.map((item) =>
      normalizeWarehouseBillPayload(item, schema.commandName, schema.payloadSchema),
    );

    if (toBool(args["dry-run"])) {
      printJson({
        dry_run: true,
        api: schema.apiPath,
        payload: Array.isArray(rawPayload) ? normalizedPayloadList : normalizedPayloadList[0],
      });
      return;
    }

    const context = await createAuthContext(getAuthOverrides(args));
    if (Array.isArray(rawPayload)) {
      const results = [];
      for (const item of normalizedPayloadList) {
        results.push(await openApiPost(context, schema.apiPath, item));
      }
      printJson({
        success: true,
        data: results,
      });
      return;
    }

    const json = await openApiPost(context, schema.apiPath, normalizedPayloadList[0]);
    printJson(json);
  }

  async function commandElseStockOutAdd(args) {
    await commandWarehouseBillAdd(args, {
      commandName: "else-stock-out:add",
      apiPath: "/open_api/else_stock_out_bill/add",
      buildPayloadFromArgs: buildElseStockOutPayloadFromArgs,
      payloadSchema: {
        requiredStringFields: ["ware_name", "stock_type_name"],
        optionalStringFields: ["remark"],
        requiredIntegerFields: ["shipper_id"],
        itemSchema: {
          requiredIntegerFields: ["goods_id"],
          requiredNumberFields: ["num"],
          optionalStringFields: ["remark"],
        },
      },
    });
  }

  async function commandElseStockInAdd(args) {
    await commandWarehouseBillAdd(args, {
      commandName: "else-stock-in:add",
      apiPath: "/open_api/else_stock_in_bill/add",
      buildPayloadFromArgs: buildElseStockInPayloadFromArgs,
      payloadSchema: {
        requiredStringFields: ["ware_name", "stock_type_name"],
        optionalStringFields: ["remark"],
        requiredIntegerFields: ["consignee_id"],
        optionalIntegerFields: ["supplier_id"],
        itemSchema: {
          requiredIntegerFields: ["goods_id"],
          requiredNumberFields: ["num"],
          optionalNumberFields: ["cost_price", "selling_price"],
          optionalStringFields: ["remark"],
        },
      },
    });
  }

  async function commandProduceStockInAdd(args) {
    await commandWarehouseBillAdd(args, {
      commandName: "produce-stock-in:add",
      apiPath: "/open_api/produce_stock_in_bill/add",
      buildPayloadFromArgs: buildProduceStockInPayloadFromArgs,
      payloadSchema: {
        requiredStringFields: ["ware_name"],
        optionalStringFields: ["stock_type_name", "remark"],
        itemSchema: {
          requiredIntegerFields: ["produce_bill_id"],
          requiredNumberFields: ["num"],
          optionalStringFields: ["remark"],
        },
      },
    });
  }

  return {
    commandElseStockOutAdd,
    commandElseStockInAdd,
    commandProduceStockInAdd,
  };
}

module.exports = {
  buildWarehouseCommands,
};
