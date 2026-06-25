function buildListCommands(deps) {
  const {
    buildPaginationBody,
    createAuthContext,
    createListHandler,
    getAuthOverrides,
    openApiPost,
    printJson,
    toBool,
    toInt,
  } = deps;

  const commandPubCraftList = createListHandler("/open_api/pub_craft/list", (args) =>
    deps.buildKeywordListBody(args),
  );

  const commandElseStockOutList = createListHandler("/open_api/else_stock_out_bill/list", (args) =>
    deps.buildKeywordListBody(args),
  );

  const commandElseStockInList = createListHandler("/open_api/else_stock_in_bill/list", (args) =>
    deps.buildKeywordListBody(args),
  );

  const commandCustomerList = createListHandler("/open_api/customer/list", (args) =>
    deps.buildKeywordListBody(args),
  );

  const commandSupplierList = createListHandler("/open_api/supplier/list", (args) =>
    deps.buildKeywordListBody(args),
  );

  const commandUserList = createListHandler("/open_api/user/list", (args) => deps.buildKeywordListBody(args));

  const commandProduceBillList = createListHandler("/open_api/produce_bill/list", (args) => {
    const body = buildPaginationBody(args);
    if (args.keyword) {
      body.keyword = String(args.keyword);
    }
    if (args.code) {
      body.code = String(args.code);
    }
    if (args.status) {
      body.status = args.status;
    }
    return body;
  });

  const commandProduceStockInList = createListHandler("/open_api/produce_stock_in_bill/list", (args) =>
    deps.buildKeywordListBody(args),
  );

  async function commandTaskList(args) {
    const context = await createAuthContext(getAuthOverrides(args));
    const targetProduceBillCode = args["produce-bill-code"] ? String(args["produce-bill-code"]) : "";
    const targetCraftName = args["craft-name"] ? String(args["craft-name"]) : "";
    const targetStatus = args.status ? String(args.status) : "";
    const fetchAll = toBool(args.all) || (targetProduceBillCode && (targetCraftName || targetStatus));
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
    const body = buildPaginationBody(args);
    if (args["produce-craft-id"]) {
      body.produce_craft_id = toInt(args["produce-craft-id"], 0);
    }
    if (args["produce-bill-code"]) {
      body.produce_bill_code = String(args["produce-bill-code"]);
    }
    if (args.keyword) {
      body.keyword = String(args.keyword);
    }
    return body;
  });

  const commandContractList = createListHandler("/open_api/customer_contract/list", (args) => ({
    ...buildPaginationBody(args),
    keyword: args.keyword ? String(args.keyword) : "",
    code: args.code ? String(args.code) : "",
  }));

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
