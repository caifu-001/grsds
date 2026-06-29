#!/usr/bin/env python3
"""
Comprehensive patch script to add 11 enhanced workbench panels to index.html.
Backs up the original, makes all edits, and verifies syntax.
"""
import re, sys, os, shutil

INDEX = r"D:\1kaifa\grsds\index.html"
BAK = INDEX + ".bak2"

# Backup
shutil.copy2(INDEX, BAK)
print(f"Backed up to {BAK}")

with open(INDEX, 'r', encoding='utf-8') as f:
    content = f.read()

#==========================================================
# PART 1: Update WORKFLOW_STEPS panel fields
#==========================================================

# Step 1: seq:1 - add panel
content = content.replace(
    "{seq:1,phase:'线索',key:'gather',name:'搜集线索',icon:'🔍'}",
    "{seq:1,phase:'线索',key:'gather',name:'搜集线索',icon:'🔍',panel:'lead_gathering'}"
)

# Step 2: seq:2 - add panel
content = content.replace(
    "{seq:2,phase:'商机',key:'analyze',name:'分析与验证',icon:'💡'}",
    "{seq:2,phase:'商机',key:'analyze',name:'分析与验证',icon:'💡',panel:'analysis'}"
)

# Step 7: seq:7 - add panel
content = content.replace(
    "{seq:7,phase:'内部赋能',key:'vendor_compare',name:'厂家比较',icon:'🔄'}",
    "{seq:7,phase:'内部赋能',key:'vendor_compare',name:'厂家比较',icon:'🔄',panel:'vendor_compare'}"
)

# Step 8: seq:8 - add panel
content = content.replace(
    "{seq:8,phase:'初步方案定制',key:'client_comm',name:'客户交流方案',icon:'💬'}",
    "{seq:8,phase:'初步方案定制',key:'client_comm',name:'客户交流方案',icon:'💬',panel:'client_comm'}"
)

# Step 10: seq:10 panel:'basic' -> panel:'company_intro'
content = content.replace(
    "{seq:10,phase:'项目运作',key:'company_intro',name:'公司介绍交流方案',icon:'🏢',panel:'basic'}",
    "{seq:10,phase:'项目运作',key:'company_intro',name:'公司介绍交流方案',icon:'🏢',panel:'company_intro'}"
)

# Step 11: seq:11 panel:'basic' -> panel:'needs'
content = content.replace(
    "{seq:11,phase:'项目运作',key:'detailed_needs',name:'获取客户详细需求',icon:'📝',panel:'basic'}",
    "{seq:11,phase:'项目运作',key:'detailed_needs',name:'获取客户详细需求',icon:'📝',panel:'needs'}"
)

# Step 12: seq:12 - add panel
content = content.replace(
    "{seq:12,phase:'项目运作',key:'brand_reg',name:'品牌报备',icon:'🏷️'}",
    "{seq:12,phase:'项目运作',key:'brand_reg',name:'品牌报备',icon:'🏷️',panel:'brand_reg'}"
)

# Step 13: seq:13 - add panel
content = content.replace(
    "{seq:13,phase:'项目运作',key:'detailed_plan',name:'详细方案',icon:'📐'}",
    "{seq:13,phase:'项目运作',key:'detailed_plan',name:'详细方案',icon:'📐',panel:'detailed_plan'}"
)

# Step 14: seq:14 - add panel
content = content.replace(
    "{seq:14,phase:'项目运作',key:'config_quote',name:'配置报价',icon:'💰'}",
    "{seq:14,phase:'项目运作',key:'config_quote',name:'配置报价',icon:'💰',panel:'quote'}"
)

# Step 17: seq:17 - add panel
content = content.replace(
    "{seq:17,phase:'项目运作',key:'retrospect',name:'总结复盘',icon:'🔄'}",
    "{seq:17,phase:'项目运作',key:'retrospect',name:'总结复盘',icon:'🔄',panel:'retrospect'}"
)

# Step 18: seq:18 - add panel
content = content.replace(
    "{seq:18,phase:'项目运作',key:'plan_optimize',name:'方案优化调整',icon:'🔧'}",
    "{seq:18,phase:'项目运作',key:'plan_optimize',name:'方案优化调整',icon:'🔧',panel:'optimize'}"
)

print("PART 1: WORKFLOW_STEPS panel fields updated ✓")

#==========================================================
# PART 2: Add new HTML panel divs
# Insert before </div><!-- /wb-right -->
#==========================================================

