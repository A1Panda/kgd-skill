function buildStatusCommands(deps) {
  const {
    createAuthContext,
    getAuthOverrides,
    openApiPost,
    printJson,
    toBool,
    toInt,
  } = deps;

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

  return {
    commandProduceBillStatus,
    commandTaskStatus,
  };
}

module.exports = {
  buildStatusCommands,
};
