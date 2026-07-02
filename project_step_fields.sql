-- ============================================================
-- 项目步骤自定义字段配置
-- 每个步骤可以自定义表单字段
-- ============================================================

-- 1. 步骤字段定义表
CREATE TABLE IF NOT EXISTS project_step_fields (
  id BIGSERIAL PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,                    -- 如 'step_0'
  field_key TEXT NOT NULL,                   -- 字段标识，如 'budget', 'competitor'
  field_label TEXT NOT NULL,                 -- 显示名称，如 '客户预算'
  field_type TEXT DEFAULT 'text'             -- 字段类型
    CHECK (field_type IN ('text','textarea','number','date','select','multiselect','checkbox','radio','file')),
  field_options JSONB,                       -- 选项（select/radio/multiselect用）
  placeholder TEXT,                          -- 占位提示
  is_required BOOLEAN DEFAULT false,         -- 是否必填
  sort_order INTEGER DEFAULT 0,              -- 排序
  default_value TEXT,                        -- 默认值
  validation_rules JSONB,                    -- 验证规则（如 min/max/pattern）
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, step_key, field_key)
);

CREATE INDEX IF NOT EXISTS idx_psf_project ON project_step_fields(project_id);
CREATE INDEX IF NOT EXISTS idx_psf_step ON project_step_fields(step_key);

COMMENT ON TABLE project_step_fields IS '项目各步骤的自定义字段配置';

-- 2. 步骤字段数据存储表（实际填写的数据）
CREATE TABLE IF NOT EXISTS project_step_field_values (
  id BIGSERIAL PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_value TEXT,                          -- 存储为文本，根据类型解析
  field_value_json JSONB,                    -- 复杂类型存储（如多选、文件）
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, step_key, field_key)
);

CREATE INDEX IF NOT EXISTS idx_psfv_project ON project_step_field_values(project_id);
CREATE INDEX IF NOT EXISTS idx_psfv_step ON project_step_field_values(step_key);

COMMENT ON TABLE project_step_field_values IS '项目步骤字段的实际填写数据';

-- 3. RLS 策略
ALTER TABLE project_step_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_step_field_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS psf_select ON project_step_fields;
CREATE POLICY psf_select ON project_step_fields FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_step_fields.project_id
          AND p.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS psf_modify ON project_step_fields;
CREATE POLICY psf_modify ON project_step_fields FOR ALL USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_step_fields.project_id
          AND (p.owner_id = auth.uid()
               OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin','super_admin'))))
);

DROP POLICY IF EXISTS psfv_select ON project_step_field_values;
CREATE POLICY psfv_select ON project_step_field_values FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_step_field_values.project_id
          AND p.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS psfv_modify ON project_step_field_values;
CREATE POLICY psfv_modify ON project_step_field_values FOR ALL USING (
  EXISTS (SELECT 1 FROM project_assignments pa
          WHERE pa.project_id = project_step_field_values.project_id
          AND pa.user_id = auth.uid()
          AND pa.project_role IN ('edit','approve'))
);

-- 4. 从模板初始化默认字段的函数
CREATE OR REPLACE FUNCTION init_project_step_fields_from_template()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_template_id BIGINT;
  v_steps JSONB;
  v_step JSONB;
  v_step_key TEXT;
  v_panel TEXT;
  v_default_fields JSONB;