new_panels_html = r'''
    <!-- ── Step 1: Lead Gathering ── -->
    <div id="wb-panel-lead_gathering" class="hidden" style="max-width:700px">
     <h3 style="margin:0 0 4px">🔍 搜集线索</h3>
     <p style="font-size:12px;color:var(--text3);margin:0 0 12px">搜索并关联线索到当前项目</p>
     <div style="display:flex;gap:8px;margin-bottom:4px;position:relative">
      <input id="wb-lead-search" placeholder="搜索线索（公司名/联系人/关键词）..." autocomplete="off" oninput="onLeadSearchInput()" onkeydown="onLeadSearchKey(event)" style="flex:1;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)">
      <div class="name-suggestions hidden" id="wb-lead-suggestions" style="position:absolute;top:42px;left:0;right:0;z-index:50"></div>
     </div>
     <div id="wb-lead-cards" style="display:flex;flex-direction:column;gap:6px;margin:0 0 12px"></div>
     <div style="text-align:center;padding:20px;color:var(--text2)">
      <button class="btn-sm" style="background:var(--bg);border:1px solid var(--border);color:var(--text2);padding:6px 14px;border-radius:8px;cursor:pointer;font-size:14px" onclick="saveLeadGathering()">💾 保存</button>
     </div>
    </div>

    <!-- ── Step 2: Analysis ── -->
    <div id="wb-panel-analysis" class="hidden" style="max-width:700px">
     <h3 style="margin:0 0 4px">💡 分析与验证</h3>
     <p style="font-size:12px;color:var(--text3);margin:0 0 12px">填写客户分析与可行性评估</p>
     <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
       <div><label style="font-size:11px;color:var(--text3)">客户预算范围</label><input id="wb-analysis-budget" placeholder="例如：100-200万" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)"></div>
       <div><label style="font-size:11px;color:var(--text3)">竞品威胁等级</label>
        <select id="wb-analysis-threat" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)">
         <option value="">-- 选择 --</option><option value="high">🔴 高</option><option value="medium">🟡 中</option><option value="low">🟢 低</option></select>
       </div>
       <div><label style="font-size:11px;color:var(--text3)">预计开始日期</label><input type="date" id="wb-analysis-start" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)"></div>
       <div><label style="font-size:11px;color:var(--text3)">预计结束日期</label><input type="date" id="wb-analysis-end" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)"></div>
      </div>
      <label style="font-size:11px;color:var(--text3)">技术可行性评估</label>
      <textarea id="wb-analysis-tech" rows="3" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text);margin-top:4px" placeholder="技术难点、资源需求、风险评估..."></textarea>
      <button class="btn-save" style="margin-top:8px" onclick="saveAnalysis()">💾 保存</button>
     </div>
    </div>

    <!-- ── Step 7: Vendor Compare ── -->
    <div id="wb-panel-vendor_compare" class="hidden" style="max-width:700px">
     <h3 style="margin:0 0 4px">🔄 厂家比较</h3>
     <p style="font-size:12px;color:var(--text3);margin:0 0 12px">添加并比较多个厂家的产品方案</p>
     <div id="wb-vc-list" style="display:flex;flex-direction:column;gap:10px;margin-bottom:12px"></div>
     <div style="text-align:center;margin-bottom:16px">
      <button class="btn-sm" style="background:var(--bg);border:1px dashed var(--border);color:var(--primary);padding:8px 20px;border-radius:8px;cursor:pointer;font-size:14px" onclick="addVendorRow()">+ 添加工厂家</button>
     </div>
     <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:12px">
      <label style="font-size:12px;font-weight:600">比较总结</label>
      <textarea id="wb-vc-summary" rows="3" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text);margin-top:8px" placeholder="综合比较结论..."></textarea>
     </div>
     <button class="btn-save" onclick="saveVendorCompare()">💾 保存厂家比较</button>
    </div>

    <!-- ── Step 8: Client Communication ── -->
    <div id="wb-panel-client_comm" class="hidden" style="max-width:700px">
     <h3 style="margin:0 0 4px">💬 客户交流方案</h3>
     <p style="font-size:12px;color:var(--text3);margin:0 0 12px">记录客户交流计划与反馈</p>
     <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
       <div><label style="font-size:11px;color:var(--text3)">交流日期</label><input type="date" id="wb-cc-date" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)"></div>
       <div><label style="font-size:11px;color:var(--text3)">交流主题</label><input id="wb-cc-topic" placeholder="交流主题" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
       <div><label style="font-size:11px;color:var(--text3)">我方参与人员</label><input id="wb-cc-our-side" placeholder="姓名，多人逗号分隔" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)"></div>
       <div><label style="font-size:11px;color:var(--text3)">客户方参与人员</label><input id="wb-cc-client-side" placeholder="姓名/职位" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)"></div>
      </div>
      <label style="font-size:11px;color:var(--text3)">客户反馈</label>
      <textarea id="wb-cc-feedback" rows="2" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text);margin-top:4px;margin-bottom:8px" placeholder="客户反馈意见..."></textarea>
      <label style="font-size:11px;color:var(--text3)">后续计划</label>
      <textarea id="wb-cc-next" rows="2" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text);margin-top:4px" placeholder="下一步行动计划..."></textarea>
      <button class="btn-save" style="margin-top:8px" onclick="saveClientComm()">💾 保存</button>
     </div>
    </div>

    <!-- ── Step 10: Company Intro ── -->
    <div id="wb-panel-company_intro" class="hidden" style="max-width:700px">
     <h3 style="margin:0 0 4px">🏢 公司介绍交流方案</h3>
     <p style="font-size:12px;color:var(--text3);margin:0 0 12px">管理公司介绍资料与交流记录</p>
     <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:16px">
      <div style="margin-bottom:12px">
       <label style="font-size:11px;color:var(--text3)">介绍材料链接</label>
       <input id="wb-ci-material" placeholder="上传链接或本地路径" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)">
      </div>
      <label style="font-size:11px;color:var(--text3)">交流记录</label>
      <textarea id="wb-ci-record" rows="3" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text);margin-top:4px;margin-bottom:8px" placeholder="交流内容记录..."></textarea>
      <label style="font-size:11px;color:var(--text3)">客户兴趣点</label>
      <textarea id="wb-ci-interest" rows="2" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text);margin-top:4px" placeholder="客户关注的要点..."></textarea>
      <button class="btn-save" style="margin-top:8px" onclick="saveCompanyIntro()">💾 保存</button>
     </div>
    </div>

    <!-- ── Step 11: Needs Assessment ── -->
    <div id="wb-panel-needs" class="hidden" style="max-width:700px">
     <h3 style="margin:0 0 4px">📝 获取客户详细需求</h3>
     <p style="font-size:12px;color:var(--text3);margin:0 0 12px">记录和分析客户需求</p>
     <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
       <div><label style="font-size:11px;color:var(--text3)">需求分类</label>
        <select id="wb-needs-category" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)">
         <option value="">-- 选择 --</option><option value="hardware">硬件</option><option value="software">软件</option><option value="service">服务</option><option value="integration">集成</option></select>
       </div>
       <div><label style="font-size:11px;color:var(--text3)">优先级</label>
        <select id="wb-needs-priority" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)">
         <option value="">-- 选择 --</option><option value="high">🔴 高</option><option value="medium">🟡 中</option><option value="low">🟢 低</option></select>
       </div>
       <div><label style="font-size:11px;color:var(--text3)">预算范围</label><input id="wb-needs-budget" placeholder="例如：50-80万" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)"></div>
       <div><label style="font-size:11px;color:var(--text3)">需求来源</label>
        <select id="wb-needs-source" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)">
         <option value="">-- 选择 --</option><option value="client_explicit">客户明确提出</option><option value="our_suggestion">我方建议</option></select>
       </div>
      </div>
      <label style="font-size:11px;color:var(--text3)">需求详细描述</label>
      <textarea id="wb-needs-desc" rows="4" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text);margin-top:4px" placeholder="详细描述客户需求..."></textarea>
      <button class="btn-save" style="margin-top:8px" onclick="saveNeeds()">💾 保存</button>
     </div>
    </div>

    <!-- ── Step 12: Brand Registration ── -->
    <div id="wb-panel-brand_reg" class="hidden" style="max-width:700px">
     <h3 style="margin:0 0 4px">🏷️ 品牌报备</h3>
     <p style="font-size:12px;color:var(--text3);margin:0 0 12px">填写品牌报备信息</p>
     <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
       <div><label style="font-size:11px;color:var(--text3)">品牌名称</label><input id="wb-br-brand" placeholder="品牌名称" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)"></div>
       <div><label style="font-size:11px;color:var(--text3)">产品线</label><input id="wb-br-product" placeholder="产品线" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)"></div>
       <div><label style="font-size:11px;color:var(--text3)">报备编号</label><input id="wb-br-code" placeholder="报备编号" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)"></div>
       <div><label style="font-size:11px;color:var(--text3)">报备日期</label><input type="date" id="wb-br-date" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)"></div>
       <div><label style="font-size:11px;color:var(--text3)">报备状态</label>
        <select id="wb-br-status" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)">
         <option value="">-- 选择 --</option><option value="pending">待审核</option><option value="approved">✅ 已通过</option><option value="rejected">❌ 已驳回</option></select>
       </div>
      </div>
      <label style="font-size:11px;color:var(--text3)">备注</label>
      <textarea id="wb-br-note" rows="2" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text);margin-top:4px" placeholder="备注信息..."></textarea>
      <button class="btn-save" style="margin-top:8px" onclick="saveBrandReg()">💾 保存</button>
     </div>
    </div>

    <!-- ── Step 13: Detailed Plan ── -->
    <div id="wb-panel-detailed_plan" class="hidden" style="max-width:700px">
     <h3 style="margin:0 0 4px">📐 详细方案</h3>
     <p style="font-size:12px;color:var(--text3);margin:0 0 12px">编写详细技术方案</p>
     <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:16px">
      <label style="font-size:11px;color:var(--text3)">方案概述</label>
      <textarea id="wb-dp-overview" rows="3" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text);margin-top:4px;margin-bottom:12px" placeholder="方案整体概述..."></textarea>
      <label style="font-size:11px;color:var(--text3)">技术架构</label>
      <textarea id="wb-dp-architecture" rows="3" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text);margin-top:4px;margin-bottom:12px" placeholder="技术架构描述..."></textarea>
      <label style="font-size:11px;color:var(--text3)">实施计划</label>
      <textarea id="wb-dp-plan" rows="3" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text);margin-top:4px;margin-bottom:12px" placeholder="实施步骤和时间安排..."></textarea>
      <label style="font-size:11px;color:var(--text3)">附件链接</label>
      <input id="wb-dp-attachment" placeholder="方案文件链接" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)">
      <button class="btn-save" style="margin-top:8px" onclick="saveDetailedPlan()">💾 保存</button>
     </div>
    </div>

    <!-- ── Step 14: Quote ── -->
    <div id="wb-panel-quote" class="hidden" style="max-width:700px">
     <h3 style="margin:0 0 4px">💰 配置报价</h3>
     <p style="font-size:12px;color:var(--text3);margin:0 0 12px">添加产品配置并计算报价</p>
     <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:16px">
      <div style="overflow-x:auto">
       <table style="width:100%;border-collapse:collapse;margin-bottom:12px;font-size:13px" id="wb-quote-table">
        <thead>
         <tr style="background:var(--bg2);text-align:left">
          <th style="padding:8px;border-bottom:2px solid var(--border)">产品名称</th>
          <th style="padding:8px;border-bottom:2px solid var(--border)">规格</th>
          <th style="padding:8px;border-bottom:2px solid var(--border);width:60px">数量</th>
          <th style="padding:8px;border-bottom:2px solid var(--border);width:100px">单价(元)</th>
          <th style="padding:8px;border-bottom:2px solid var(--border);width:100px">小计</th>
          <th style="padding:8px;border-bottom:2px solid var(--border);width:40px"></th>
         </tr>
        </thead>
        <tbody id="wb-quote-body"></tbody>
       </table>
      </div>
      <div style="text-align:center;margin-bottom:12px">
       <button class="btn-sm" style="background:var(--bg);border:1px dashed var(--border);color:var(--primary);padding:6px 18px;border-radius:8px;cursor:pointer;font-size:13px" onclick="addQuoteRow()">+ 添加产品</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:8px">
       <div><label style="font-size:11px;color:var(--text3)">小计</label><div style="font-weight:700;font-size:16px" id="wb-quote-subtotal">¥0.00</div></div>
       <div><label style="font-size:11px;color:var(--text3)">折扣率 (%)</label><input id="wb-quote-discount" type="number" min="0" max="100" value="100" oninput="calcQuoteTotal()" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)"></div>
      </div>
      <div style="margin-bottom:12px">
       <label style="font-size:11px;color:var(--text3)">最终报价</label>
       <div style="font-weight:700;font-size:22px;color:#10B981" id="wb-quote-total">¥0.00</div>
      </div>
      <button class="btn-save" onclick="saveQuote()">💾 保存报价</button>
     </div>
    </div>

    <!-- ── Step 17: Retrospect ── -->
    <div id="wb-panel-retrospect" class="hidden" style="max-width:700px">
     <h3 style="margin:0 0 4px">🔄 总结复盘</h3>
     <p style="font-size:12px;color:var(--text3);margin:0 0 12px">总结项目经验与教训</p>
     <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:16px">
      <label style="font-size:11px;color:var(--text3)">项目亮点</label>
      <textarea id="wb-retro-highlights" rows="3" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text);margin-top:4px;margin-bottom:12px" placeholder="项目成功之处、亮点..."></textarea>
      <label style="font-size:11px;color:var(--text3)">问题与教训</label>
      <textarea id="wb-retro-issues" rows="3" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text);margin-top:4px;margin-bottom:12px" placeholder="遇到的问题和经验教训..."></textarea>
      <label style="font-size:11px;color:var(--text3)">改进措施</label>
      <textarea id="wb-retro-improvements" rows="3" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text);margin-top:4px;margin-bottom:12px" placeholder="后续改进措施..."></textarea>
      <div style="margin-bottom:12px">
       <label style="font-size:11px;color:var(--text3)">评分 (1-5)</label>
       <div style="display:flex;gap:8px;margin-top:4px">
        <input type="range" id="wb-retro-rating" min="1" max="5" value="3" style="flex:1" oninput="document.getElementById('wb-retro-rating-val').textContent=this.value">
        <span style="font-weight:700;font-size:18px;min-width:20px;text-align:right" id="wb-retro-rating-val">3</span>
       </div>
      </div>
      <button class="btn-save" onclick="saveRetrospect()">💾 保存</button>
     </div>
    </div>

    <!-- ── Step 18: Optimize ── -->
    <div id="wb-panel-optimize" class="hidden" style="max-width:700px">
     <h3 style="margin:0 0 4px">🔧 方案优化调整</h3>
     <p style="font-size:12px;color:var(--text3);margin:0 0 12px">记录方案优化调整内容</p>
     <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:16px">
      <label style="font-size:11px;color:var(--text3)">优化前方案简述</label>
      <textarea id="wb-opt-before" rows="2" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text);margin-top:4px;margin-bottom:12px" placeholder="优化前的方案..."></textarea>
      <label style="font-size:11px;color:var(--text3)">优化内容</label>
      <textarea id="wb-opt-content" rows="3" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text);margin-top:4px;margin-bottom:12px" placeholder="优化调整的具体内容..."></textarea>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
       <div><label style="font-size:11px;color:var(--text3)">预期效果</label><input id="wb-opt-effect" placeholder="优化预期效果" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)"></div>
       <div><label style="font-size:11px;color:var(--text3)">审批状态</label>
        <select id="wb-opt-approval" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card-bg);color:var(--text)">
         <option value="">-- 选择 --</option><option value="pending">待审批</option><option value="approved">✅ 已通过</option><option value="rejected">❌ 已驳回</option></select>
       </div>
      </div>
      <button class="btn-save" onclick="saveOptimize()">💾 保存</button>
     </div>
    </div>

'''

