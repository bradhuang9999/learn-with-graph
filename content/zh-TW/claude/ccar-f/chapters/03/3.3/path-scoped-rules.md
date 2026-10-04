# 3.3 套用按路徑條件載入的規則

## 原始考綱

**Task Statement 3.3：**套用只在符合路徑時載入的規則。

### 知識要求

- `.claude/rules/` 規則檔可在 YAML frontmatter 的 `paths` 欄位放入 glob 模式，讓規則按路徑條件啟用。
- 只在編輯符合條件的檔案時載入路徑限定規則，可減少不相關上下文與 token 用量。
- 當同一規範跨越多個目錄（例如測試檔散布在程式庫各處），glob 路徑規則比目錄層級 `CLAUDE.md` 更合適。

### 技能要求

- 建立帶有 YAML frontmatter 路徑設定的 `.claude/rules/` 檔案，例如 `paths: ["terraform/**/*"]`，使規則只在編輯符合檔案時載入。
- 用 glob 模式依檔案類型套用規範，不受目錄位置限制，例如以 `**/*.test.tsx` 涵蓋全部測試檔。
- 規範需套用到程式庫各處的檔案時，選路徑專屬規則，而非子目錄 `CLAUDE.md`。

## 要點筆記

### 路徑條件控制的是載入，不是權限

路徑規則把「哪條工作慣例適用哪些檔案」寫成可比對的條件。`.claude/rules/` 中的 Markdown 檔若有 YAML frontmatter `paths`，就按 glob 路徑模式條件載入；沒有 `paths` 的規則則無條件載入。它解決的是**指示何時進入上下文**，不是檔案存取權限或規則的強制執行。

### 先依慣例的分布決定載體

| 慣例的適用範圍 | 合適載體 | 原因 |
|---|---|---|
| 整個專案通用 | 根專案指示，或無 `paths` 的主題規則 | 不應因路徑漏匹配而缺席。 |
| 集中於一個子樹 | 該子目錄 `CLAUDE.md`，或對應子樹的 `paths` 規則 | 目錄邊界與規則一致，擇一維護即可。 |
| 同類檔案散布多處 | `.claude/rules/` 中的 glob 規則 | 一份規則覆蓋多個目錄，不必在每個目錄複製。 |

例如元件測試同時存在 `apps/`、`packages/` 和 `shared/`，把規則只放 `apps/CLAUDE.md` 會漏掉後兩處；放根檔又讓無關任務讀到測試細節。此時可建立 `.claude/rules/component-tests.md`：

```markdown
---
paths:
  - "**/*.test.tsx"
---

# 元件測試
變更元件測試時，覆蓋正常互動與至少一個失敗情境；
沿用相鄰測試的 fixture 命名。
```

`**/*.test.tsx` 匹配多個目錄下的該類測試檔；`terraform/**/*` 匹配 Terraform 子樹。可以在 `paths` 放多個模式，以涵蓋共置測試與共用 fixture 程式等實際受影響檔案。模式太窄會漏載，太廣則增加無關上下文；`paths` 判斷的是檔案路徑，不是使用者訊息裡是否出現某個檔名。

### 驗證條件真的被觸發

依[Claude Code 路徑規則文件](https://code.claude.com/docs/en/memory)，現行路徑規則在 Claude Code 以 `Read`、`Write` 或 `Edit` 接觸匹配檔案時觸發。它不是每次工具呼叫都觸發，也不因提示文字提到路徑就保證載入。YAML 若解析失敗，規則可能被當成無條件規則；不應把「檔案放進 `.claude/rules/`」誤認為條件已生效。

可用兩個**獨立新會話**驗證：一個先接觸 `apps/web/Button.test.tsx`，另一個只接觸不匹配的 `apps/web/Button.tsx`，再看 `/context` 中的已載入規則。不要在同一會話先讀匹配檔、再讀不匹配檔後宣稱條件失效；規則一旦進入該會話，上下文不會因下一個檔案不匹配而倒退。必要時用 `claude --debug` 排查 frontmatter 解析錯誤。

另一份 `.claude/rules/terraform.md` 可用 `paths: ["terraform/**/*"]`，要求修改資源前檢視 `terraform plan`，並在刪除前取得人工確認。這仍是行為指示：是否真的產生 plan 要看執行證據；若「不得擅自刪除」必須硬性保證，仍需權限或 CI 閘門。**條件載入、實際遵循、技術上阻止越界**是三件不同的事。
