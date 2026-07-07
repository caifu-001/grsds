# 爬取 mingluji 广东对外贸易公司名录
# 用法: powershell -File crawl_mingluji.ps1 -Pages 5 -City "广州"

param(
    [int]$Pages = 5,
    [string]$City = "广州",
    [string]$OutputFile = "D:\1kaifa\grsds\guangdong_foreign_trade_companies.json"
)

$ErrorActionPreference = "Stop"
$xb = "D:\Program Files\QClaw\v0.2.31.600\resources\openclaw\config\skills\xbrowser\scripts\xb.cjs"
$node = if ($env:QCLAW_CLI_NODE_BINARY) { $env:QCLAW_CLI_NODE_BINARY } else { 'node' }

function Run-Xb {
    param([string]$Cmd)
    $result = & $node $xb run --browser default $Cmd 2>&1 | Out-String
    return $result
}

function Get-PageText {
    param([int]$PageNum)
    $cityEncoded = [System.Web.HttpUtility]::UrlEncode($City)
    if ($PageNum -eq 1) {
        $url = "https://gongshang.mingluji.com/guangdong/zhuanti/106/$cityEncoded"
    } else {
        $url = "https://gongshang.mingluji.com/guangdong/zhuanti/106/$cityEncoded`?page=$PageNum"
    }
    Write-Host "Opening page $PageNum : $url"
    Run-Xb "open '$url'"
    Start-Sleep -Seconds 2
    Run-Xb "wait --load networkidle"
    $textResult = Run-Xb "get text body"
    return $textResult
}

function Parse-Companies {
    param([string]$RawText)
    
    $companies = @()
    
    # Parse company blocks: each starts with company name (without "下载企业报告" etc), followed by 联系人, 成立时间, 注册资金, 经营范围
    # Pattern: company name lines followed by contact info blocks
    
    $lines = $RawText -split "`n"
    $i = 0
    while ($i -lt $lines.Count) {
        $line = $lines[$i].Trim()
        
        # Check if this line looks like a company entry start
        if ($line -match '有限公司|有限责任公司|企业|合伙' -and $line -notmatch '下载|下一页|常见问题|包括|名录|报告|数据批量|返回|咨询顾问|联系|热门|相关推荐|热门行业') {
            $companyName = ($line -replace '^\d+[\.\、\s]*', '').Trim()
            if ($companyName.Length -lt 5) { $i++; continue }
            
            # Collect following lines to find fields
            $block = @()
            for ($j = $i; $j -lt [Math]::Min($i + 30, $lines.Count); $j++) {
                $block += $lines[$j].Trim()
            }
            $blockText = $block -join "`n"
            
            # Extract fields
            $contact = ""
            if ($blockText -match '联系人[：:]\s*(.+?)(?:\n|$)') {
                $contact = $matches[1].Trim()
            }
            
            $established = ""
            if ($blockText -match '成立时间[：:]\s*于\s*(\d{4}-\d{2}-\d{2})') {
                $established = $matches[1]
            }
            
            $regCapital = ""
            if ($blockText -match '注册资金[：:]\s*(\d+(?:\.\d+)?)\s*万') {
                $regCapital = [decimal]$matches[1]
            }
            
            $scope = ""
            if ($blockText -match '经营范围[：:]\s*(.+?)(?:\n下载企业报告|\n🛒|\n\n|\n$|$)') {
                $scope = $matches[1].Trim()
                # Remove trailing "......" 
                $scope = $scope -replace '\.\.\.\.\.\.$', ''
            }
            
            if ($companyName.Length -ge 5) {
                $companies += @{
                    name = $companyName
                    contact = $contact
                    established = $established
                    registered_capital = if ($regCapital) { $regCapital * 10000 } else { $null }
                    business_scope = $scope
                    province = "广东"
                    city = $City
                    source = "mingluji"
                }
            }
            $i += 25  # Skip ahead to avoid re-matching
        }
        $i++
    }
    
    return $companies
}

# Main
$allCompanies = @()

for ($page = 1; $page -le $Pages; $page++) {
    try {
        $text = Get-PageText -PageNum $page
        
        # Save raw for debugging
        $rawFile = "D:\1kaifa\grsds\crawl_page_$page.txt"
        $text | Out-File -FilePath $rawFile -Encoding UTF8
        
        $companies = Parse-Companies -RawText $text
        Write-Host "  Found $($companies.Count) companies on page $page"
        
        if ($companies.Count -eq 0) {
            Write-Host "  No companies found, stopping."
            break
        }
        
        $allCompanies += $companies
    } catch {
        Write-Host "  Error on page $page : $_"
        break
    }
}

Write-Host "`nTotal: $($allCompanies.Count) companies"
$allCompanies | ConvertTo-Json -Depth 3 | Out-File -FilePath $OutputFile -Encoding UTF8
Write-Host "Saved to $OutputFile"
