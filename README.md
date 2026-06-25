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
- `kgd-cli-refactor`

当你在 OpenClaw 中让助手操作快工单相关数据时，应该优先使用 `openclaw-kuaigongdan`。

当你要做以下事情时，应该切换到 `kgd-cli-refactor`：

- 重构 `scripts/kgd-cli.js`
- 把大 `switch` 改成命令注册表
- 拆分 `scripts/commands/` 模块
- 为 CLI 重构补回归检查和维护规范

## 前置配置

建议在运行环境或本地 `.env` 中准备以下变量：

- `KGD_BASE_URL=https://api.kgd.ltd`
- `KGD_API_KEY=...`
- `KGD_API_SECRET=...`
- `KGD_USERNAME=...`

推荐约定：

- `KGD_API_KEY`、`KGD_API_SECRET` 作为企业固定配置
- `KGD_USERNAME` 作为当前会话用户配置

## 当前 CLI 能力地图

当前仓库里的 CLI 统一入口文件是 `scripts/kgd-cli.js`。

它的定位不是完整 SDK，而是：

- 高频业务提供专用命令
- 复杂或低频接口通过 `openapi:post` 补位
- 所有业务命令复用统一鉴权、错误处理和 `dry-run`

### 当前代码结构

当前 CLI 已完成模块化拆分，主要结构如下：

- `scripts/kgd-cli.js`
  - 负责参数解析、帮助输出、模块装配和命令调度
- `scripts/commands/registry.js`
  - 统一维护命令注册和 `usage` 元数据
- `scripts/commands/factories.js`
  - 提供列表命令和写命令的通用工厂
- `scripts/commands/list.js`
  - 承载列表类命令与 `task:list` 的特殊分页过滤逻辑
- `scripts/commands/write.js`
  - 承载低风险写命令
- `scripts/commands/goods.js`
  - 承载商品相关命令和 `goods:edit` 自动补全逻辑
- `scripts/commands/warehouse.js`
  - 承载其他出入库、成品入库和仓库单据归一化逻辑
- `scripts/commands/status.js`
  - 承载加工单与任务状态命令
- `scripts/commands/contract.js`
  - 承载 `contract:add` 及其金额、税务、企业信息归一化逻辑

后续新增命令时，建议同时更新：

- `scripts/commands/registry.js`
- 对应的 `scripts/commands/*.js` 模块
- `README.md` / `.trae/skills/openclaw-kuaigongdan/SKILL.md` 中的能力说明

### 平台与基础能力

- `verify`
  - 校验当前环境变量和登录流程是否可用
- `auth:test`
  - 显式测试当前用户是否能成功鉴权
- `token`
  - 获取当前会话 token
  - 默认不输出敏感值，需显式传 `--show-secrets`
- `build-fields`
  - 根据字段注册表生成 `fieldValueList`
- `openapi:post`
  - 通用 OpenAPI POST 调用器
  - 当某个业务还没封装成专用命令时，用它兜底
- `upload:file`
  - 上传附件文件到快工单

### 鉴权与运行规则

- 支持从 `.env` 读取：
  - `KGD_BASE_URL`
  - `KGD_API_KEY`
  - `KGD_API_SECRET`
  - `KGD_USERNAME`
- 支持命令行临时覆盖：
  - `--base-url`
  - `--api-key`
  - `--api-secret`
  - `--username`
- 统一鉴权流程：
  - 先获取 `access_token`
  - 再登录换取 `X-TOKEN`
- 鉴权失败时会自动重试一次
- 大部分写操作支持 `--dry-run`

### 主数据能力

- 商品
  - `goods:list`
  - `goods:add`
  - `goods:edit`
  - `goods:disable`
- 工序
  - `pub-craft:list`
  - `pub-craft:add`
  - `pub-craft:edit`
- 客户
  - `customer:list`
  - `customer:add`
- 供应商
  - `supplier:list`
  - `supplier:add`
- 用户
  - `user:list`

其中：

- `customer:add`
  - 支持参数模式直接创建
- `supplier:add`
  - 支持参数模式直接创建
- `goods:disable`
  - 本质上是对商品编辑接口做“停用包装”
- `pub-craft:add`
  - 支持参数模式和 JSON 模式
- `pub-craft:edit`
  - 支持参数模式和 JSON 模式
- `pub-craft:list`
  - 支持按关键字分页查询工序

### 生产业务能力

- 加工单
  - `produce-bill:list`
  - `produce-bill:add`
  - `produce-bill:status`
- 成品入库
  - `produce-stock-in:list`
  - `produce-stock-in:add`
- 生产任务
  - `task:list`
  - `task:status`
- 报工
  - `report:list`
  - `report:add`
  - `report:edit`

其中：

- `produce-bill:add`
  - 支持参数模式和 JSON 模式
- `produce-bill:status`
  - 支持开始、撤回、完成、取消
- `produce-stock-in:add`
  - 支持参数模式和 JSON 模式
- `produce-stock-in:list`
  - 支持按关键字分页查询成品入库单
- `task:list`
  - 会分页抓取生产任务后再做本地过滤
- `report:edit`
  - 支持参数模式
