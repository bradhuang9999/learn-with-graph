# 4.3 用工具呼叫與 JSON Schema 強制結構化輸出

## 原始考綱

**Task Statement 4.3：**利用工具呼叫與 JSON Schema 強制結構化輸出。

### 知識要求

- 以帶 JSON Schema 的工具呼叫（`tool_use`）取得符合綱要的結構化輸出，能消除 JSON 語法錯誤。
- `tool_choice: "auto"` 可讓模型回傳文字而不呼叫工具；`"any"` 要求呼叫某個工具；指定工具則要求呼叫具名工具。
- 嚴格 JSON Schema 與工具呼叫可消除語法錯誤，卻不能防止語意錯誤，例如明細加總不符總額或值放錯欄位。
- 綱要設計須考量必填與選填欄位，以及以 `other` 加細節字串擴充 enum 分類的模式。

### 技能要求

- 定義以 JSON Schema 為輸入參數的擷取工具，並從 `tool_use` 回應取得結構化資料。
- 有多種擷取綱要但尚不知文件類型時，設定 `tool_choice: "any"` 以確保輸出走工具。
- 用 `tool_choice: {"type":"tool","name":"extract_metadata"}` 強制先執行指定擷取，再進行後續資料擴充。
- 來源文件可能缺少資訊時，把欄位設為可選或可為 null，避免模型為滿足必填要求而捏造值。
- 對模糊情況加入 `unclear` 等 enum 值，對可擴充分類使用 `other` 加細節欄位。
- 在嚴格輸出綱要之外，提示中仍加入格式正規化規則，處理來源格式不一致。

## 要點筆記

結構化擷取有兩道不同的門：

| 檢查對象 | 工具與方法 | 不能保證什麼 |
|---|---|---|
| 輸出形狀：欄位、型別、可解析性 | 工具呼叫、JSON Schema、支援時的嚴格模式 | 來源是否真有該值 |
| 欄位內容：來源、加總、業務規則 | 來源定位與程式驗證，見 4.4 | 只憑 Schema 不會自動完成 |

形狀正確是資料進入下游的必要條件，不是事實正確的證明。

### 工具輸入作為結構化擷取契約

定義 `extract_invoice` 工具，讓 `input_schema` 描述擷取欄位，例如 `invoice_id`、`stated_total`、`items`、`currency`。模型回覆中的 `tool_use` 區塊包含工具名稱與 `input` 物件；應用程式從該區塊讀取資料，不必從自由文字猜測 JSON 在哪裡。這個工具可以只是收集結構化結果的介面，並不一定要執行外部副作用。

簡化契約如下；此例把可缺資料設為可為空值的型別，實作時須依所用 API 支援的 JSON Schema 子集調整：

```json
{
  "name": "extract_invoice",
  "strict": true,
  "input_schema": {
    "type": "object",
    "properties": {
      "invoice_id": {"type": ["string", "null"]},
      "stated_total": {"type": ["number", "null"]},
      "items": {"type": "array", "items": {"type": "number"}},
      "tax": {"type": ["number", "null"]},
      "currency": {"type": ["string", "null"]},
      "category": {"type": "string", "enum": ["goods", "service", "other", "unclear"]},
      "category_detail": {"type": ["string", "null"]}
    },
    "required": ["invoice_id", "stated_total", "items", "tax", "currency", "category", "category_detail"],
    "additionalProperties": false
  }
}
```

這裡的 `items` 暫以各品項金額陣列示意，實際系統可改成含品名、數量、單價的物件陣列；空陣列表示未辨識到品項，**不是**總額為零的證據。`required` 只表示回應物件**必須有欄位**，不表示來源必須有值；型別允許 `null` 才能誠實表達缺值。也可把欄位做成真正選填，但下游程式要處理缺鍵。`other` 用於來源明確屬於現有列舉以外的類別，並在 `category_detail` 補具體名稱；`unclear` 用於來源不足或歧義，不能隨便塞進 `other`。若列舉過窄且沒有擴充出口，模型可能硬把新類別塞進錯欄位。

考綱以工具呼叫確保結構化輸出；現行 Anthropic 文件進一步區分：工具定義有 `input_schema` 不等於已啟用嚴格驗證，需在支援的工具上設定 `strict: true` 才保證**實際產生的工具呼叫參數**符合支援的 Schema 子集。另有 `output_config.format` 可直接約束 JSON 文字回覆。這些是產品版本差異，不改變考點的核心分界：結構保證不等於事實正確。

在把輸出交給下游前，仍要先看 `stop_reason`。`tool_use` 才讀相應的工具區塊；`refusal` 是拒絕，不能假裝已有擷取資料；`max_tokens` 可能截斷結構化回應，需按產品策略提高上限或重試。現行文件明列拒絕與 token 截斷時，結構化文字輸出可能不符合 Schema，因此「開了嚴格模式」不能寫成「每次 API 回應都一定有可用擷取物件」。

### 選哪一個工具：`tool_choice`

| 設定 | 允許的結果 | 適用情況 |
|---|---|---|
| `auto` | 模型可呼叫工具，也可只回文字 | 工具為可選步驟；若下游一定要結構化資料，不能單靠它 |
| `any` | 模型須從提供的工具中選一個 | 文件型別未知，有多個擷取工具，且本輪必須取得工具輸入 |
| `{"type":"tool","name":"extract_metadata"}` | 指定工具必須被呼叫 | 必須先擷取中繼資料，再做其他增補 |

此表是考綱指定語意，實際可用性依模型與思考設定而異。現行文件指出部分模型或手動擴展思考設定不支援強制的 `any`／指定工具；此時需檢查模型能力，改用支援的結構化輸出或分階段程式流程。即使 `any` 保證「選一個」，也不保證選的是正確文件型別；要檢查工具名稱與擷取證據。

### 邊界案例：未知文件型別與缺值

輸入是一張掃描收據，只看得出總額「NT$ 840」，沒有商店統編；系統提供 `extract_invoice` 和 `extract_receipt`。決策是使用可支援強制工具呼叫的模型，以 `tool_choice: any` 要求選一種擷取工具，並在提示中定義兩者適用條件。模型選 `extract_receipt`，回傳 `stated_total=840`、`currency="TWD"`、`merchant_tax_id=null`；程式驗證工具名稱、欄位型別及總額來源，然後存檔。若 schema 把統編設為非空必填，模型可能臆造統編，造成後續對帳錯誤。

若另一張收據明列品項 300 與 200、稅 0，總額卻印 800，即使 `tool_use` 符合 Schema，仍須保留印刷總額與計算總額、標記衝突；不能因結構合法就相信 800 或擅改成 500。

### 格式正規化仍須寫在提示中

Schema 只知道欄位是字串或數字，不知道 `03/04/26` 是哪個地區的日期，也不知道 `1,200` 的逗號是千分位。提示要寫明幣別、日期時區、數值單位、保留原述值及歧義處置；無法判定時用空值或 `unclear`，並保留原文位置。這些規則要以樣本驗證，尤其是欄位互換、加總、代碼對應等語意錯誤。嚴格 Schema 是接線契約，不是資料真實性證明。
