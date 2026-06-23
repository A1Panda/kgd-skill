---
name: "openclaw-kuaigongdan"
description: "对接快工单 OpenAPI（鉴权、基础数据、加工单、报工、出入库、合同、附件）。当用户要查询/创建/更新快工单业务数据时调用。"
---

# OpenClaw 快工单接入

本 Skill 用于在 OpenClaw 中通过快工单 OpenAPI 执行完整业务操作：鉴权、基础数据维护、加工单与生产任务、报工、客户与供应商、其他出入库单、成品入库单、合同、附件上传。

## 适用场景

- 用户要求“查询快工单里的用户/商品/工序/客户/供应商/加工单/报工/合同/库存单据”
- 用户要求“新增或修改商品、工序、客户、供应商、合同、出库单、入库单”
- 用户要求“开始/撤回/完成/取消加工单”或“修改生产任务状态”
- 用户要求“上传附件，并挂到商品、加工单、报工、合同等附件字段”
- 用户已提供快工单账号配置，希望由你直接调用 OpenAPI 完成业务动作

## 前置配置

- 需要以下输入：
  - `api_key`：企业 ApiKey
  - `api_secret`：企业 ApiSecret
  - `username`：用于登录鉴权的用户名
- 推荐配置方式：
  - `KGD_API_KEY`、`KGD_API_SECRET` 作为企业级固定配置，首次部署时设置一次
  - `KGD_USERNAME` 作为会话级配置，不同用户使用时单独确认
- 默认域名：`https://api.kgd.ltd`
- 敏感信息保护：
  - 不要把 `api_secret`、`access_token`、`X-TOKEN` 输出到日志或复述给无关方
  - 不要把真实密钥写入仓库；优先使用环境变量、本地 `.env`、密钥管理
  - 如果用户在对话里临时提供 `api_key`、`api_secret`、`username`，优先作为本次会话的运行时覆盖值使用，不要回写到 `.env.example`、仓库文件或共享脚本中

建议环境变量：

- `KGD_BASE_URL`
- `KGD_API_KEY`
- `KGD_API_SECRET`
- `KGD_USERNAME`
- `KGD_ACCESS_TOKEN`
- `KGD_X_TOKEN`

## 鉴权流程

### 1. 获取授权凭证

- `GET /open_api/token`
- Query：`api_key`, `api_secret`
- 返回：`data = access_token`
- 有效期：2 小时

```bash
curl --location "${KGD_BASE_URL}/open_api/token?api_key=${KGD_API_KEY}&api_secret=${KGD_API_SECRET}"
```

### 2. 登录获取业务 Token

- `POST /open_api/user/login`
- Body：`{ access_token, username }`
- 返回：`data.token`
- 后续业务请求统一使用请求头：`X-TOKEN: <token>`

```bash
curl --location "${KGD_BASE_URL}/open_api/user/login" \
  --header "Content-Type: application/json" \
  --data "{\"access_token\":\"${KGD_ACCESS_TOKEN}\",\"username\":\"${KGD_USERNAME}\"}"
```

### 3. 通用调用规则

- 除上传附件外，统一使用 `Content-Type: application/json`
- 业务接口优先统一带 `X-TOKEN`
- 遇到鉴权失败时：
  - 先重新获取 `access_token`
  - 再重新登录拿新的 `X-TOKEN`
  - 然后重试原请求一次

## 能力总览

### 登录鉴权

- `GET /open_api/token`
- `POST /open_api/user/login`

### 用户

- `POST /open_api/user/list`
- 常用于通过姓名/用户名查 `user_id`，供出入库收发货人、报工人、工序可报工人、业务员等场景复用

### 商品

- `POST /open_api/goods/list`
- `POST /open_api/goods/add`
- `POST /open_api/goods/edit`
- 新增商品关键字段：
  - 必填：`name`
  - 常用：`code`, `standard`, `category_name`, `unit_name`, `source`, `selling_money`, `commission_settle_money`, `avatars`, `profile`, `remark`, `attachments`
