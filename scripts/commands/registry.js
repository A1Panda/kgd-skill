function buildCommandDefinitions(handlers) {
  const {
    commandVerify,
    commandAuthTest,
    commandToken,
    commandBuildFields,
    commandOpenApiPost,
    commandUploadFile,
    commandGoodsList,
    commandGoodsAdd,
    commandGoodsEdit,
    commandGoodsDisable,
    commandPubCraftList,
    commandPubCraftAdd,
    commandPubCraftEdit,
    commandElseStockOutList,
    commandElseStockOutAdd,
    commandElseStockInList,
    commandElseStockInAdd,
    commandCustomerList,
    commandCustomerAdd,
    commandSupplierList,
    commandSupplierAdd,
    commandUserList,
    commandProduceBillList,
    commandProduceBillAdd,
    commandProduceBillStatus,
    commandProduceStockInList,
    commandProduceStockInAdd,
    commandTaskList,
    commandTaskStatus,
    commandReportList,
    commandReportAdd,
    commandReportEdit,
    commandContractList,
    commandContractAdd,
    commandContractEdit,
  } = handlers;

  return Object.freeze([
    { name: "verify", handler: commandVerify, usage: ["  node ./scripts/kgd-cli.js verify"] },
    { name: "auth:test", handler: commandAuthTest, usage: ["  node ./scripts/kgd-cli.js auth:test"] },
    { name: "token", handler: commandToken, usage: ["  node ./scripts/kgd-cli.js token [--show-secrets]"] },
    {
      name: "build-fields",
      handler: commandBuildFields,
      usage: ["  node ./scripts/kgd-cli.js build-fields --registry ./config/kgd-field-registry.example.json --input ./your-order.json --object goods"],
    },
    {
      name: "openapi:post",
      handler: commandOpenApiPost,
      usage: ["  node ./scripts/kgd-cli.js openapi:post --path /open_api/pub_craft/list --input ./payload.json [--dry-run]"],
    },
    {
      name: "upload:file",
      handler: commandUploadFile,
      usage: ["  node ./scripts/kgd-cli.js upload:file --file ./demo.png [--dry-run]"],
    },
    {
      name: "goods:list",
      handler: commandGoodsList,
      usage: ["  node ./scripts/kgd-cli.js goods:list --keyword 石墨盘 --page 1 --page-size 20"],
    },
    {
      name: "goods:add",
      handler: commandGoodsAdd,
      usage: ["  node ./scripts/kgd-cli.js goods:add --input ./goods.json [--dry-run]"],
    },
    {
      name: "goods:edit",
      handler: commandGoodsEdit,
      usage: ["  node ./scripts/kgd-cli.js goods:edit --input ./goods.json [--dry-run]"],
    },
    {
      name: "goods:disable",
      handler: commandGoodsDisable,
      usage: ["  node ./scripts/kgd-cli.js goods:disable --id 8254248 --name 石墨盘 [--remark 误建停用] [--dry-run]"],
    },
    {
      name: "pub-craft:list",
      handler: commandPubCraftList,
      usage: ["  node ./scripts/kgd-cli.js pub-craft:list --keyword 打磨 --page 1 --page-size 20"],
    },
    {
      name: "pub-craft:add",
      handler: commandPubCraftAdd,
      usage: ["  node ./scripts/kgd-cli.js pub-craft:add --name 打磨 [--code GM001] [--reportable-user-ids-json '[1001,1002]'] [--dry-run]"],
    },
    {
      name: "pub-craft:edit",
      handler: commandPubCraftEdit,
      usage: ["  node ./scripts/kgd-cli.js pub-craft:edit --id 123456 --name 打磨 [--code GM001] [--reportable-user-ids-json '[1001,1002]'] [--dry-run]"],
    },
    {
      name: "else-stock-out:list",
      handler: commandElseStockOutList,
      usage: ["  node ./scripts/kgd-cli.js else-stock-out:list [--keyword 石墨盘] [--page 1] [--page-size 20]"],
    },
    {
      name: "else-stock-out:add",
      handler: commandElseStockOutAdd,
      usage: [
        "  node ./scripts/kgd-cli.js else-stock-out:add --goods-id 8253995 --num 10 --ware-name 成品仓 --stock-type-name 普通出库 --shipper-id 100753 [--bill-date 2026-06-23] [--remark 备注] [--dry-run]",
        "  node ./scripts/kgd-cli.js else-stock-out:add --input ./stock-out-bill.json [--dry-run]",
      ],
    },
    {
      name: "else-stock-in:list",
      handler: commandElseStockInList,
      usage: ["  node ./scripts/kgd-cli.js else-stock-in:list [--keyword 石墨盘] [--page 1] [--page-size 20]"],
    },
    {
      name: "else-stock-in:add",
      handler: commandElseStockInAdd,
      usage: [
        "  node ./scripts/kgd-cli.js else-stock-in:add --goods-id 8253995 --num 10 --ware-name 成品仓 --stock-type-name 普通入库 --consignee-id 100753 [--bill-date 2026-06-23] [--cost-price 0] [--selling-price 0] [--dry-run]",
        "  node ./scripts/kgd-cli.js else-stock-in:add --input ./stock-in-bill.json [--dry-run]",
      ],
    },
    {
      name: "customer:list",
      handler: commandCustomerList,
      usage: ["  node ./scripts/kgd-cli.js customer:list --keyword 聚力 --page 1 --page-size 20"],
    },
    {
      name: "customer:add",
      handler: commandCustomerAdd,
      usage: ["  node ./scripts/kgd-cli.js customer:add --name 聚力 --linkman-name 张三 [--mobile 13800000000] [--province-name 广东省] [--city-name 深圳市] [--area-name 南山区] [--address 科技园] [--dry-run]"],
    },
    {
      name: "supplier:list",
      handler: commandSupplierList,
      usage: ["  node ./scripts/kgd-cli.js supplier:list --keyword 碳材 --page 1 --page-size 20"],
    },
    {
      name: "supplier:add",
      handler: commandSupplierAdd,
      usage: ["  node ./scripts/kgd-cli.js supplier:add --name 某供应商 [--linkman-name 李四] [--linkman-mobile 13800000000] [--address 东莞] [--dry-run]"],
    },
    {
      name: "user:list",
      handler: commandUserList,
      usage: ["  node ./scripts/kgd-cli.js user:list --keyword 于英 --page 1 --page-size 20"],
    },
    {
      name: "produce-bill:list",
      handler: commandProduceBillList,
      usage: ["  node ./scripts/kgd-cli.js produce-bill:list [--keyword 20260305001-4] [--code JGD0001] [--page 1] [--page-size 20]"],
    },
    {
      name: "produce-bill:add",
      handler: commandProduceBillAdd,
      usage: ["  node ./scripts/kgd-cli.js produce-bill:add --goods-id 8253995 --num 10 [--code JGD20260624001] [--delivery-date 2026-06-30] [--craft-list-json '[\"打磨\",\"打码\"]'] [--dry-run]"],
    },
    {
      name: "produce-bill:status",
      handler: commandProduceBillStatus,
      usage: ["  node ./scripts/kgd-cli.js produce-bill:status --id 123456 --type 1 [--cancel-reason 原因] [--dry-run]"],
    },
    {
      name: "produce-stock-in:list",
      handler: commandProduceStockInList,
      usage: ["  node ./scripts/kgd-cli.js produce-stock-in:list [--keyword JGD0001] [--page 1] [--page-size 20]"],
    },
    {
      name: "produce-stock-in:add",
      handler: commandProduceStockInAdd,
      usage: [
        "  node ./scripts/kgd-cli.js produce-stock-in:add --produce-bill-id 123456 --num 10 --ware-name 成品仓 [--bill-date 2026-06-23] [--stock-type-name 完工入库] [--remark 备注] [--dry-run]",
        "  node ./scripts/kgd-cli.js produce-stock-in:add --input ./produce-stock-in-bill.json [--dry-run]",
      ],
    },
    {
      name: "task:list",
      handler: commandTaskList,
      usage: ["  node ./scripts/kgd-cli.js task:list [--produce-bill-code 20260305001-4] [--craft-name 打磨] [--status 未开始] [--all]"],
    },
    {
      name: "task:status",
      handler: commandTaskStatus,
      usage: ["  node ./scripts/kgd-cli.js task:status --id 23437544 --status 3 [--dry-run]"],
    },
    {
      name: "report:list",
      handler: commandReportList,
      usage: ["  node ./scripts/kgd-cli.js report:list [--produce-craft-id 23437544] [--page 1] [--page-size 20]"],
    },
    {
      name: "report:add",
      handler: commandReportAdd,
      usage: ["  node ./scripts/kgd-cli.js report:add --input ./report.json [--dry-run]"],
    },
    {
      name: "report:edit",
      handler: commandReportEdit,
      usage: ["  node ./scripts/kgd-cli.js report:edit --id 123456 --report-user-id 100753 --valid-num 10 --waste-num 0 [--is-finish 1] [--remark 补充修正] [--dry-run]"],
    },
    {
      name: "contract:list",
      handler: commandContractList,
      usage: ["  node ./scripts/kgd-cli.js contract:list [--keyword 聚力] [--code HT20260623001] [--page 1] [--page-size 20]"],
    },
    {
      name: "contract:add",
      handler: commandContractAdd,
      usage: [
        "  node ./scripts/kgd-cli.js contract:add --input ./contract.json [--dry-run]",
        "  node ./scripts/kgd-cli.js contract:add --customer-id 1544650 --sales-user-id 144246 --goods-id 8253995 --num 10 --unit-price 100 --delivery-date 2026-06-30 --has-tax 1 [--linkman-id 1747835] [--money 1000] [--advance 300] [--code HT20260624001] [--remark 备注] [--dry-run]",
      ],
    },
    {
      name: "contract:edit",
      handler: commandContractEdit,
      usage: ["  node ./scripts/kgd-cli.js contract:edit --input ./contract.json [--dry-run]"],
    },
  ]);
}

module.exports = {
  buildCommandDefinitions,
};
