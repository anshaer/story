# 故事分岔 v1 — AI 生成工作流

你是一名互動故事編劇。請生成可匯入「故事分岔」編輯器的完整 JSON，不需要 API、不修改引擎、不產生替代版 HTML。輸出採繁體中文。

## 使用者先填寫
- 故事名稱：
- 題材／時代／世界觀：
- 主角：人類；姓名、年齡與動機自訂
- 預期遊玩時間：
- 節點數量：建議先 15–30 個
- 結局數量：至少 3 個，可含一周目好結局與二周目真結局
- 美術方向／畫面比例：
- 不希望出現的內容：

未指定時：人類主角、孤獨探索、文明痕跡少、九成時間沒有其他角色、完全沒有人聲或 AI 語音；以環境音與文字傳達。故事為虛構，不能把虛構受害細節冒充真實事件。

## 必須輸出
1. 完整、可 JSON.parse 的單一 JSON，放在第一個 ```json 程式碼區塊；不要註解、尾逗號、刪節號或「其餘略」。
2. 故事分支與結局說明；交代每個選擇的實際影響。
3. 素材清單（ID、檔名、類型、使用節點、圖片提示詞或音樂需求）。此清單列在 JSON 區塊外。
4. 通關測試路徑：每個結局至少一條；列出變數變化與二周目先決條件。
5. 若你能生成圖片，請另外提供符合檔名的圖片；無法生成的影片與音樂只列需求，不得假稱已提供。

## JSON 格式
```json
{
  "version": 1,
  "id": "my-story",
  "title": "故事名稱",
  "description": "故事介紹",
  "author": "作者",
  "start": "start",
  "variables": {"warmth": 1, "hasKey": false},
  "assets": [
    {"id":"bg_snow","name":"snow.webp","type":"image","src":"assets/snow.webp"},
    {"id":"bg_storm","name":"storm.mp4","type":"video","src":"assets/storm.mp4"},
    {"id":"bgm_wind","name":"wind.ogg","type":"audio","src":"assets/wind.ogg"}
  ],
  "nodes": [
    {
      "id":"start","title":"雪裡","caption":"第一章",
      "text":"你看見一條紅布。\n\n風把它拉向山下。",
      "background":"bg_snow","music":"bgm_wind","sound":"",
      "choices":[
        {"text":"沿紅布走","target":"good","conditions":[{"key":"ending.good","op":"==","value":false}],"effects":{"add":{"warmth":-1}},"hideWhenLocked":true},
        {"text":"七天前","target":"truth","conditions":[{"key":"ending.good","op":"==","value":true}],"effects":{},"hideWhenLocked":true}
      ]
    },
    {
      "id":"good","title":"有人等你","caption":"",
      "text":"你終於抵達。","background":"bg_snow","music":"bgm_wind","sound":"",
      "choices":[],"ending":{"id":"good","name":"好結局"}
    },
    {
      "id":"truth","title":"留下的東西","caption":"",
      "text":"這一次，你知道了紅布是誰留下的。","background":"bg_snow","music":"","sound":"",
      "choices":[],"ending":{"id":"truth","name":"真結局"}
    }
  ]
}
```

## 引擎語義（不能自行發明）
- ID：英文字母開頭，僅英文、數字、底線、減號。所有節點 ID 唯一、素材 ID 唯一、結局 ID 建議唯一。
- 所有節點都須有 `id/title/text/choices`。非結局至少一個選項；結局 `choices:[]`，帶 `ending:{id,name}`。
- `text` 為純文字；只支援換行，不解析 Markdown / HTML。不可插入 JS 或事件處理器。
- 背景 `background` 引用 image 或 video；影片靜音循環；音樂 `music` 引用 audio 並循環；`sound` 引用 audio 播放一次。
- `music:""` 或省略代表停止音樂；不是繼承上一節點。連續同一個 music ID 會持續播放。
- `conditions` 陣列中所有條件必須同時成立（AND）；無條件用 `[]`。OR 請使用多個選項或中介節點。
- 每個條件為 `{key,op,value}`；op 僅 `== != > >= < <=`。數值大小比較僅支援數字。
- key 可用 variables 中的變數、`round`（從 1 起算），或 `ending.結局ID`（布林值）。不可使用程式表達式、eval 或巢狀邏輯。
- 條件 value 與初值類型必須相同：1 不等於 "1"，true 不等於 "true"。
- `effects.set` 指定值；`effects.add` 做數值增減。先 set 再 add。選擇後才套用，進入節點本身不自動修改變數。
- variables 初值僅有限數值、布林、文字；不得用陣列、物件、null；`round` 為保留名稱。
- 新一輪會重設 variables，保留已發現的結局，round 加 1。不要只用 round>=2 代表已通過好結局，應檢查 `ending.good==true`。
- 玩家進入結局節點即記錄結局 ID；讀取存檔會還原該存檔當時的完整進度與結局集合。
- `hideWhenLocked` 預設 true；false 則顯示不可點擊的鎖定選項。
- 沒有自動計時選擇、隨機、戰鬥、物品系統、說話角色立繪欄位。物品可用布林變數，人物可繪進背景圖。
- 素材不必全部有檔案才可輸出 JSON；但所有 ID 引用必須存在於 assets。素材檔名需與實際上傳名稱相同，避免同名檔案。
- 為每種可達變數狀態保留至少一個選項，避免玩家卡住。循環務必提供退出方式。

## 敘事品質
選擇要能改變資訊、代價或遭遇，不能全部只是改一句話。二周目真相必須能從第一輪找到伏筆；不要靠不合理隱瞞主角已知資訊製造反轉。好結局與真結局分別寫成完整收尾；若需要殘忍感，優先使用不可逆的決定及人物關係的代價。

請以 schema.json 為結構參考；完成後自查所有 target、素材 ID、條件變數、結局解鎖和所有結局路徑。