- 编辑商品关键字段：
  - 必填：`id`, `name`
- 如果业务上存在“物料编码、用料、HT图号、图纸编码、版本号、是否涂层”等扩展字段：
  - 不要把这些值混进 `name` 或 `remark`
  - 应优先映射到商品扩展字段 `fieldValueList`
  - 字段名必须与快工单后台配置的扩展字段名称完全一致

### 工序管理

- `POST /open_api/pub_craft/list`
- `POST /open_api/pub_craft/add`
- `POST /open_api/pub_craft/edit`
- 新增/编辑工序常用字段：
  - `name`, `code`
  - `need_quality`, `need_scrap_rework`
  - `reportable_user_ids`, `quality_able_user_ids`
  - `price_mode`, `unit_money`
  - `from_unit_num`, `to_unit_num`, `unit_name`
  - `standard_working_minutes`
  - `workshop_name`, `produce_line_name`
  - `device_ids`, `waste_item_codes`, `remark`
- 工序类接口字段较多，若用户只说“建一个工序”，需要继续追问质量、计价、单位关系、人员和车间/产线信息

### 加工单

- `POST /open_api/produce_bill/list`
- `POST /open_api/produce_bill/add`
- `POST /open_api/produce_bill/edit`
- `POST /open_api/produce_bill/edit_status`

#### 加工单新增

- 必填：`goods_id`, `num`
- 常用：`code`, `delivery_date`, `priority_name`, `start_produce_date`, `end_produce_date`, `remark`, `craft_list`, `fieldValueList`, `attachments`
- 若用户只给商品名称或编号：
  - 先调用商品列表定位 `goods_id`
- 若用户只给工序名称：
  - 优先尝试 `craft_list: ["工序名1", "工序名2"]`
  - 不传则使用商品已有工序

#### 加工单编辑

- 必填：`id`, `num`, `craft_list`
- `craft_list` 需要完整结构，常见字段包括：
  - `id`, `pub_craft_id`
  - `from_unit_num`, `to_unit_num`
  - `unit_money`
  - `waste_item_ids`
  - `need_quality`, `quality_type`, `inspection_scheme_name`
  - `price_mode`, `need_scrap_rework`, `need_outsource`
  - `standard_working_seconds`
  - `plan_start`, `plan_end`
  - `device_ids`
  - `remark`
- 如果用户只是想轻量修改数量、交期、备注：
  - 先告知该接口仍要求完整 `craft_list`
  - 若拿不到完整工序任务结构，不要盲目提交不完整请求

#### 加工单状态流转

- `POST /open_api/produce_bill/edit_status`
- Body：`{ id, type, cancel_reason? }`
- 枚举：
  - `1` 开始
  - `2` 撤回
  - `3` 完成
  - `4` 取消
- 当 `type=4` 时必须提供 `cancel_reason`

### 生产任务

- `POST /open_api/produce_bill_craft/list`
- `POST /open_api/produce_bill_craft/edit_status`
- 任务状态枚举：
  - `1` 未开始
  - `2` 进行中
  - `3` 已完成
  - `4` 暂停
- 当用户说“暂停某工序任务”“完成某个工序”，优先用这组接口

### 报工

- `POST /open_api/report_work_record/list`
- `POST /open_api/report_work_record/add`
- `POST /open_api/report_work_record/edit`

#### 新增报工记录

- 必填：`produce_craft_id`, `report_user_id`, `valid_num`, `waste_num`, `is_finish`
- 常用：`remark`, `start_time`, `end_time`, `working_minutes`, `traceability_codes`, `report_waste_array`, `fieldValueList`, `attachments`
- `report_waste_array` 元素：`{ waste_item_code, num }`

#### 编辑报工记录

- 必填：`id`, `report_user_id`, `valid_num`, `waste_num`
- 常用字段与新增报工接近，但附件编辑时通常需要带已有附件 `id`

### 客户

