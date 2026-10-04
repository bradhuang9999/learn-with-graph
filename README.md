# 知識圖譜 · Learn with Graph

以圖解與完整筆記組成的跨領域學習網站。第一個學習集群是 Claude 認證，包含 **Claude Certified Architect — Foundations** 的 5 章、30 節，以及 34 張教學 SVG。

## 本機使用

需要 Node.js 與 Python 3。首次執行：

```sh
npm install
npm run dev
```

開啟 `http://localhost:5173`。更新教材後執行 `npm run build`，靜態網站會輸出到 `docs/`，可直接將該目錄用於 GitHub Pages 或其他靜態主機。直接以 `file://` 開啟 `index.html` 無法載入課程資料。

## 內容結構

```text
content/
  zh-TW/                     # 語系；未來可新增 en-US 等目錄
    claude/                  # 領域
      ccar-f/                 # 課程
        course.json           # 此語系的課程與章節名稱
        lesson-slugs.json     # 單元編號對應的英文檔名
        chapters/
          01/
            1.1/
              agentic-loop.md  # 完整教材
              agentic-loop.svg # 主要圖解
              ...              # 補充圖使用自己的英文名稱
docs/                         # 產生後的靜態網站
ref/                          # 處理說明、QA 紀錄與來源檔名對照
```

網站建置程式會掃描有 `course.json` 的課程，依 `lesson-slugs.json` 找到教材，從 Markdown 的第一個標題取得單元名稱。同一單元的 Markdown 和主圖共用英文名稱；補充圖使用描述其主題的英文名稱。新增語系時，在新語系目錄下放入同樣的課程 ID、翻譯過的 `course.json` 與教材；進度按語系和課程分開儲存在瀏覽器。新增領域或課程時也沿用相同結構。

`content/` 是教材的唯一來源。SVG 補充圖與對應單元放在一起；更新教材後執行 `npm run build`，重新產生 `docs/` 網站。`ref/` 保留文件處理說明、圖解 QA 報告與原始檔名對照，不再存放重複的 Markdown 或 SVG。

## 建置

```sh
npm run build
```

建置程式產生 `docs/data/catalog.json`、各單元的 HTML 與 SVG。網站提供章節導覽、單元搜尋、圖解放大與本機閱讀進度；閱讀進度只儲存在目前瀏覽器。