# Insert new panels before </div><!-- /wb-right -->
insertion_marker = '   </div><!-- /wb-right -->'
if insertion_marker in content:
    content = content.replace(insertion_marker, new_panels_html + '\n' + insertion_marker)
    print("PART 2: New HTML panels inserted ✓")
else:
    print("ERROR: Could not find /wb-right marker!")
    sys.exit(1)

#==========================================================
# PART 3: Update panel hide list in showStepPanel()
#==========================================================

old_panels_array = "['wb-panel-basic','wb-panel-editor','wb-panel-competitor','wb-panel-decision-chain','wb-panel-training',\n              'wb-panel-tender','wb-panel-bidding','wb-panel-contract','wb-panel-delivery',\n              'wb-panel-payment','wb-panel-end','wb-panel-stages','wb-content-default']"

new_panels_array = "['wb-panel-basic','wb-panel-editor','wb-panel-competitor','wb-panel-decision-chain','wb-panel-training',\n              'wb-panel-tender','wb-panel-bidding','wb-panel-contract','wb-panel-delivery',\n              'wb-panel-payment','wb-panel-end','wb-panel-stages','wb-content-default',\n              'wb-panel-lead_gathering','wb-panel-analysis','wb-panel-vendor_compare','wb-panel-client_comm',\n              'wb-panel-company_intro','wb-panel-needs','wb-panel-brand_reg','wb-panel-detailed_plan',\n              'wb-panel-quote','wb-panel-retrospect','wb-panel-optimize']"

