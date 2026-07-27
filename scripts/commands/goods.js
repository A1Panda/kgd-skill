function buildGoodsCommands(deps) {
  const {
    buildGoodsDisablePayloadFromArgs,
    buildScopedListBody,
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
  } = deps;

  const commandGoodsList = createListHandler("/open_api/goods/list", (args) =>
    buildScopedListBody(args, {
      commandName: "goods:list",
      scopeFields: [
        { args: ["keyword", "goods-keyword"], field: "goods_keyword" },
        { arg: "create-user-name", field: "create_user_name" },
        { arg: "category-name", field: "category_name" },
        { arg: "source", field: "source", type: "int" },
        { arg: "is-enable", field: "is_enable", type: "int" },
        { arg: "supplier-name", field: "supplier_name" },
        { arg: "updated-at-start", field: "updated_at_start" },
        { arg: "updated-at-end", field: "updated_at_end" },
      ],
    }),
  );

  async function completeGoodsEditPayload(context, payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return payload;
    }

    const nextPayload = { ...payload };
    const needsBaseFields =
      isBlankValue(nextPayload.name) ||
      isBlankValue(nextPayload.code) ||
      isBlankValue(nextPayload.standard) ||
      (isBlankValue(nextPayload.unit) && isBlankValue(nextPayload.unit_name));

    if (!needsBaseFields) {
      return nextPayload;
    }

    const goodsId = toInt(nextPayload.id, 0);
    if (!goodsId) {
      throw new Error("goods:edit 缺少或错误的参数：缺少 id，无法自动补全 name/code/standard/unit");
    }

    const json = await openApiPost(context, "/open_api/goods/list", {
      id: goodsId,
      pageNo: 1,
      pageSize: 1,
    });
    const rows = Array.isArray(json.data) ? json.data : [];
    const existing =
      rows.find((item) => toInt(item?.id, 0) === goodsId) ||
      rows.find((item) => item && typeof item === "object");

    if (!existing) {
      throw new Error(`goods:edit 无法根据 id=${goodsId} 查询现有商品，不能自动补全基础字段`);
    }

    if (isBlankValue(nextPayload.name) && !isBlankValue(existing.name)) {
      nextPayload.name = existing.name;
    }
    if (isBlankValue(nextPayload.code) && !isBlankValue(existing.code)) {
      nextPayload.code = existing.code;
    }
    if (isBlankValue(nextPayload.standard) && !isBlankValue(existing.standard)) {
      nextPayload.standard = existing.standard;
    }

    const existingUnit = !isBlankValue(existing.unit) ? existing.unit : existing.unit_name;
    if (isBlankValue(nextPayload.unit) && !isBlankValue(existingUnit)) {
      nextPayload.unit = existingUnit;
    }
    if (isBlankValue(nextPayload.unit_name) && !isBlankValue(existingUnit)) {
      nextPayload.unit_name = existingUnit;
    }

    return nextPayload;
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
    const payloadList = Array.isArray(payload) ? payload : [payload];
    const normalizedPayloadList = [];

    for (const item of payloadList) {
      normalizedPayloadList.push(mode === "edit" ? await completeGoodsEditPayload(context, item) : item);
    }

    if (Array.isArray(payload)) {
      const results = [];
      for (const item of normalizedPayloadList) {
        results.push(await openApiPost(context, apiPath, item));
      }
      printJson({
        success: true,
        data: results,
      });
      return;
    }

    const json = await openApiPost(context, apiPath, normalizedPayloadList[0]);
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

  const commandGoodsAdd = (args) => commandGoodsWrite(args, "add");
  const commandGoodsEdit = (args) => commandGoodsWrite(args, "edit");

  return {
    commandGoodsList,
    commandGoodsAdd,
    commandGoodsEdit,
    commandGoodsDisable,
  };
}

module.exports = {
  buildGoodsCommands,
};
