# 修复面板类型/审批/负责人设置点击无响应

**问题**：`wfSetProp` 修改字段（如 select）后**没有重渲染右侧属性面板**，只重绘了画布。
- 用户选 select → 数据改了、画布更新了 → 但右侧 select 还显示旧值 → 以为"点不动"
- 审批/负责人的 `wfSetApproval`/`wfSetAssignee` 走的是另一个调用链，会调 `wfShowProps` → 它们**应该**工作；但面板类型的问题让用户怀疑整个编辑区都坏了

**根因**（`index.html` `wfSetProp`）：
```js
function wfSetProp(idx,key,value){
  if(idx<0||idx>=wfEditorSteps.length)return;
  wfEditorSteps[idx][key]=value;
  wfRenderAll();
  if(key==='seq')wfShowProps(idx);  // ← 只在改 seq 时重渲染
}
```

**修复**：
```js
function wfSetProp(idx,key,value){
  try{
    if(!wfEditorSteps||idx<0||idx>=wfEditorSteps.length)return;
    wfEditorSteps[idx][key]=value;
    wfRenderAll();
    wfShowProps(idx);  // ← 始终重渲染
  }catch(e){console.error('[wfSetProp]',e)}
}
```

顺手加固：
- `wfSetApproval` / `wfSetAssignee` 加 try/catch 防止异常吞掉 onchange
- 加全局 error/unhandledrejection 监听器，console 能直接看到错误
- 加 `window.__wfDiag` 开关 + workflow 渲染日志（控制台 `__wfDiag=false` 可关闭）

**部署**：commit `254a1b4` 已推送，GitHub Pages 已更新（Last-Modified 06:05 GMT+8）。

**测试步骤**（清缓存）：
1. 浏览器开 https://caifu-001.github.io/grsds/ 强刷（Ctrl+Shift+R）
2. 登录 → 流程模板 → 编辑任一模板
3. 选中任一节点 → 改面板类型 select → 应即时回显
4. 点"审批设置" header → 应展开/收起
5. F12 console 看到的 `[wfShowProps]` 日志是诊断用的，控制台敲 `__wfDiag=false` 即可关闭