BEGIN
  -- 获取项目使用的模板
  SELECT template_id INTO v_template_id
  FROM projects WHERE id = NEW.project_id;
  
  IF v_template_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- 获取模板步骤
  SELECT steps INTO v_steps
  FROM workflow_templates WHERE id = v_template_id;
  
  IF v_steps IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- 为每个步骤创建默认字段
  FOR i IN 0..jsonb_array_length(v_steps)-1 LOOP
    v_step := v_steps->i;
    v_step_key := 'step_' || i;
    v_panel := v_step->>'panel';
    
    -- 根据 panel 类型设置默认字段
    v_default_fields := CASE v_panel
      WHEN 'analysis' THEN '[
        {"key":"budget","label":"客户预算","type":"text","placeholder":"如：100-200万"},
        {"key":"competitor_threat","label":"竞品威胁","type":"select","options":["高","中","低"]},
        {"key":"start_date","label":"预计开始","type":"date"},
        {"key":"end_date","label":"预计结束","type":"date"},
        {"key":"tech_eval","label":"技术评估","type":"textarea","placeholder":"技术难点、风险评估..."}
      ]'::JSONB
      WHEN 'competitor' THEN '[
        {"key":"competitor_list","label":"竞争对手名单","type":"textarea","placeholder":"列出主要竞争对手..."},
        {"key":"competitor_analysis","label":"竞争分析","type":"textarea","placeholder":"竞争优势劣势分析..."}
      ]'::JSONB
      WHEN 'communication' THEN '[
        {"key":"comm_purpose","label":"沟通目的","type":"text"},
        {"key":"comm_content","label":"沟通内容","type":"textarea"},
        {"key":"follow_up","label":"后续行动","type":"textarea"}
      ]'::JSONB
      WHEN 'bidding' THEN '[
        {"key":"bid_amount","label":"投标金额","type":"number","placeholder":"万元"},
        {"key":"bid_deadline","label":"投标截止日期","type":"date"},
        {"key":"bid_doc_status","label":"标书编制状态","type":"select","options":["未开始","进行中","已完成"]}
      ]'::JSONB
      WHEN 'contract' THEN '[
        {"key":"contract_amount","label":"合同金额","type":"number","placeholder":"万元"},
        {"key":"contract_terms","label":"付款条款","type":"textarea"},
        {"key":"contract_status","label":"合同状态","type":"select","options":["起草中","审核中","已签署"]}
      ]'::JSONB
      WHEN 'delivery' THEN '[
        {"key":"delivery_plan","label":"交付计划","type":"textarea"},
        {"key":"delivery_progress","label":"交付进度","type":"select","options":["未开始","进行中","已完成"]},
        {"key":"acceptance_status","label":"验收状态","type":"select","options":["待验收","验收中","已验收"]}
      ]'::JSONB
      ELSE '[
        {"key":"notes","label":"备注","type":"textarea","placeholder":"填写相关内容..."}
      ]'::JSONB
    END;
    
    -- 插入默认字段
    FOR j IN 0..COALESCE(jsonb_array_length(v_default_fields)-1, -1) LOOP
      INSERT INTO project_step_fields (
        project_id, step_key, field_key, field_label, field_type,
        field_options, placeholder, is_required, sort_order
      ) VALUES (
        NEW.project_id, v_step_key,
        v_default_fields->j->>'key',
        v_default_fields->j->>'label',
        COALESCE(v_default_fields->j->>'type', 'text'),
        v_default_fields->j->'options',
        v_default_fields->j->>'placeholder',
        COALESCE((v_default_fields->j->>'required')::BOOLEAN, false),
        j
      )
      ON CONFLICT (project_id, step_key, field_key) DO NOTHING;
    END LOOP;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- 创建触发器
DROP TRIGGER IF EXISTS tr_init_step_fields ON projects;
CREATE TRIGGER tr_init_step_fields
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION init_project_step_fields_from_template();

-- 5. 为现有项目初始化字段
INSERT INTO project_step_fields (project_id, step_key, field_key, field_label, field_type, placeholder, sort_order)
SELECT 
  p.id AS project_id,
  'step_' || i AS step_key,
  'notes' AS field_key,
  '备注' AS field_label,
  'textarea' AS field_type,
  '填写相关内容...' AS placeholder,
  0 AS sort_order
FROM projects p
JOIN workflow_templates t ON t.id = p.template_id
CROSS JOIN generate_series(0, COALESCE(jsonb_array_length(t.steps)-1, 0)) AS i
WHERE t.steps IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM project_step_fields psf 
    WHERE psf.project_id = p.id AND psf.step_key = 'step_' || i
  )
ON CONFLICT (project_id, step_key, field_key) DO NOTHING;

SELECT '步骤自定义字段表已创建' AS result;