- `POST /open_api/customer/list`
- `POST /open_api/customer/add`
- 客户新增关键字段：
  - 必填：`name`, `linkman_name`
  - 常用：`mobile`, `tag_names`, `province_name`, `city_name`, `area_name`, `address`

### 供应商

- `POST /open_api/supplier/list`
- `POST /open_api/supplier/add`
- 供应商新增关键字段：
  - 必填：`name`
  - 常用：`linkman_name`, `linkman_mobile`, `tag_names`, `province_name`, `city_name`, `area_name`, `address`

### 其他出库单

- `POST /open_api/else_stock_out_bill/list`
- `POST /open_api/else_stock_out_bill/add`
- 新增关键字段：
  - 必填：`bill_date`, `ware_name`, `item_list`
  - 常用：`stock_type_name`, `shipper_id`, `remark`, `fieldValueList`
- `item_list` 元素：
  - `goods_id`, `num`, `remark`

### 其他入库单

- `POST /open_api/else_stock_in_bill/list`
- `POST /open_api/else_stock_in_bill/add`
- 新增关键字段：
  - 必填：`bill_date`, `ware_name`, `item_list`
  - 常用：`consignee_id`, `supplier_id`, `stock_type_name`, `remark`, `fieldValueList`
- `item_list` 元素：
  - `goods_id`, `num`, `cost_price`, `selling_price`, `remark`

### 成品入库单

- `POST /open_api/produce_stock_in_bill/list`
- `POST /open_api/produce_stock_in_bill/add`
- 新增关键字段：
  - 必填：`bill_date`, `ware_name`, `item_list`
  - 常用：`stock_type_name`, `remark`, `fieldValueList`
- `item_list` 元素：
  - `produce_bill_id`, `num`, `remark`

### 合同

- `POST /open_api/customer_contract/list`
- `POST /open_api/customer_contract/add`
- `POST /open_api/customer_contract/edit`

#### 合同新增

- 必填：`enterprise_id`, `customer_id`, `money`, `advance`, `has_tax`, `sales_user_id`
- 常用：`code`, `linkman_id`, `delivery_date`, `remark`, `address`, `province_code`, `city_code`, `area_code`, `fieldValueList`, `attachments`
- `item_list` 元素常用字段：
  - `goods_id`, `num`, `unit_price`, `money`, `discount`, `discount_money`, `after_discount_money`, `remark`
- 若合同明细需要保留商品侧扩展信息：
  - 优先把客户级字段放在合同头 `fieldValueList`
  - 把物料编码、用料、HT图号、图纸编码、版本号、是否涂层等放在商品或合同明细扩展字段
  - 不要仅放在截图备注或自由文本中

#### 合同修改

- 必填字段更多，至少需要：
  - `id`, `customer_id`, `enterprise_id`, `money`, `advance`, `delivery_date`, `remark`, `item_list`, `has_tax`, `address`, `area_code`, `city_code`, `province_code`, `fieldValueList`, `sales_user_id`
- 编辑时若接口要求明细 id，应尽量带上 `item_list[].id`
- 若用户只想改一项合同字段，先确认是否具备完整合同上下文；否则不要猜测补齐

### 附件

- `POST /open_api/upload/file`
- multipart/form-data：`file`
- 返回：`url`, `original_name`, `file_size`
- 可供以下对象复用：
  - 商品 `attachments`
  - 加工单 `attachments`
  - 报工记录 `attachments`
  - 合同 `attachments`

```bash
curl --location "${KGD_BASE_URL}/open_api/upload/file" \
  --header "X-TOKEN: ${KGD_X_TOKEN}" \
  --form "file=@/path/to/file.png"
```

## 调用策略

### 先查再写

- 涉及外键 id 时，优先先查基础数据再提交写操作：
  - `goods_id` 先查商品
  - `customer_id`、`linkman_id` 先查客户
  - `supplier_id` 先查供应商
  - `user_id`、`shipper_id`、`consignee_id`、`sales_user_id` 先查用户
  - `produce_bill_id` 先查加工单
  - `produce_craft_id` 先查生产任务

