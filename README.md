# 血壓日記｜血壓追蹤網站原型

這是一個可部署到 GitHub Pages 的前端 MVP。GitHub Pages 本身只提供靜態檔案，不適合存放帳號、健康紀錄或照片；要保存資料，請搭配 Supabase。

- 帳號登入 / 註冊（示範資料以 localStorage 保存）
- 血壓計照片上傳與預覽
- 辨識流程 UI 與可編輯的 SYS / DIA / PUL 數值
- 測量紀錄、刪除、最近一次測量
- 一週趨勢圖、長期平均值
- 響應式手機版介面

## GitHub Pages + Supabase 設定

1. 建立 Supabase 專案。
2. 在 Supabase SQL Editor 執行 `supabase-schema.sql`。血壓功能使用獨立的 `bp_measurements` 資料表與 `blood-pressure-photos` 儲存桶，不會使用其他系統的資料表或照片桶。
3. 複製 `supabase-config.example.js` 為 `supabase-config.js`，填入 Project URL 與 anon key。
4. 將整個資料夾推送到 GitHub，於 repository 的 Settings → Pages 選擇 GitHub Actions 或 main branch 發布。

`supabase-config.js` 只放 anon key，不要放 service role key。資料表與照片儲存桶必須使用 RLS policy，避免使用者看到別人的健康資料。

## 開始使用

直接開啟 `index.html` 即可，或在此資料夾執行任何靜態檔案伺服器。

## LINE LIFF

家庭使用者請從 LINE 開啟 LIFF 網址，讓網站在 LINE 的 LIFF 瀏覽器內運作並可要求相機權限：

`https://liff.line.me/2011021988-mY1HknbU`

目前照片辨識已改為使用瀏覽器端 Tesseract.js，會先裁切畫面中央、提高對比，再嘗試讀取三組數字。辨識不完整時不會亂填，而是要求人工確認。要上線時，建議再將 OCR 移到後端，並加入血壓計品牌/型號辨識與人工覆核。

## 發布到線上

這是純靜態網站，可以部署到 Netlify、Vercel、GitHub Pages 或任何靜態主機。發布時將整個 `pressure-care` 資料夾上傳即可。手機使用時，檔案選擇器會要求使用相機（`capture="environment"`）。

正式版本還需要後端帳號驗證、雲端資料庫、圖片加密儲存、權限控管，以及醫療資訊與隱私法規評估。

若要改成後端 OCR，可將 `app.js` 的 `runBloodPressureOCR` 替換為呼叫 `/api/ocr`，後端回傳：

```json
{"sys": 120, "dia": 80, "pulse": 72, "confidence": 0.96}
```
