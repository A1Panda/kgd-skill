function buildContractCommands(deps) {
  const {
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
    toMoneyString,
    toNumber,
  } = deps;

  function normalizeHasTaxValue(value, commandName) {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (["1", "true", "yes", "y", "是"].includes(normalized)) {
      return 1;
    }
    if (["0", "2", "false", "no", "n", "否"].includes(normalized)) {
      return 2;
    }
    throw new Error(`${commandName} 缺少或错误的参数：--has-tax 必须为 1/0/2/是/否`);
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

    const contractRemark = String(nextPayload.remark ?? "").trim();

    if (Array.isArray(nextPayload.item_list)) {
      nextPayload.item_list = nextPayload.item_list.map((item) => {
        const nextItem = { ...item };
        if (!String(nextItem.remark ?? "").trim() && contractRemark) {
          nextItem.remark = contractRemark;
        }
        return nextItem;
      });
    }

    // 实测：合同 remark 缺失会导致 API 参数校验错误；code 缺失时可由系统自动生成
    if (!String(nextPayload.remark ?? "").trim()) {
      throw new Error("contract:add (JSON) 缺少必填字段：remark（合同备注）不能为空");
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

    const remark = getRequiredStringArg(args, "remark", commandName);

    const num = getRequiredPositiveNumberArg(args, "num", commandName);
    const unitPrice = getRequiredPositiveNumberArg(args, "unit-price", commandName);
    const itemRemark = args["item-remark"] ? String(args["item-remark"]) : remark;
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
      remark,
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

  async function commandContractAdd(args) {
    if (hasJsonInput(args)) {
      const rawPayload = loadJsonInput(args);
      const context = await createAuthContext(getAuthOverrides(args));
      const payload = normalizeContractAddPayload(rawPayload, context);
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

  return {
    commandContractAdd,
  };
}

module.exports = {
  buildContractCommands,
};
