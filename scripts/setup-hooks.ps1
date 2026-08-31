# 一次性配置：启用项目自带 Git 钩子（防止新手直接提交/推送 main）
# 用法：在仓库根目录执行  powershell -ExecutionPolicy Bypass -File scripts/setup-hooks.ps1
git config core.hooksPath .githooks
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] 已启用项目 Git 钩子：main 分支禁止直接 commit / push" -ForegroundColor Green
    Write-Host "     日常开发请走 feature 分支，详见 docs/CONTRIBUTING.md"
} else {
    Write-Host "[失败] git config 执行出错，请在仓库根目录运行" -ForegroundColor Red
}
