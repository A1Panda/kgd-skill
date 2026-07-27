function buildListCommands(deps) {
  const {
    buildPaginationBody,
    buildScopedListBody,
    createAuthContext,
    createListHandler,
    getAuthOverrides,
    openApiPost,
    printJson,
    toBool,
    toInt,
  } = deps;

  const commandPubCraftList = createListHandler("/open_api/pub_craft/list", (args) =>
    buildScopedListBody(args, {
      commandName: "pub-craft:list",
      scopeFields: [
        { arg: "keyword", field: "keyword" },
        { arg: "name", field: "name" },
        { arg: "code", field: "code" },
        { arg: "reportable-user-name", field: "reportable_user_name" },
        { arg: "quality-able-user-name", field: "quality_able_user_name" },
        { arg: "updated-at-start", field: "updated_at_start" },
        { arg: "updated-at-end", field: "updated_at_end" },
      ],
    }),
  );

  const commandElseStockOutList = createListHandler("/open_api/else_stock_out_bill/list", (args) =>
    buildScopedListBody(args, {
      commandName: "else-stock-out:list",
      scopeFields: [
        { args: ["keyword", "goods-keyword"], field: "goods_keyword" },
        { arg: "code", field: "code" },
        { arg: "shipper-name", field: "shipper_name" },
        { arg: "create-user-name", field: "create_user_name" },
        { arg: "bill-date-start", field: "bill_date_start" },
        { arg: "bill-date-end", field: "bill_date_end" },
        { arg: "created-at-start", field: "created_at_start" },
        { arg: "created-at-end", field: "created_at_end" },
        { arg: "stock-type-name", field: "stock_type_name" },
        { arg: "ware-name", field: "ware_name" },
        { arg: "updated-at-start", field: "updated_at_start" },
        { arg: "updated-at-end", field: "updated_at_end" },
      ],
    }),
  );

  const commandElseStockInList = createListHandler("/open_api/else_stock_in_bill/list", (args) =>
    buildScopedListBody(args, {
      commandName: "else-stock-in:list",
      scopeFields: [
        { args: ["keyword", "goods-keyword"], field: "goods_keyword" },
        { arg: "code", field: "code" },
        { arg: "consignee-name", field: "consignee_name" },
        { arg: "create-user-name", field: "create_user_name" },
        { arg: "bill-date-start", field: "bill_date_start" },
        { arg: "bill-date-end", field: "bill_date_end" },
        { arg: "created-at-start", field: "created_at_start" },
        { arg: "created-at-end", field: "created_at_end" },
        { arg: "ware-name", field: "ware_name" },
        { arg: "stock-type-name", field: "stock_type_name" },
        { arg: "supplier-name", field: "supplier_name" },
        { arg: "updated-at-start", field: "updated_at_start" },
        { arg: "updated-at-end", field: "updated_at_end" },
      ],
    }),
  );

  const commandCustomerList = createListHandler("/open_api/customer/list", (args) =>
    buildScopedListBody(args, {
      commandName: "customer:list",
      scopeFields: [
        { arg: "keyword", field: "keyword" },
        { arg: "is-enable", field: "is_enable", type: "int" },
        { arg: "updated-at-start", field: "updated_at_start" },
        { arg: "updated-at-end", field: "updated_at_end" },
      ],
    }),
  );

  const commandSupplierList = createListHandler("/open_api/supplier/list", (args) =>
    buildScopedListBody(args, {
      commandName: "supplier:list",
      scopeFields: [
        { arg: "keyword", field: "keyword" },
        { arg: "is-enable", field: "is_enable", type: "int" },
        { arg: "updated-at-start", field: "updated_at_start" },
        { arg: "updated-at-end", field: "updated_at_end" },
      ],
    }),
  );

  const commandUserList = createListHandler("/open_api/user/list", (args) =>
    buildScopedListBody(args, {
      commandName: "user:list",
      scopeFields: [
        { arg: "keyword", field: "keyword" },
        { arg: "mobile", field: "mobile" },
        { arg: "team-name", field: "team_name" },
        { arg: "department-name", field: "department_name" },
        { arg: "role-name", field: "role_name" },
        { arg: "is-enable", field: "is_enable", type: "int" },
      ],
    }),
  );

  const commandProduceBillList = createListHandler("/open_api/produce_bill/list", (args) =>
    buildScopedListBody(args, {
      commandName: "produce-bill:list",
      scopeFields: [
        { arg: "code", field: "code" },
        { arg: "keyword", field: "keyword" },
        { arg: "goods-keyword", field: "goods_keyword" },
        { arg: "create-user-name", field: "create_user_name" },
        { arg: "start-produce-date-start", field: "start_produce_date_start" },
        { arg: "start-produce-date-end", field: "start_produce_date_end" },
        { arg: "end-produce-date-start", field: "end_produce_date_start" },
        { arg: "end-produce-date-end", field: "end_produce_date_end" },
        { arg: "type-id", field: "type_id", type: "int" },
        { arg: "status", field: "status", type: "int" },
        { arg: "end-time-start", field: "end_time_start" },
        { arg: "end-time-end", field: "end_time_end" },
        { arg: "updated-at-start", field: "updated_at_start" },
        { arg: "updated-at-end", field: "updated_at_end" },
      ],
    }),
  );

  const commandProduceStockInList = createListHandler("/open_api/produce_stock_in_bill/list", (args) =>
    buildScopedListBody(args, {
      commandName: "produce-stock-in:list",
      scopeFields: [
        { args: ["keyword", "goods-keyword"], field: "goods_keyword" },
        { arg: "bill-date-start", field: "bill_date_start" },
        { arg: "bill-date-end", field: "bill_date_end" },
        { arg: "created-at-start", field: "created_at_start" },
        { arg: "created-at-end", field: "created_at_end" },
        { arg: "code", field: "code" },
        { arg: "create-user-name", field: "create_user_name" },
        { arg: "ware-name", field: "ware_name" },
        { arg: "stock-type-name", field: "stock_type_name" },
        { arg: "updated-at-start", field: "updated_at_start" },
        { arg: "updated-at-end", field: "updated_at_end" },
      ],
    }),
  );

  function parseIntegerArrayArg(value, argName) {
    if (value === undefined || value === null || String(value).trim() === "") {
      return [];
    }

    const raw = String(value).trim();
    let parts;
    try {
      parts = raw.startsWith("[")
        ? JSON.parse(raw)
        : raw.split(",").map((item) => item.trim()).filter(Boolean);
    } catch (error) {
      throw new Error(`task:list 参数错误：--${argName} 必须是整数数组或逗号分隔整数`);
    }

    if (!Array.isArray(parts)) {
      throw new Error(`task:list 参数错误：--${argName} 必须是整数数组或逗号分隔整数`);
    }

    const result = parts.map((item) => toInt(item, 0)).filter(Boolean);
    if (!result.length || result.length !== parts.length) {
      throw new Error(`task:list 参数错误：--${argName} 必须只包含正整数，例如 1,2 或 [1,2]`);
    }

    return result;
  }

  async function commandTaskList(args) {
    const targetProduceBillStatuses = parseIntegerArrayArg(
      args["produce-bill-status"] ?? args["produce-bill-status-json"],
      args["produce-bill-status"] !== undefined ? "produce-bill-status" : "produce-bill-status-json",
    );
    const targetProduceBillCode = args["produce-bill-code"] ? String(args["produce-bill-code"]).trim() : "";
    const targetCraftName = args["craft-name"] ? String(args["craft-name"]).trim() : "";
    const targetCraftCode = args["craft-code"] ? String(args["craft-code"]).trim() : "";
    const targetReportableUserName = args["reportable-user-name"]
      ? String(args["reportable-user-name"]).trim()
      : "";
    const targetQualityAbleUserName = args["quality-able-user-name"]
      ? String(args["quality-able-user-name"]).trim()
      : "";
    const targetProduceBillEndTimeStart = args["produce-bill-end-time-start"]
      ? String(args["produce-bill-end-time-start"]).trim()
      : "";
    const targetProduceBillEndTimeEnd = args["produce-bill-end-time-end"]
      ? String(args["produce-bill-end-time-end"]).trim()
      : "";
    const targetUpdatedAtStart = args["updated-at-start"] ? String(args["updated-at-start"]).trim() : "";
    const targetUpdatedAtEnd = args["updated-at-end"] ? String(args["updated-at-end"]).trim() : "";
    const targetNotFilterRework =
      args["not-filter-rework"] !== undefined ? toInt(args["not-filter-rework"], 0) : 0;
    const targetStatus = args.status ? String(args.status).trim() : "";
    const hasScope =
      Boolean(targetProduceBillCode) ||
      Boolean(targetCraftName) ||
      Boolean(targetCraftCode) ||
      Boolean(targetStatus) ||
      Boolean(targetReportableUserName) ||
      Boolean(targetQualityAbleUserName) ||
      Boolean(targetProduceBillEndTimeStart) ||
      Boolean(targetProduceBillEndTimeEnd) ||
      Boolean(targetUpdatedAtStart) ||
      Boolean(targetUpdatedAtEnd) ||
      Boolean(targetNotFilterRework) ||
      targetProduceBillStatuses.length > 0;

    if (args["not-filter-rework"] !== undefined && ![1, 2].includes(targetNotFilterRework)) {
      throw new Error("task:list 参数错误：--not-filter-rework 只支持 1=不过滤，2=过滤");
    }

    if (!hasScope && !toBool(args.all)) {
      throw new Error(
        "task:list 请至少提供一个检索范围条件，例如 --produce-bill-code、--craft-name、--craft-code、--status、--produce-bill-status；不要直接做无范围查询。",
      );
    }

    const context = await createAuthContext(getAuthOverrides(args));
    const fetchAll = toBool(args.all) || Boolean(targetProduceBillCode);
    const pageSize = toInt(args["page-size"], 200);

    const allRows = [];
    let pageNo = toInt(args.page, 1);

    while (true) {
      const requestBody = {
        pageNo,
        pageSize,
      };

      if (targetProduceBillCode) {
        requestBody.produce_bill_code = targetProduceBillCode;
      }
      if (targetCraftName) {
        requestBody.craft_name = targetCraftName;
      }
      if (targetCraftCode) {
        requestBody.craft_code = targetCraftCode;
      }
      if (targetReportableUserName) {
        requestBody.reportable_user_name = targetReportableUserName;
      }
      if (targetQualityAbleUserName) {
        requestBody.quality_able_user_name = targetQualityAbleUserName;
      }
      if (targetNotFilterRework) {
        requestBody.not_filter_rework = targetNotFilterRework;
      }
      if (targetProduceBillStatuses.length) {
        requestBody.produce_bill_status = targetProduceBillStatuses;
      }
      if (targetProduceBillEndTimeStart) {
        requestBody.produce_bill_end_time_start = targetProduceBillEndTimeStart;
      }
      if (targetProduceBillEndTimeEnd) {
        requestBody.produce_bill_end_time_end = targetProduceBillEndTimeEnd;
      }
      if (targetUpdatedAtStart) {
        requestBody.updated_at_start = targetUpdatedAtStart;
      }
      if (targetUpdatedAtEnd) {
        requestBody.updated_at_end = targetUpdatedAtEnd;
      }

      const json = await openApiPost(context, "/open_api/produce_bill_craft/list", requestBody);
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

  const commandReportList = createListHandler("/open_api/report_work_record/list", (args) => {
    return buildScopedListBody(args, {
      commandName: "report:list",
      scopeFields: [
        { arg: "produce-craft-id", field: "produce_craft_id", type: "int" },
        { arg: "produce-bill-code", field: "produce_bill_code" },
        { arg: "craft-name", field: "craft_name" },
        { args: ["keyword", "goods-keyword"], field: "goods_keyword" },
        { arg: "report-user-name", field: "report_user_name" },
        { arg: "quality-user-name", field: "quality_user_name" },
        { arg: "create-user-name", field: "create_user_name" },
        { arg: "traceability-code", field: "traceability_code_code" },
        { arg: "updated-at-start", field: "updated_at_start" },
        { arg: "updated-at-end", field: "updated_at_end" },
      ],
    });
  });

  const commandContractList = createListHandler("/open_api/customer_contract/list", (args) =>
    buildScopedListBody(args, {
      commandName: "contract:list",
      scopeFields: [
        { arg: "code", field: "code" },
        { args: ["keyword", "goods-keyword"], field: "goods_keyword" },
        { arg: "goods-name", field: "goods_name" },
        { arg: "goods-code", field: "goods_code" },
        { arg: "goods-standard", field: "goods_standard" },
        { arg: "is-stock-out-finish", field: "is_stock_out_finish", type: "int" },
        { arg: "updated-at-start", field: "updated_at_start" },
        { arg: "updated-at-end", field: "updated_at_end" },
      ],
    }),
  );

  return {
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
  };
}

module.exports = {
  buildListCommands,
};