if old_panels_array in content:
    content = content.replace(old_panels_array, new_panels_array)
    print("PART 3: Panel hide list updated ✓")
else:
    print("WARNING: Could not find old panels array. Trying line-by-line match...")
    # Fallback - find the array in showStepPanel
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if "var panels=['wb-panel-basic'" in line:
            print(f"  Found at line {i+1}")
            break

#==========================================================
# PART 4: Update saveStepNote() switch cases
#==========================================================
# Add new panel cases before "curWorkflow[curStep].data=data;"

old_save_closing = """  }
  curWorkflow[curStep].data=data;
  saveWorkflow();
  var st=document.getElementById('wb-save-status');if(st)st.textContent='已保存';
  setTimeout(function(){var st=document.getElementById('wb-save-status');if(st)st.textContent=''},2000);
}"""

new_save_cases = """  }else if(panel==='lead_gathering'){
    // Lead gathering saves its own data via saveLeadGathering()
    saveLeadGathering();
    return;
  }else if(panel==='analysis'){
    data.budget=(document.getElementById('wb-analysis-budget')?document.getElementById('wb-analysis-budget').value:'');
    data.threat=(document.getElementById('wb-analysis-threat')?document.getElementById('wb-analysis-threat').value:'');
    data.start_date=(document.getElementById('wb-analysis-start')?document.getElementById('wb-analysis-start').value:'');
    data.end_date=(document.getElementById('wb-analysis-end')?document.getElementById('wb-analysis-end').value:'');
    data.tech_assessment=(document.getElementById('wb-analysis-tech')?document.getElementById('wb-analysis-tech').value:'');
  }else if(panel==='vendor_compare'){
    data.vendors=data.vendors||[];
    data.summary=(document.getElementById('wb-vc-summary')?document.getElementById('wb-vc-summary').value:'');
    // Vendors are saved in real-time via saveVendorCompare()
  }else if(panel==='client_comm'){
    data.comm_date=(document.getElementById('wb-cc-date')?document.getElementById('wb-cc-date').value:'');
    data.comm_topic=(document.getElementById('wb-cc-topic')?document.getElementById('wb-cc-topic').value:'');
    data.our_side=(document.getElementById('wb-cc-our-side')?document.getElementById('wb-cc-our-side').value:'');
    data.client_side=(document.getElementById('wb-cc-client-side')?document.getElementById('wb-cc-client-side').value:'');
    data.feedback=(document.getElementById('wb-cc-feedback')?document.getElementById('wb-cc-feedback').value:'');
    data.next_plan=(document.getElementById('wb-cc-next')?document.getElementById('wb-cc-next').value:'');
  }else if(panel==='company_intro'){
    data.material=(document.getElementById('wb-ci-material')?document.getElementById('wb-ci-material').value:'');
    data.record=(document.getElementById('wb-ci-record')?document.getElementById('wb-ci-record').value:'');
    data.interest=(document.getElementById('wb-ci-interest')?document.getElementById('wb-ci-interest').value:'');
  }else if(panel==='needs'){
    data.needs_category=(document.getElementById('wb-needs-category')?document.getElementById('wb-needs-category').value:'');
    data.needs_desc=(document.getElementById('wb-needs-desc')?document.getElementById('wb-needs-desc').value:'');
    data.needs_budget=(document.getElementById('wb-needs-budget')?document.getElementById('wb-needs-budget').value:'');
    data.needs_priority=(document.getElementById('wb-needs-priority')?document.getElementById('wb-needs-priority').value:'');
    data.needs_source=(document.getElementById('wb-needs-source')?document.getElementById('wb-needs-source').value:'');
  }else if(panel==='brand_reg'){
    data.brand_name=(document.getElementById('wb-br-brand')?document.getElementById('wb-br-brand').value:'');
    data.product_line=(document.getElementById('wb-br-product')?document.getElementById('wb-br-product').value:'');
    data.reg_code=(document.getElementById('wb-br-code')?document.getElementById('wb-br-code').value:'');
    data.reg_date=(document.getElementById('wb-br-date')?document.getElementById('wb-br-date').value:'');
    data.reg_status=(document.getElementById('wb-br-status')?document.getElementById('wb-br-status').value:'');
    data.reg_note=(document.getElementById('wb-br-note')?document.getElementById('wb-br-note').value:'');
  }else if(panel==='detailed_plan'){
    data.plan_overview=(document.getElementById('wb-dp-overview')?document.getElementById('wb-dp-overview').value:'');
    data.plan_architecture=(document.getElementById('wb-dp-architecture')?document.getElementById('wb-dp-architecture').value:'');
    data.plan_implementation=(document.getElementById('wb-dp-plan')?document.getElementById('wb-dp-plan').value:'');
    data.plan_attachment=(document.getElementById('wb-dp-attachment')?document.getElementById('wb-dp-attachment').value:'');
  }else if(panel==='quote'){
    data.items=data.items||[];
    data.discount=parseFloat(document.getElementById('wb-quote-discount')?document.getElementById('wb-quote-discount').value:100)||100;
    data.total=(document.getElementById('wb-quote-total')?document.getElementById('wb-quote-total').textContent.replace('¥',''):'');
  }else if(panel==='retrospect'){
    data.highlights=(document.getElementById('wb-retro-highlights')?document.getElementById('wb-retro-highlights').value:'');
    data.issues=(document.getElementById('wb-retro-issues')?document.getElementById('wb-retro-issues').value:'');
    data.improvements=(document.getElementById('wb-retro-improvements')?document.getElementById('wb-retro-improvements').value:'');
    data.rating=parseInt(document.getElementById('wb-retro-rating')?document.getElementById('wb-retro-rating').value:3)||3;
  }else if(panel==='optimize'){
    data.before=(document.getElementById('wb-opt-before')?document.getElementById('wb-opt-before').value:'');
    data.content=(document.getElementById('wb-opt-content')?document.getElementById('wb-opt-content').value:'');
    data.effect=(document.getElementById('wb-opt-effect')?document.getElementById('wb-opt-effect').value:'');
    data.approval=(document.getElementById('wb-opt-approval')?document.getElementById('wb-opt-approval').value:'');
  }

  curWorkflow[curStep].data=data;
  saveWorkflow();
  var st=document.getElementById('wb-save-status');if(st)st.textContent='已保存';
  setTimeout(function(){var st=document.getElementById('wb-save-status');if(st)st.textContent=''},2000);
}"""

