// 线上诊断：超管用户列表
// 请在浏览器 Console 依次执行，贴回结果

// 1. 确认 isSuperAdmin
console.log('isSuperAdmin:', isSuperAdmin);
console.log('currentUserRole:', currentUserRole);
console.log('currentCompanyId:', currentCompanyId);

// 2. 直接查 profiles（绕过 callAdmin）
sb.from('profiles').select('*').then(r => {
  console.log('direct profiles count:', r.data ? r.data.length : 0, 'error:', r.error);
  if(r.data) console.table(r.data.slice(0,5));
});

// 3. 看 adminUserList 当前值
console.log('adminUserList length:', adminUserList ? adminUserList.length : 0);

// 4. 看 callAdmin 返回
callAdmin('select','profiles',{query:'*'}).then(r => {
  console.log('callAdmin result:', r);
  console.log('data length:', r.data ? r.data.length : 0);
  console.log('error:', r.error);
});
