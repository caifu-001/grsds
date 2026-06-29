function pollNotifications(){
  if(!currentUser||!currentCompanyId)return;
  if(_pollNotifTimer)return;
  _pollNotifTimer=setInterval(function(){
    if(!sb||!currentCompanyId){clearInterval(_pollNotifTimer);_pollNotifTimer=null;return}
    sb.from('notifications').select('id',{count:'exact',head:true}).eq('company_id',currentCompanyId).eq('read',false).then(function(r){
      var badge=document.getElementById('notif-badge');
      if(!badge)return;
      var c=r.count||0;
      badge.textContent=c>99?'99+':c;
      if(c>0)badge.classList.remove('hidden');
      else badge.classList.add('hidden');
    }).catch(function(e){
      if(String(e).indexOf('404')>=0||String(e).indexOf('400')>=0||String(e).indexOf('relation')>=0){
        console.debug('[通知] notifications表可能未创建，跳过轮询');
      }
    });
  },30000);
  if(sb&&currentCompanyId){
    sb.from('notifications').select('id',{count:'exact',head:true}).eq('company_id',currentCompanyId).eq('read',false).then(function(r){
      var badge=document.getElementById('notif-badge');
      if(!badge)return;
      var c=r.count||0;
      badge.textContent=c>99?'99+':c;
      if(c>0)badge.classList.remove('hidden');
      else badge.classList.add('hidden');
    }).catch(function(e){
      if(String(e).indexOf('404')>=0||String(e).indexOf('400')>=0||String(e).indexOf('relation')>=0){
        console.debug('[通知] notifications表可能未创建，跳过轮询');
      }
    });
  }
}
