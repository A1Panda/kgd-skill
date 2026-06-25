function buildWriteCommands(deps) {
  const {
    buildCustomerAddPayloadFromArgs,
    buildProduceBillAddPayloadFromArgs,
    buildPubCraftPayloadFromArgs,
    buildReportEditPayloadFromArgs,
    buildSupplierAddPayloadFromArgs,
    createWriteHandler,
    hasJsonInput,
    loadJsonInput,
  } = deps;

  const commandPubCraftWrite = (args, mode) =>
    createWriteHandler({
      apiPath: mode === "edit" ? "/open_api/pub_craft/edit" : "/open_api/pub_craft/add",
      loadPayload: (currentArgs) =>
        hasJsonInput(currentArgs) ? loadJsonInput(currentArgs) : buildPubCraftPayloadFromArgs(currentArgs, mode),
    })(args);

  const commandCustomerAdd = createWriteHandler({
    apiPath: "/open_api/customer/add",
    loadPayload: (args) => (hasJsonInput(args) ? loadJsonInput(args) : buildCustomerAddPayloadFromArgs(args)),
  });

  const commandSupplierAdd = createWriteHandler({
    apiPath: "/open_api/supplier/add",
    loadPayload: (args) => (hasJsonInput(args) ? loadJsonInput(args) : buildSupplierAddPayloadFromArgs(args)),
  });

  const commandProduceBillAdd = createWriteHandler({
    apiPath: "/open_api/produce_bill/add",
    loadPayload: (args) => (hasJsonInput(args) ? loadJsonInput(args) : buildProduceBillAddPayloadFromArgs(args)),
  });

  const commandReportAdd = createWriteHandler({
    apiPath: "/open_api/report_work_record/add",
    loadPayload: (args) => loadJsonInput(args),
  });

  const commandReportEdit = createWriteHandler({
    apiPath: "/open_api/report_work_record/edit",
    loadPayload: (args) => (hasJsonInput(args) ? loadJsonInput(args) : buildReportEditPayloadFromArgs(args)),
  });

  const commandContractEdit = createWriteHandler({
    apiPath: "/open_api/customer_contract/edit",
    loadPayload: (args) => loadJsonInput(args),
  });

  const commandPubCraftAdd = (args) => commandPubCraftWrite(args, "add");
  const commandPubCraftEdit = (args) => commandPubCraftWrite(args, "edit");

  return {
    commandCustomerAdd,
    commandSupplierAdd,
    commandPubCraftAdd,
    commandPubCraftEdit,
    commandProduceBillAdd,
    commandReportAdd,
    commandReportEdit,
    commandContractEdit,
  };
}

module.exports = {
  buildWriteCommands,
};
