# tests

demo(`index.html`)的驗證腳本。`index.html` 本身零依賴,這些只是開發用工具。

```
npm install          # 安裝 jsdom、playwright(只有跑測試才需要)
npm test             # jsdom smoke tests,commit 前要全綠
npm run test:browser # 真實 Chromium 驗證(拖曳、觸控、更新流程),截圖輸出到 tests/shots/(已被 gitignore)
```

真實瀏覽器腳本需要 Chromium:`npx playwright install chromium`。

| 檔案 | 驗證內容 |
|---|---|
| `smoke_drag_feedback.js` | 工坊拖曳排序視覺回饋(佔位框、拖曳中不重繪、FLIP、放開後重繪一次)+ 上傳拖放區 |
| `smoke_update_flow.js` | 更新潛艇流程:排序、分頁、手動輸入驗證、假 OCR 與可疑欄位、逾時提示、加/移除列、單艘快速修改 |
| `real_browser_drag.js` | 真實 Chromium 滑鼠拖曳排序 |
| `real_browser_touch.js` | 真實 Chromium 觸控拖曳(CDP `Input.dispatchTouchEvent`)+ 版權署名 |
| `real_browser_update.js` | 更新潛艇流程手機/桌機截圖與無 script 錯誤檢查 |

jsdom 沒有版面與真實拖曳行為,改動拖曳邏輯後務必跑 `test:browser`。
