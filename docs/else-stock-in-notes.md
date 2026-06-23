# 其他入库单问题总结

## 背景

本次业务目标是为商品 `平板石墨盘` 创建一张入库到 `成品仓` 的快工单 `其他入库单`。

首次提交的最小 payload 为：

```json
{
  "bill_date": "2026-06-23",
  "ware_name": "成品仓",
  "item_list": [
    {
      "goods_id": 8253995,
      "num": 10
    }
  ]
}
```

接口返回：

```json
{
  "success": false,
  "post_track": 1,
  "msg": "参数校验错误"
}
```

## 问题结论

- `其他入库单` 不能只传日期、仓库、商品和数量
- 至少在当前企业配置下，还需要补齐：
  - `stock_type_name`
  - `consignee_id`
  - `item_list[].cost_price`
  - `item_list[].selling_price`
- 通用 `openapi:post` 命令虽然灵活，但缺少业务级别的最小字段校验
- 接口失败时如果只输出 `msg`，很难快速定位真实缺项

## 本次验证通过的 payload

```json
{
  "bill_date": "2026-06-23",
  "ware_name": "成品仓",
  "stock_type_name": "普通入库",
  "consignee_id": 100753,
  "item_list": [
    {
      "goods_id": 8253995,
      "num": 10,
      "cost_price": 0,
      "selling_price": 0
    }
  ]
}
```

成功返回：

```json
{
  "success": true,
  "data": {
    "id": 1221035,
    "code": "QTRK20260623001"
  }
}
```

## 处理建议

### 1. 优先使用专用命令

已新增：

```bash
node ./scripts/kgd-cli.js else-stock-in:add \
  --goods-id 8253995 \
  --num 10 \
  --ware-name 成品仓 \
  --stock-type-name 普通入库 \
  --consignee-id 100753 \
  --bill-date 2026-06-23 \
  --cost-price 0 \
  --selling-price 0
```

特点：

- 默认 `bill_date` 为当天
- 本地先校验关键必填项
- 支持 `--dry-run`

### 2. 排查顺序

以后遇到类似创建失败，建议按这个顺序排查：

1. 先确认单据类型是否选对
2. 再确认外键 id 是否真实存在，例如 `goods_id`、`consignee_id`
3. 再确认是否存在企业级必填业务字段，例如 `stock_type_name`
4. 最后补齐明细金额字段，例如 `cost_price`、`selling_price`

### 3. 常见适用场景

- `其他入库单`：按商品直接入库，不依赖加工单
- `成品入库单`：需要关联具体 `produce_bill_id`

如果业务描述是“商品 + 仓库 + 数量”，但没有加工单，优先考虑 `其他入库单`。
