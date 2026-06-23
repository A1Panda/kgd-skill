# kgd-skill

## 说明

这个仓库用于让 OpenClaw 通过 Skill `openclaw-kuaigongdan` 直接操作快工单 OpenAPI。

适合的能力包括：

- 查询用户、商品、工序、客户、供应商
- 查询和创建加工单、生产任务、报工记录
- 创建其他出库单、其他入库单、成品入库单
- 查询和维护合同
- 上传附件并挂接到业务对象

## Skill 名称

- `openclaw-kuaigongdan`

当你在 OpenClaw 中让助手操作快工单相关数据时，应该优先使用这个 Skill。

## 前置配置

建议在运行环境或本地 `.env` 中准备以下变量：

- `KGD_BASE_URL=https://api.kgd.ltd`
- `KGD_API_KEY=...`
- `KGD_API_SECRET=...`
- `KGD_USERNAME=...`

推荐约定：

- `KGD_API_KEY`、`KGD_API_SECRET` 作为企业固定配置
- `KGD_USERNAME` 作为当前会话用户配置

## 在 OpenClaw 中怎么用

你可以直接对 OpenClaw 说业务话术，不需要自己拼 OpenAPI 请求。

推荐方式：

- 直接说查询目标
- 直接说新增目标
- 如果字段不完整，让 OpenClaw 继续追问缺失字段
- 涉及外键 id 时，先让 OpenClaw 查询基础数据再写入

例如可以直接说：

```text
查看用户列表
```

```text
查 于英
```

```text
查看最新添加的一个商品
```

```text
查看工序列表
```

```text
查看供应商列表
```

```text
平板石墨盘 入库成品仓 10PCS
```

```text
刻字刀 入库 12PCS
```

## 推荐交互规则

为了减少误操作，建议在 OpenClaw 中按下面规则执行：

- 查询类操作：直接执行
- 写入类操作：字段不全时必须先确认
- 关联型字段：先查再写，不要猜 id
- 编辑类操作：如果接口要求完整结构，不要只传一两个字段硬改

建议重点遵守：

- 新增商品前，至少确认 `name`
- 新增加工单前，至少确认 `goods_id` 和 `num`
- 新增报工前，至少确认 `produce_craft_id`、`report_user_id`、`valid_num`、`waste_num`、`is_finish`
- 新增其他入库单前，至少确认日期、仓库、商品、数量
- `刀具入库` 场景下，要额外确认 `supplier_id`

## 推荐让 OpenClaw 追问的字段

### 其他入库单

如果用户只说：

```text
刻字刀 入库 12PCS
```

建议 OpenClaw 继续确认：

- 仓库
- 收货人
- 入库类型
- 供应商
- 单价

其中：

- 如果是 `刀具入库`，要确认供应商
- 如果是普通数量入库，也建议确认成本单价和销售单价

### 成品入库单

如果用户要做成品入库，建议继续确认：

- 加工单号或 `produce_bill_id`
- 仓库
- 数量
- 日期

### 报工

如果用户要新增报工，建议继续确认：

- 生产任务 `produce_craft_id`
- 报工人 `report_user_id`
- 良品数
- 不良品数
- 是否完工

## 典型对话示例

### 查询用户

```text
查看用户列表
查 于英
```

### 查询主数据

```text
查看供应商列表
查看工序列表
查看最新添加的一个商品
```

### 创建其他入库单

```text
刻字刀 入库 12PCS
```

OpenClaw 应继续确认：

- 入哪个仓库
- 收货人是谁
- 入库类型是什么
- 是否需要确认供应商
- 单价怎么填

### 创建成品仓入库

```text
平板石墨盘 入库成品仓 10PCS
```

OpenClaw 应先判断：

- 是 `其他入库单`
- 还是 `成品入库单`

如果不是基于加工单入库，优先按 `其他入库单` 流程继续追问。

## 可直接配合脚本使用

如果 OpenClaw 需要在本地脚本层执行，也可以直接调用仓库里的 CLI：

```bash
node ./scripts/kgd-cli.js verify
```

```bash
node ./scripts/kgd-cli.js goods:list --keyword 石墨盘 --page 1 --page-size 20
```

```bash
node ./scripts/kgd-cli.js user:list --keyword 于英 --page 1 --page-size 20
```

```bash
node ./scripts/kgd-cli.js openapi:post --path /open_api/supplier/list --json '{"keyword":"","pageNo":1,"pageSize":50}'
```

```bash
node ./scripts/kgd-cli.js else-stock-in:add \
  --goods-id 5777665 \
  --num 12 \
  --ware-name 工具仓 \
  --stock-type-name 刀具入库 \
  --consignee-id 100752 \
  --supplier-id 130522 \
  --cost-price 0 \
  --selling-price 0
```

## 参考资料

- [其他入库单问题总结](./docs/else-stock-in-notes.md)
- [Skill 详细说明](./.trae/skills/openclaw-kuaigongdan/SKILL.md)