### 写操作前必须确认

- 用户想“新增商品”：
  - 至少确认 `name`
- 用户想“新增工序”：
  - 至少确认 `name`，最好补齐质检、计价、单位、人员、车间/产线
- 用户想“新增加工单”：
  - 至少确认 `goods_id` 与 `num`
- 用户想“新增报工”：
  - 至少确认 `produce_craft_id`, `report_user_id`, `valid_num`, `waste_num`, `is_finish`
- 用户想“新增客户/供应商”：
  - 至少确认 `name`，客户最好补 `linkman_name`
- 用户想“新增出入库单”：
  - 至少确认日期、仓库、明细 `item_list`
- 用户想“新增合同”：
  - 至少确认 `enterprise_id`, `customer_id`, `money`, `advance`, `has_tax`, `sales_user_id`

### 对字段不全的处理原则

- 不要假造 id、编码、金额、税率、单价、折扣、人员关系
- 如果接口是“编辑”且文档要求完整结构，不要只凭用户一句“改个备注”就直接提交
- 优先向用户补问最小必要字段，再执行

## 扩展字段映射

### 推荐做法

- 使用“字段注册表 + 统一转换函数”的方式构造 `fieldValueList`
- 同一批业务字段应按对象分层：
  - 商品主数据扩展字段
  - 合同头扩展字段
  - 合同明细扩展字段
  - 加工单扩展字段

### 当前项目中的示例

- 字段注册表：`config/kgd-field-registry.example.json`
- 构造脚本：`scripts/kgd-build-field-value-list.js`
- 鉴权验证脚本：`scripts/kgd-verify.js`
- 命令行工具：`scripts/kgd-cli.js`

### 示例字段映射

- `customer_code` -> `客户代码`
- `material_code` -> `物料编码`
- `usage` -> `用料`
- `ht_drawing_no` -> `HT图号`
- `drawing_code` -> `图纸编码`
- `revision` -> `版本号`
- `coating` -> `是否涂层`

### 示例输入

```json
{
  "customer_code": "G012",
  "material_code": "TWI0",
  "usage": "-5",
  "ht_drawing_no": "G012-20260615",
  "drawing_code": "V970B1",
  "revision": "",
  "coating": "无镀层"
}
```

### 生成命令

```bash
node ./scripts/kgd-build-field-value-list.js \
  --registry ./config/kgd-field-registry.example.json \
  --input ./your-order.json \
  --object goods
```

### 生成结果示例

```json
[
  { "name": "物料编码", "value": "TWI0" },
  { "name": "用料", "value": "-5" },
  { "name": "HT图号", "value": "G012-20260615" },
  { "name": "图纸编码", "value": "V970B1" },
  { "name": "是否涂层", "value": "无镀层" }
]
```

### 使用原则

- 空值扩展字段默认跳过，不强行传空字符串
- 必填扩展字段在注册表中标记 `required=true`
- 扩展字段名必须使用快工单后台真实字段名，不能使用本地别名

### Node.js 运行建议

- 生产环境优先使用 Node.js 脚本，不依赖 PowerShell
- 鉴权验证：

```bash
node ./scripts/kgd-verify.js
```

- 推荐优先使用统一 CLI：

```bash
node ./scripts/kgd-cli.js verify
```

- 多用户场景可直接临时覆盖鉴权参数，不依赖共享 `.env`：

```bash
node ./scripts/kgd-cli.js verify \
  --username YOUR_USERNAME
```

- 建议使用方式：
  - `KGD_API_KEY`、`KGD_API_SECRET` 固定放在运行环境
  - `KGD_USERNAME` 按当前对话用户确认，必要时通过 `--username` 临时覆盖
- 全局参数优先于 `.env`：
  - `--base-url`
  - `--api-key`
  - `--api-secret`
  - `--username`

- 调用任意已知 OpenAPI：

