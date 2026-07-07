# 2026-07-05 supplier-modal 透明背景修复

## 问题
新建/编辑供应商弹窗透明，底层页面内容穿透可见。

## 根因
supplier-modal 通过 `document.createElement('div')` + `innerHTML` 直接注入 body，HTML 结构为裸 `<div class="modal">`，没有 `.modal-overlay` 遮罩包裹。

## 修复
将弹窗结构改为：`.modal-overlay#supplier-modal > .modal > .modal-box`

- `.modal-overlay` 自带 background:rgba(15,23,42,.45) + backdrop-filter:blur(4px)
- 外层 overlay 的 onclick 绑定 `closeSupplierForm()`，点击空白关闭
- 内层 .modal 的 onclick 绑定 `event.stopPropagation()`，防止误关

## Commit
`9a7dd90`
