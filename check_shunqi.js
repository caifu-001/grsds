const fs = require('fs');
const data = JSON.parse(fs.readFileSync('D:/1kaifa/grsds/guangzhou_shenzhen_trade_companies.json','utf8'));

// 找出地址明显不在广州/深圳的公司
const re = /青岛|义乌|东莞|佛山|上海|北京|宁波|杭州|温州|中山|惠州|珠海|福建|厦门|汕头|揭阳|潮州|湛江|茂名|清远|江门|阳江|汕尾|韶关|河源|梅州|肇庆|云浮/;
const bad = data.filter(c => re.test(c.name));
console.log('外地公司: ' + bad.length);
bad.forEach(c => console.log('  ' + c.name + ' | addr: ' + (c.address||'').slice(0,60)));

// 正确数据
const good = data.filter(c => !re.test(c.name));
const gz = good.filter(c => c.city === '广州').length;
const sz = good.filter(c => c.city === '深圳').length;
console.log('\n过滤后: ' + good.length + ' (广州:' + gz + ' 深圳:' + sz + ')');