if old_save_closing in content:
    content = content.replace(old_save_closing, new_save_cases)
    print("PART 4: saveStepNote() cases added ✓")
else:
    print("ERROR: Could not find saveStepNote closing block!")
    # Try to find the pattern
    idx = content.find("curWorkflow[curStep].data=data;")
    print(f"  'curWorkflow[curStep].data=data' found at offset {idx}")
    sys.exit(1)

#==========================================================
# PART 5: Update showStepPanel() switch - add new panel cases
#==========================================================
# Add new cases after the 'end' case block

old_end_case = """    case 'end':
      // Show project conclusion
      var proj2=allProjects.find(function(p){return p.id===curProjectId});
      if(proj2){
        var concl=proj2.conclusion||'';
        var concMap={approved:'✓ 认可商机，进入下一步',rejected:'✗ 不认可，流程结束'};
        document.getElementById('wb-end-conclusion').textContent=concMap[concl]||concl||'未填写';
        document.getElementById('wb-end-conclusion-notes').textContent=proj2.conclusion_notes||'';
        document.getElementById('wb-end-title').textContent=concl==='rejected'?'流程结束 - 商机不认可':'流程结束 - 商机已完成';
      }
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    default:"""

new_case_blocks = """    case 'end':
      // Show project conclusion
      var proj2=allProjects.find(function(p){return p.id===curProjectId});
      if(proj2){
        var concl=proj2.conclusion||'';
        var concMap={approved:'✓ 认可商机，进入下一步',rejected:'✗ 不认可，流程结束'};
        document.getElementById('wb-end-conclusion').textContent=concMap[concl]||concl||'未填写';
        document.getElementById('wb-end-conclusion-notes').textContent=proj2.conclusion_notes||'';
        document.getElementById('wb-end-title').textContent=concl==='rejected'?'流程结束 - 商机不认可':'流程结束 - 商机已完成';
      }
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'lead_gathering':
      populateLeadGathering(data);
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'analysis':
      populateAnalysis(data);
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'vendor_compare':
      populateVendorCompare(data);
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'client_comm':
      populateClientComm(data);
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'company_intro':
      populateCompanyIntro(data);
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'needs':
      populateNeeds(data);
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'brand_reg':
      populateBrandReg(data);
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'detailed_plan':
      populateDetailedPlan(data);
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'quote':
      populateQuote(data);
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'retrospect':
      populateRetrospect(data);
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    case 'optimize':
      populateOptimize(data);
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    default:"""

if old_end_case in content:
    content = content.replace(old_end_case, new_case_blocks)
    print("PART 5: showStepPanel() switch cases added ✓")
else:
    print("ERROR: Could not find end case block!")
    sys.exit(1)

#==========================================================
# PART 6: Add populate/save functions before wfRenderActionButtons
#==========================================================
# Insert after getActivePanelName, before resetWorkflow