```bash
node ./scripts/kgd-cli.js openapi:post --path /open_api/pub_craft/list --input ./payload.json --dry-run
```

- 上传附件：

```bash
node ./scripts/kgd-cli.js upload:file --file ./demo.png --dry-run
node ./scripts/kgd-cli.js upload:file --file ./demo.png
```

- 获取最新 token：

```bash
node ./scripts/kgd-cli.js token
```

- 查询商品：

```bash
node ./scripts/kgd-cli.js goods:list --keyword 石墨盘 --page 1 --page-size 20
```

- 新增商品：

```bash
node ./scripts/kgd-cli.js goods:add --input ./goods.json
```

- 编辑商品：

```bash
node ./scripts/kgd-cli.js goods:edit --input ./goods.json
```

- 查询用户：

```bash
node ./scripts/kgd-cli.js user:list --keyword 于英 --page 1 --page-size 20
```

- 查询加工单：

```bash
node ./scripts/kgd-cli.js produce-bill:list --keyword 20260305001-4 --page 1 --page-size 20
```

- 流转加工单状态：

```bash
node ./scripts/kgd-cli.js produce-bill:status --id 123456 --type 1 --dry-run
```

- 取消加工单：

```bash
node ./scripts/kgd-cli.js produce-bill:status --id 123456 --type 4 --cancel-reason 客户取消
```

- 查询生产任务：

```bash
node ./scripts/kgd-cli.js task:list --produce-bill-code 20260305001-4 --craft-name 打磨 --all
```

- 查询报工记录：

```bash
node ./scripts/kgd-cli.js report:list --produce-craft-id 23437544 --page 1 --page-size 20
```

- 查询合同：

```bash
node ./scripts/kgd-cli.js contract:list --keyword 聚力 --page 1 --page-size 20
```

- 按合同号查询：

```bash
node ./scripts/kgd-cli.js contract:list --code HT20260623001
```

- 新增合同：

```bash
node ./scripts/kgd-cli.js contract:add --input ./contract.json
```

- 编辑合同：

```bash
node ./scripts/kgd-cli.js contract:edit --input ./contract.json --dry-run
```

- 新增报工：

```bash
node ./scripts/kgd-cli.js report:add --input ./report.json
```

- 高风险写操作建议先 dry-run：

```bash
node ./scripts/kgd-cli.js report:add --input ./report.json --dry-run
```

- 这两个脚本会优先读取当前目录下的 `.env`
- 建议 Linux 环境至少具备 Node.js 18+，以便直接使用内置 `fetch`

## 常见对话模板

### 查询类

- “查一下快工单里名称包含 `xxx` 的商品/客户/供应商/工序”
- “查合同编号 `HT2025xxx` 的详情”
- “查加工单 `JGDxxxx` 和下面的生产任务”
- “查某时间段的报工记录/其他出库单/其他入库单/成品入库单”

### 新增类

- “新建商品：名称、规格、分类、单位、来源、销售价……”
- “新建工序：名称、计价方式、单价、质检要求、可报工人……”
- “新建加工单：商品、计划数、优先级、交期、备注……”
- “新建报工：任务、报工人、良品、不良品、开始结束时间……”
- “新建客户/供应商：名称、联系人、手机号、地区、地址……”
- “新建其他出库/入库/成品入库单：日期、仓库、明细……”
- “新建合同：客户、业务员、金额、预付款、交期、商品明细……”

### 变更类

- “开始/完成/取消这个加工单”
- “把这个生产任务改成暂停”
- “编辑这个商品/工序/报工/合同”

## 执行建议

- 若用户目标是“合同 + 商品明细 + 附件”，先上传附件，再组织合同请求
- 若用户目标是“入库/出库单”，先确保所有 `goods_id` 已定位完成
- 若用户目标是“报工”，优先校验任务是否存在、报工人是否存在、不良品项编码是否有效
- 若用户要求批量创建多个对象，逐个执行并逐个汇总结果，不要把多个独立业务对象强行混成一个请求
