-- workflow_templates: 流程模板（精简版，不依赖 profiles 列名）
DROP TABLE IF EXISTS workflow_templates CASCADE;

CREATE TABLE workflow_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  company_id INTEGER,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 先不加 RLS，模板表所有人可读，仅服务端 API 可写
-- ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;

-- projects 加 template_id
ALTER TABLE projects DROP COLUMN IF EXISTS template_id;
ALTER TABLE projects ADD COLUMN template_id INTEGER;

-- 插入默认 46 步模板
INSERT INTO workflow_templates (name, description, steps) VALUES (
  '标准销售流程',
  '46步全流程销售模板，覆盖线索→商机→分析策略→内部赋能→方案交流→招投标→合同签订→交付→开票回款',
  '[
    {"seq":1,"phase":"线索","key":"gather","name":"搜集线索","icon":"🔍"},
    {"seq":2,"phase":"商机","key":"analyze","name":"分析与验证","icon":"💡"},
    {"seq":3,"phase":"分析与策略","key":"competitors","name":"获取竞争对手名单","icon":"📋","panel":"competitor","tip":"从客户库搜索添加"},
    {"seq":4,"phase":"分析与策略","key":"compete_analysis","name":"竞争与分析","icon":"📊","panel":"competitor","tip":"填写竞争分析笔记"},
    {"seq":5,"phase":"分析与策略","key":"decision_join","name":"参与决策","icon":"🚦","decision":true,"decisionAsk":"是否参与决策？","decisionYes":"6","decisionNo":"46"},
    {"seq":6,"phase":"内部赋能","key":"training","name":"学习培训","icon":"📚","panel":"training","tip":"培训管理与记录"},
    {"seq":7,"phase":"内部赋能","key":"product_training","name":"产品培训","icon":"🎓","panel":"training"},
    {"seq":8,"phase":"内部赋能","key":"solution_training","name":"方案培训","icon":"📝","panel":"training"},
    {"seq":9,"phase":"内部赋能","key":"training_check","name":"培训考核","icon":"✅","decision":true,"decisionAsk":"培训是否通过？","decisionYes":"10","decisionNo":"6"},
    {"seq":10,"phase":"方案交流","key":"first_contact","name":"初次接洽","icon":"🤝","panel":"communication"},
    {"seq":11,"phase":"方案交流","key":"need_mining","name":"需求挖掘","icon":"⛏️","panel":"communication"},
    {"seq":12,"phase":"方案交流","key":"tech_exchange","name":"技术交流","icon":"🔬","panel":"communication"},
    {"seq":13,"phase":"方案交流","key":"solution_design","name":"方案设计","icon":"📐","panel":"communication"},
    {"seq":14,"phase":"方案交流","key":"solution_review","name":"方案评审","icon":"👀","panel":"communication"},
    {"seq":15,"phase":"方案交流","key":"solution_present","name":"方案汇报","icon":"🎤","panel":"communication"},
    {"seq":16,"phase":"方案交流","key":"solution_confirm","name":"方案确认","icon":"✔️","panel":"communication"},
    {"seq":17,"phase":"招投标","key":"bid_check","name":"投标资格确认","icon":"🔖","panel":"bidding"},
    {"seq":18,"phase":"招投标","key":"bid_doc_buy","name":"购买标书","icon":"💰","panel":"bidding"},
    {"seq":19,"phase":"招投标","key":"bid_prepare","name":"标书编制","icon":"📄","panel":"bidding"},
    {"seq":20,"phase":"招投标","key":"bid_review","name":"标书审核","icon":"🔍","panel":"bidding"},
    {"seq":21,"phase":"招投标","key":"bid_seal","name":"封装盖章","icon":"🖊️","panel":"bidding"},
    {"seq":22,"phase":"招投标","key":"bid_submit","name":"投标","icon":"📬","panel":"bidding"},
    {"seq":23,"phase":"招投标","key":"bid_open","name":"开标","icon":"🎯","panel":"bidding"},
    {"seq":24,"phase":"招投标","key":"bid_eval","name":"评标","icon":"⚖️","panel":"bidding"},
    {"seq":25,"phase":"招投标","key":"bid_result","name":"中标通知","icon":"🏆","panel":"bidding"},
    {"seq":26,"phase":"招投标","key":"bid_fail","name":"未中标处理","icon":"🔄","panel":"bidding"},
    {"seq":27,"phase":"合同签订","key":"contract_prepare","name":"合同准备","icon":"📋","panel":"contract","decision":true,"decisionAsk":"是否有提前施工函？","decisionYes":"42","decisionNo":"28"},
    {"seq":28,"phase":"合同签订","key":"contract_draft","name":"合同草拟","icon":"✍️","panel":"contract"},
    {"seq":29,"phase":"合同签订","key":"contract_price","name":"价格谈判","icon":"💬","panel":"contract"},
    {"seq":30,"phase":"合同签订","key":"contract_terms","name":"条款谈判","icon":"📑","panel":"contract"},
    {"seq":31,"phase":"合同签订","key":"contract_tech","name":"技术协议","icon":"🔧","panel":"contract"},
    {"seq":32,"phase":"合同签订","key":"contract_dept","name":"部门会签","icon":"👥","panel":"contract"},
    {"seq":33,"phase":"合同签订","key":"contract_legal","name":"法务审核","icon":"⚖️","panel":"contract"},
    {"seq":34,"phase":"合同签订","key":"contract_finance","name":"财务审核","icon":"💵","panel":"contract"},
    {"seq":35,"phase":"合同签订","key":"contract_final","name":"终稿确认","icon":"✅","panel":"contract"},
    {"seq":36,"phase":"合同签订","key":"contract_ceo","name":"总经理审批","icon":"👤","panel":"contract"},
    {"seq":37,"phase":"合同签订","key":"contract_sign","name":"合同签署","icon":"🖋️","panel":"contract"},
    {"seq":38,"phase":"合同签订","key":"contract_seal","name":"盖章","icon":"🔴","panel":"contract"},
    {"seq":39,"phase":"合同签订","key":"contract_archive","name":"合同归档","icon":"📁","panel":"contract"},
    {"seq":40,"phase":"合同签订","key":"contract_legal2","name":"法务审核","icon":"⚖️","panel":"contract"},
    {"seq":41,"phase":"合同签订","key":"sign_seal","name":"签章","icon":"🖊️","panel":"contract"},
    {"seq":42,"phase":"交付","key":"schedule_ctrl","name":"工期把控","icon":"⏱️","panel":"delivery"},
    {"seq":43,"phase":"交付","key":"eng_docs","name":"工程文档","icon":"📁","panel":"delivery"},
    {"seq":44,"phase":"交付","key":"sign_material","name":"签收材料","icon":"📦","panel":"delivery"},
    {"seq":45,"phase":"开票回款","key":"invoice_collect","name":"开票回款","icon":"💵","panel":"payment"},
    {"seq":46,"phase":"结束","key":"end","name":"结束","icon":"⏹️","end":true}
  ]'::jsonb
);