functions_js = r'''
// ── New Panel Populate & Save Functions ──

// --- Step 1: Lead Gathering ---
function populateLeadGathering(data){
  data.linked_leads=data.linked_leads||[];
  renderLeadCards(data.linked_leads);
  var searchInput=document.getElementById('wb-lead-search');
  if(searchInput)searchInput.value='';
}
function renderLeadCards(leads){
  var container=document.getElementById('wb-lead-cards');
  if(!container)return;
  if(!leads||!leads.length){container.innerHTML='<div style="text-align:center;padding:16px;color:var(--text2)">暂无关联线索，请搜索并添加</div>';return}
  var html='';
  for(var i=0;i<leads.length;i++){
    var l=leads[i];
    html+='<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--card-bg);border:1px solid var(--border);border-radius:8px">';
    html+='<div><strong>'+h(l.name||'线索')+'</strong><br><span style="font-size:11px;color:var(--text3)">来源: '+h(l.source||'')+' | '+h(l.date||'')+'</span></div>';
    html+='<button class="btn-sm" style="background:#fde8e8;color:#c0392b;border:1px solid #e74c3c;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px" onclick="removeLeadCard('+i+')">✕ 移除</button>';
    html+='</div>';
  }
  container.innerHTML=html;
}
function removeLeadCard(idx){
  var data=curWorkflow[1]?curWorkflow[1].data||{}:{};
  data.linked_leads=data.linked_leads||[];
  data.linked_leads.splice(idx,1);
  renderLeadCards(data.linked_leads);
  saveWorkflow();
  console.log('[lead_gathering] removed lead at index',idx);
}
function onLeadSearchInput(){
  var q=document.getElementById('wb-lead-search').value.trim();
  var sug=document.getElementById('wb-lead-suggestions');
  if(!sug)return;
  if(!q||q.length<1){sug.classList.add('hidden');return}
  // Search in allLeads
  var results=[];
  if(allLeads&&allLeads.length){
    var lowerQ=q.toLowerCase();
    for(var i=0;i<allLeads.length;i++){
      var l=allLeads[i];
      if((l.company_name||'').toLowerCase().indexOf(lowerQ)>=0||(l.contact_person||'').toLowerCase().indexOf(lowerQ)>=0){
        results.push(l);
        if(results.length>=8)break;
      }
    }
  }
  if(!results.length){sug.innerHTML='<div style="padding:8px;color:var(--text3);text-align:center">未找到匹配线索</div>';sug.classList.remove('hidden');return}
  var html='';
  for(var i=0;i<results.length;i++){
    var r=results[i];
    html+='<div class="name-suggestion-item" onclick="addLinkedLead(\''+(r.id||'').replace(/'/g,"\\'")+'\',\''+(r.company_name||'').replace(/'/g,"\\'")+'\',\''+(r.source||'').replace(/'/g,"\\'")+'\')" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--border);font-size:13px">';
    html+=h(r.company_name||'未命名')+' <span style="color:var(--text3);font-size:11px">'+h(r.contact_person||'')+'</span>';
    html+='</div>';
  }
  sug.innerHTML=html;
  sug.classList.remove('hidden');
}
function onLeadSearchKey(event){if(event.key==='Enter'){event.preventDefault();}}
function addLinkedLead(id,name,source){
  if(!id||!name)return;
  var data=curWorkflow[1]?curWorkflow[1].data||{}:{};
  data.linked_leads=data.linked_leads||[];
  // Check duplicate
  for(var i=0;i<data.linked_leads.length;i++){if(data.linked_leads[i].id===id){showToast('该线索已关联');return}}
  data.linked_leads.push({id:id,name:name,source:source||'',date:new Date().toISOString().slice(0,10)});
  renderLeadCards(data.linked_leads);
  saveWorkflow();
  document.getElementById('wb-lead-suggestions').classList.add('hidden');
  document.getElementById('wb-lead-search').value='';
  console.log('[lead_gathering] linked lead:',id,name);
}
function saveLeadGathering(){
  if(!curStep||curStep!==1)return;
  curWorkflow[1]=curWorkflow[1]||{done:false,note:'',data:{}};
  saveWorkflow();
  showToast('线索关联已保存');
}

// --- Step 2: Analysis ---
function populateAnalysis(data){
  var g=function(id,val){var el=document.getElementById(id);if(el)el.value=val||'';};
  g('wb-analysis-budget',data.budget);
  g('wb-analysis-threat',data.threat);
  g('wb-analysis-start',data.start_date);
  g('wb-analysis-end',data.end_date);
  g('wb-analysis-tech',data.tech_assessment);
  console.log('[analysis] populated');
}
function saveAnalysis(){
  if(!curStep||curStep!==2)return;
  curWorkflow[2]=curWorkflow[2]||{done:false,note:'',data:{}};
  saveStepNote();
  showToast('分析数据已保存');
}

// --- Step 7: Vendor Compare ---
function populateVendorCompare(data){
  data.vendors=data.vendors||[];
  var g=function(id,val){var el=document.getElementById(id);if(el)el.value=val||'';};
  g('wb-vc-summary',data.summary);
  renderVendorRows(data.vendors);
  console.log('[vendor_compare] populated',data.vendors.length,'vendors');
}
function renderVendorRows(vendors){
  var container=document.getElementById('wb-vc-list');
  if(!container)return;
  if(!vendors||!vendors.length){container.innerHTML='<div style="text-align:center;padding:16px;color:var(--text2)">点击下方按钮添加工厂家</div>';return}
  var html='';
  for(var i=0;i<vendors.length;i++){
    var v=vendors[i]||{};
    html+='<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:12px;position:relative">';
    html+='<button class="btn-sm" onclick="removeVendorRow('+i+')" style="position:absolute;top:8px;right:8px;background:#fde8e8;color:#c0392b;border:none;padding:2px 8px;border-radius:6px;cursor:pointer;font-size:12px">✕</button>';
    html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
    html+='<div><label style="font-size:10px;color:var(--text3)">厂家名称</label><input value="'+h(v.name||'')+'" onchange="updateVendorField('+i+',\'name\',this.value)" style="width:100%;padding:6px 8px;border-radius:6px;border:1px solid var(--border);font-size:13px;background:var(--card-bg);color:var(--text)"></div>';
    html+='<div><label style="font-size:10px;color:var(--text3)">产品型号</label><input value="'+h(v.model||'')+'" onchange="updateVendorField('+i+',\'model\',this.value)" style="width:100%;padding:6px 8px;border-radius:6px;border:1px solid var(--border);font-size:13px;background:var(--card-bg);color:var(--text)"></div>';
    html+='<div><label style="font-size:10px;color:var(--text3)">价格</label><input value="'+h(v.price||'')+'" onchange="updateVendorField('+i+',\'price\',this.value)" style="width:100%;padding:6px 8px;border-radius:6px;border:1px solid var(--border);font-size:13px;background:var(--card-bg);color:var(--text)"></div>';
    html+='<div></div>';
    html+='<div><label style="font-size:10px;color:var(--text3)">优势</label><input value="'+h(v.pros||'')+'" onchange="updateVendorField('+i+',\'pros\',this.value)" style="width:100%;padding:6px 8px;border-radius:6px;border:1px solid var(--border);font-size:13px;background:var(--card-bg);color:var(--text)"></div>';
    html+='<div><label style="font-size:10px;color:var(--text3)">劣势</label><input value="'+h(v.cons||'')+'" onchange="updateVendorField('+i+',\'cons\',this.value)" style="width:100%;padding:6px 8px;border-radius:6px;border:1px solid var(--border);font-size:13px;background:var(--card-bg);color:var(--text)"></div>';
    html+='</div>';
    html+='</div>';
  }
  container.innerHTML=html;
}
function addVendorRow(){
  var data=curWorkflow[7]?curWorkflow[7].data||{}:{};
  data.vendors=data.vendors||[];
  data.vendors.push({name:'',model:'',price:'',pros:'',cons:''});
  renderVendorRows(data.vendors);
  saveWorkflow();
  console.log('[vendor_compare] added vendor row');
}
function removeVendorRow(idx){
  var data=curWorkflow[7]?curWorkflow[7].data||{}:{};
  data.vendors=data.vendors||[];
  data.vendors.splice(idx,1);
  renderVendorRows(data.vendors);
  saveWorkflow();
  console.log('[vendor_compare] removed vendor at',idx);
}
function updateVendorField(idx,field,value){
  var data=curWorkflow[7]?curWorkflow[7].data||{}:{};
  data.vendors=data.vendors||[];
  if(data.vendors[idx]){data.vendors[idx][field]=value;}
  saveWorkflow();
}
function saveVendorCompare(){
  if(!curStep||curStep!==7)return;
  curWorkflow[7]=curWorkflow[7]||{done:false,note:'',data:{}};
  saveStepNote();
  showToast('厂家比较已保存');
}

// --- Step 8: Client Communication ---
function populateClientComm(data){
  var g=function(id,val){var el=document.getElementById(id);if(el)el.value=val||'';};
  g('wb-cc-date',data.comm_date);
  g('wb-cc-topic',data.comm_topic);
  g('wb-cc-our-side',data.our_side);
  g('wb-cc-client-side',data.client_side);
  g('wb-cc-feedback',data.feedback);
  g('wb-cc-next',data.next_plan);
  console.log('[client_comm] populated');
}
function saveClientComm(){
  if(!curStep||curStep!==8)return;
  curWorkflow[8]=curWorkflow[8]||{done:false,note:'',data:{}};
  saveStepNote();
  showToast('客户交流已保存');
}

// --- Step 10: Company Intro ---
function populateCompanyIntro(data){
  var g=function(id,val){var el=document.getElementById(id);if(el)el.value=val||'';};
  g('wb-ci-material',data.material);
  g('wb-ci-record',data.record);
  g('wb-ci-interest',data.interest);
  console.log('[company_intro] populated');
}
function saveCompanyIntro(){
  if(!curStep||curStep!==10)return;
  curWorkflow[10]=curWorkflow[10]||{done:false,note:'',data:{}};
  saveStepNote();
  showToast('公司介绍已保存');
}

// --- Step 11: Needs Assessment ---
function populateNeeds(data){
  var g=function(id,val){var el=document.getElementById(id);if(el)el.value=val||'';};
  g('wb-needs-category',data.needs_category);
  g('wb-needs-desc',data.needs_desc);
  g('wb-needs-budget',data.needs_budget);
  g('wb-needs-priority',data.needs_priority);
  g('wb-needs-source',data.needs_source);
  console.log('[needs] populated');
}
function saveNeeds(){
  if(!curStep||curStep!==11)return;
  curWorkflow[11]=curWorkflow[11]||{done:false,note:'',data:{}};
  saveStepNote();
  showToast('需求信息已保存');
}

// --- Step 12: Brand Registration ---
function populateBrandReg(data){
  var g=function(id,val){var el=document.getElementById(id);if(el)el.value=val||'';};
  g('wb-br-brand',data.brand_name);
  g('wb-br-product',data.product_line);
  g('wb-br-code',data.reg_code);
  g('wb-br-date',data.reg_date);
  g('wb-br-status',data.reg_status);
  g('wb-br-note',data.reg_note);
  console.log('[brand_reg] populated');
}
function saveBrandReg(){
  if(!curStep||curStep!==12)return;
  curWorkflow[12]=curWorkflow[12]||{done:false,note:'',data:{}};
  saveStepNote();
  showToast('品牌报备已保存');
}

// --- Step 13: Detailed Plan ---
function populateDetailedPlan(data){
  var g=function(id,val){var el=document.getElementById(id);if(el)el.value=val||'';};
  g('wb-dp-overview',data.plan_overview);
  g('wb-dp-architecture',data.plan_architecture);
  g('wb-dp-plan',data.plan_implementation);
  g('wb-dp-attachment',data.plan_attachment);
  console.log('[detailed_plan] populated');
}
function saveDetailedPlan(){
  if(!curStep||curStep!==13)return;
  curWorkflow[13]=curWorkflow[13]||{done:false,note:'',data:{}};
  saveStepNote();
  showToast('详细方案已保存');
}

// --- Step 14: Quote ---
function populateQuote(data){
  data.items=data.items||[];
  data.discount=data.discount||100;
  renderQuoteRows(data.items);
  if(document.getElementById('wb-quote-discount'))document.getElementById('wb-quote-discount').value=data.discount;
  calcQuoteTotal();
  console.log('[quote] populated',data.items.length,'items');
}
function renderQuoteRows(items){
  var tbody=document.getElementById('wb-quote-body');
  if(!tbody)return;
  var html='';
  for(var i=0;i<items.length;i++){
    var it=items[i]||{};
    html+='<tr>';
    html+='<td style="padding:4px"><input value="'+h(it.name||'')+'" onchange="updateQuoteField('+i+',\'name\',this.value)" style="width:100%;padding:6px;border-radius:6px;border:1px solid var(--border);font-size:13px;background:var(--card-bg);color:var(--text)"></td>';
    html+='<td style="padding:4px"><input value="'+h(it.spec||'')+'" onchange="updateQuoteField('+i+',\'spec\',this.value)" style="width:100%;padding:6px;border-radius:6px;border:1px solid var(--border);font-size:13px;background:var(--card-bg);color:var(--text)"></td>';
    html+='<td style="padding:4px"><input type="number" min="1" value="'+(it.qty||1)+'" onchange="updateQuoteField('+i+',\'qty\',parseInt(this.value)||1);calcQuoteTotal()" style="width:100%;padding:6px;border-radius:6px;border:1px solid var(--border);font-size:13px;background:var(--card-bg);color:var(--text)"></td>';
    html+='<td style="padding:4px"><input type="number" min="0" step="0.01" value="'+(it.price||0)+'" onchange="updateQuoteField('+i+',\'price\',parseFloat(this.value)||0);calcQuoteTotal()" style="width:100%;padding:6px;border-radius:6px;border:1px solid var(--border);font-size:13px;background:var(--card-bg);color:var(--text)"></td>';
    var subtotal=(it.qty||1)*(it.price||0);
    html+='<td style="padding:4px;font-weight:600;text-align:right">¥'+subtotal.toFixed(2)+'</td>';
    html+='<td style="padding:4px;text-align:center"><button onclick="removeQuoteRow('+i+')" style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:16px">✕</button></td>';
    html+='</tr>';
  }
  tbody.innerHTML=html;
}
function addQuoteRow(){
  var data=curWorkflow[14]?curWorkflow[14].data||{}:{};
  data.items=data.items||[];
  data.items.push({name:'',spec:'',qty:1,price:0});
  renderQuoteRows(data.items);
  saveWorkflow();
  calcQuoteTotal();
  console.log('[quote] added row');
}
function removeQuoteRow(idx){
  var data=curWorkflow[14]?curWorkflow[14].data||{}:{};
  data.items=data.items||[];
  data.items.splice(idx,1);
  renderQuoteRows(data.items);
  saveWorkflow();
  calcQuoteTotal();
  console.log('[quote] removed row at',idx);
}
function updateQuoteField(idx,field,value){
  var data=curWorkflow[14]?curWorkflow[14].data||{}:{};
  data.items=data.items||[];
  if(data.items[idx]){data.items[idx][field]=value;}
  saveWorkflow();
}
function calcQuoteTotal(){
  var data=curWorkflow[14]?curWorkflow[14].data||{}:{};
  data.items=data.items||[];
  var subtotal=0;
  for(var i=0;i<data.items.length;i++){
    var it=data.items[i];
    subtotal+=(parseInt(it.qty)||0)*(parseFloat(it.price)||0);
  }
  var discountEl=document.getElementById('wb-quote-discount');
  var discount=parseFloat(discountEl?discountEl.value:100)||100;
  var total=subtotal*discount/100;
  document.getElementById('wb-quote-subtotal').textContent='¥'+subtotal.toFixed(2);
  document.getElementById('wb-quote-total').textContent='¥'+total.toFixed(2);
}
function saveQuote(){
  if(!curStep||curStep!==14)return;
  curWorkflow[14]=curWorkflow[14]||{done:false,note:'',data:{}};
  saveStepNote();
  showToast('报价已保存');
}

// --- Step 17: Retrospect ---
function populateRetrospect(data){
  var g=function(id,val){var el=document.getElementById(id);if(el)el.value=val||'';};
  g('wb-retro-highlights',data.highlights);
  g('wb-retro-issues',data.issues);
  g('wb-retro-improvements',data.improvements);
  var ratingEl=document.getElementById('wb-retro-rating');
  if(ratingEl){ratingEl.value=data.rating||3;document.getElementById('wb-retro-rating-val').textContent=data.rating||3;}
  console.log('[retrospect] populated');
}
function saveRetrospect(){
  if(!curStep||curStep!==17)return;
  curWorkflow[17]=curWorkflow[17]||{done:false,note:'',data:{}};
  saveStepNote();
  showToast('复盘已保存');
}

// --- Step 18: Optimize ---
function populateOptimize(data){
  var g=function(id,val){var el=document.getElementById(id);if(el)el.value=val||'';};
  g('wb-opt-before',data.before);
  g('wb-opt-content',data.content);
  g('wb-opt-effect',data.effect);
  g('wb-opt-approval',data.approval);
  console.log('[optimize] populated');
}
function saveOptimize(){
  if(!curStep||curStep!==18)return;
  curWorkflow[18]=curWorkflow[18]||{done:false,note:'',data:{}};
  saveStepNote();
  showToast('优化方案已保存');
}

'''

# Insert before "function resetWorkflow()"
old_reset_workflow = "function resetWorkflow()"
if old_reset_workflow in content:
    content = content.replace(old_reset_workflow, functions_js + '\n' + old_reset_workflow)
    print("PART 6: Populate/save functions added ✓")
else:
    print("ERROR: Could not find resetWorkflow!")
    sys.exit(1)

#==========================================================
# PART 7: Verify the saveStepNote function doesn't have double closing
#==========================================================
# Count function braces
open_count = content.count('{')
close_count = content.count('}')
print('Braces: {=' + str(open_count) + ' }=' + str(close_count) + ' diff=' + str(open_count-close_count))

# Check for duplicate saveStepNote patterns
ctx_count = content.count('curWorkflow[curStep].data=data;')
print('curWorkflow curStep data=data count: ' + str(ctx_count))

# Write
with open(INDEX, 'w', encoding='utf-8') as f:
    f.write(content)

print('\nAll parts applied.')
print('  New size: ' + str(len(content)) + ' bytes')
print('  Backup: ' + BAK)
