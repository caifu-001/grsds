# 公司管理字段扩展

**时间**: 2026-07-04 16:15  
**commit**: `373fb80`

## 改动
- `index.html` — 3 处修改

### 1. 管理员公司列表 `renderAdminCompanies()`
原来只显示 公司名 + 税号 → 现在展示：
- 税号、法人、注册资金、城市、成立日期
- 经营范围（单行溢出省略）
- 状态 badge

### 2. 新建/编辑表单 `openCompanyForm()`
原来只有 2 个输入框 → 现在 8 个字段：
- 公司名称 *
- 统一社会信用代码
- 法人/联系人
- 注册资金
- 成立日期
- 城市
- 省份
- 经营范围（textarea）

弹窗加 `max-height:85vh;overflow-y:auto` 防止溢出。

### 3. 保存函数 `saveCompany()`
`payload` 新增字段：`legal_person`, `reg_capital`, `established`, `city`, `province`, `business_scope`

## 下一步
用户需要：
1. 到 Supabase SQL Editor 执行 `import_companies.sql`（加列 + 导入 1125 条数据）
2. 刷新系统，在「管理员 → 公司管理」查看