- `report:add`
  - 当前主要走 JSON 模式，适合复杂报工结构

### 库存与出入库能力

- 其他出库单
  - `else-stock-out:list`
  - `else-stock-out:add`
- 其他入库单
  - `else-stock-in:list`
  - `else-stock-in:add`

其中：

- `else-stock-out:list`
  - 支持按关键字分页查询其他出库单
- `else-stock-out:add`
  - 支持参数模式和 JSON 模式
  - 支持商品、数量、仓库、出库类型、发货人、备注等参数
- `else-stock-in:add`
  - 是当前最完整的业务专用命令之一
  - 支持商品、数量、仓库、入库类型、收货人、供应商、单价等参数
  - 支持 `--dry-run`
- `else-stock-in:list`
  - 支持按关键字分页查询其他入库单

### 合同能力

- `contract:list`
- `contract:add`
- `contract:edit`

其中：

- `contract:add`
  - 支持 JSON 模式
  - 也支持参数模式，不用手写完整 JSON
  - 会自动补齐常见隐藏字段和默认金额字段
- `contract:edit`
  - 当前主要走 JSON 模式

### 输入方式地图

当前 CLI 主要支持 4 种输入方式：

- 参数模式
  - 适合高频、固定结构业务
  - 例如 `pub-craft:add`、`pub-craft:edit`、`customer:add`、`supplier:add`、`else-stock-out:add`、`else-stock-in:add`、`produce-bill:add`、`produce-stock-in:add`、`report:edit`、`contract:add`
- `--input`
  - 从本地 JSON 文件读取 payload
- `--json`
  - 直接内联 JSON
- `openapi:post`
  - 用于未单独封装的接口

### 当前能力边界

当前 CLI 已经适合处理这些高频工作：

- 查用户、商品、客户、供应商
- 查工序、其他出库单、其他入库单、成品入库单
- 新建和维护商品、客户、供应商
- 新建和维护工序
- 建加工单、查任务、改任务状态
- 建其他出库单、其他入库单、成品入库单
- 新增和编辑报工
- 查询、新建、编辑合同
- 上传附件

当前仍建议继续补充的专用命令包括：

- `contract:edit` 参数模式
- `report:add` 参数模式
- 更多列表筛选和详情命令

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

### 创建合同

```text
帮我给平板石墨盘创建合同订单
```

建议至少确认：

- 客户
- 商品
- 数量
- 单价
- 合同总金额
- 预付款
- 是否含税
- 交期
- 业务员

当前项目里的 `contract:add` 已补充一层常用兼容处理：

- 自动补齐 `enterprise_id`
- `fieldValueList` 默认补 `[]`
- `item_list[].money` 可按 `num * unit_price` 自动计算
- `item_list[].discount` 默认补 `"10"`
- `item_list[].discount_money` 默认补 `"0"`
- `item_list[].after_discount_money` 默认按金额自动计算

现在支持两种调用方式：

- `--input` / `--json` 传完整 payload
- 直接传参数创建，不用手写 JSON

## 可直接配合脚本使用

如果 OpenClaw 需要在本地脚本层执行，也可以直接调用仓库里的 CLI：

```bash
node ./scripts/kgd-cli.js verify
```

```bash
node ./scripts/kgd-cli.js goods:list --keyword 石墨盘 --page 1 --page-size 20
```

```bash
node ./scripts/kgd-cli.js pub-craft:list --keyword 打磨 --page 1 --page-size 20
```

```bash
node ./scripts/kgd-cli.js pub-craft:add \
  --name 打磨 \
  --code GM001 \
  --need-quality 1 \
  --price-mode 1 \
  --workshop-name 包装车间 \
  --produce-line-name 石墨板加工产线
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

```bash
node ./scripts/kgd-cli.js else-stock-out:add \
  --goods-id 8253995 \
  --num 2 \
  --ware-name 成品仓 \
  --stock-type-name 普通出库 \
  --shipper-id 100753 \
  --remark 样品寄出
```

```bash
node ./scripts/kgd-cli.js produce-stock-in:add \
  --produce-bill-id 123456 \
  --num 10 \
  --ware-name 成品仓 \
  --stock-type-name 完工入库 \
  --remark 平板石墨盘完工入库
```

```bash
node ./scripts/kgd-cli.js contract:add \
  --customer-id 1544650 \
  --linkman-id 1747835 \
  --sales-user-id 144246 \
  --goods-id 8253995 \
  --num 10 \
  --unit-price 100 \
  --money 1000 \
  --advance 300 \
  --delivery-date 2026-06-30 \
  --has-tax 1 \
  --code HT20260624001 \
  --remark 平板石墨盘合同订单
```

参数模式下常用字段：

- `--customer-id`
- `--linkman-id`
- `--sales-user-id`
- `--goods-id`
- `--num`
- `--unit-price`
- `--money`
- `--advance`
- `--delivery-date`
- `--has-tax`
- `--code`
- `--remark`

## 参考资料

- [其他入库单问题总结](./docs/else-stock-in-notes.md)
- [Skill 详细说明](./.trae/skills/openclaw-kuaigongdan/SKILL.md)
