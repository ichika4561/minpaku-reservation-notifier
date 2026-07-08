# minpaku-reservation-notifier 仕様書

Beds24 の予約データを Google スプレッドシートに自動同期する Google Apps Script。

## システム構成

```
Beds24 API → GAS (main.js) → Google スプレッドシート
```

- リポジトリ: https://github.com/ichika4561/minpaku-reservation-notifier
- ローカルパス: 秘書/minpaku/minpaku-reservation-notifier/
- GAS デプロイ: clasp push（config_personal/.clasp.json を使用）
- スプレッドシート: 全物件共通 `1zBIxaa8bZam9JcL3Ta_CD_nRrxvjfae-3U_cIMtqUkc`、シート名「予約リスト(自動更新)」

## ファイル構成

| ファイル | 役割 |
|---------|------|
| `src/main.js` | メイン処理（設定定数・API呼び出し・スプシ更新） |
| `src/message.js` | LINE Push 通知送信 |
| `src/roomNumber-getter.js` | 部屋番号の自動割り当て |
| `src/lang.js` | 国コード → 国名変換 |
| `src/test.js` | テスト用ダミー予約データ |

## 管理物件一覧

| 物件名 | Room ID | 部屋番号 | propKey 定数 | 施設番号 |
|--------|---------|---------|-------------|---------|
| 南福岡ルネッサンス 405/605 | `547172` | 405 → 605（競合時） | `PROP_KEY_MINAMI_RU` | 0038393 |
| 南福岡ルネッサンス 502 | `547174` | 502 | `PROP_KEY_MINAMI_RU` | 0038393 |
| ソフィアたかき(貝塚) | `586879` | 202 | `PROP_KEY_KAIDUKA_SOFIA` | 0040711 |
| コーポプチミラージュ(井尻) 203 | `594999` | 203 | `PROP_KEY_IJIRI` | 0042005 |
| コーポプチミラージュ(井尻) 202 tatami | `662306` | 202 | `PROP_KEY_IJIRI` | 0042005 |
| コーポプチミラージュ(井尻) 202 | `662309` | 202 | `PROP_KEY_IJIRI_202` | 0042005 |
| ガレット空港前 | `602449` | 107 | `PROP_KEY_KUKOUMAE` | 0042013 |
| ポートハウス天神 | `614459` | 306 | `PROP_KEY_TENJIN` | 0042315 |

※ Room ID は Beds24 の roomId（物件内の部屋単位の ID）。部屋番号はスプレッドシートに記録される物理的な部屋番号。

## main() の実行内容

7回 `updateBookingSheet()` を呼び出す（井尻は2物件に分かれているため）。

```
TENJIN → KUKOUMAE → KAIDUKA_SOFIA → MINAMI_RU → IJIRI → IJIRI_202
```

各呼び出しで以下を実行：
1. Beds24 API から `arrivalFrom` 以降の予約を取得
2. スプレッドシートの既存データを読み取り
3. 予約ごとに upsert 処理

## upsert ロジック

### 新規（BookingId が未登録）
- `ROOM_ASSIGNMENT_MAP` に基づいて部屋番号を自動割り当て
- スプレッドシートに1行追記
- LINE 通知あり（ルーティングは下記「LINE通知の送信先ルール」参照）
- 追加時点で既にキャンセル済みの場合は通知しない

### 更新（BookingId が既存）
- チェックイン・チェックアウト日が変わっていれば上書き
  - 変化があり、かつキャンセル済みでなければ LINE 通知（日程変更）を送信
- キャンセル状態が変わっていれば以下を更新：
  - キャンセル列 → `TRUE`
  - キャンセル時刻 → Beds24 の cancelTime
  - 部屋番号 → `{番号}_キャンセル`（例: `405_キャンセル`）
  - LINE 通知（キャンセル）を送信
- 変化なしの場合は何もしない

### LINE通知の送信先ルール（新規・変更・キャンセル共通）
- 対象物件に `lineGroupId` が設定されている（井尻）→ 常時通知
- `lineGroupId` が未設定の物件 → チェックインが「本日」の予約のみ `LINE_GROUP_SHIGETA`（しげた整骨院）に通知
- どちらにも該当しない場合は通知しない

## 部屋割り当てロジック（getRoomNumber）

`ROOM_ASSIGNMENT_MAP` の配列順に空き確認を行い、最初に空いている部屋を返す。

- 候補が1部屋のみ → 重複チェックなしでそのまま返す
- 全部屋が埋まっている場合 → `null` を返す（ダブルブッキング防止）

```js
const ROOM_ASSIGNMENT_MAP = {
  '547172': ['405', '605'],  // 405優先、埋まっていれば605
  '547174': ['502'],
  '586879': ['202'],
  '594999': ['203'],
  '662306': ['202'],
  '662309': ['202'],
  '602449': ['107'],
  '614459': ['306'],
};
```

## スプレッドシートの列構成

| 列 | 内容 |
|----|------|
| BookingId | Beds24 の予約ID |
| ゲスト名 | `guestName guestFirstName` |
| チェックイン | YYYY-MM-DD |
| チェックアウト | YYYY-MM-DD（lastNight + 1日） |
| 施設番号 | 宿泊税申請用番号 |
| 施設名 | 物件名 |
| 部屋番号 | 自動割り当て or `{番号}_キャンセル` |
| OTA | Airbnb / Booking.com など |
| 大人 | 人数 |
| 子供 | 人数 |
| 合計人数 | 大人 + 子供 |
| 国籍 | 国コードから変換した国名 |
| キャンセル | `TRUE` or 空白 |
| キャンセル時刻 | キャンセル日時 |

## 動作モード・設定値

| 設定 | 現在値 | 備考 |
|------|--------|------|
| `IS_TEST_MODE` | `false` | true にすると testBookings を使用 |
| LINE 通知 | 稼働中 | 新規予約・日程変更・キャンセルの3種類 |
| LINE 通知先 | `DEV_LINE_GROUP_ID`（全施設共通） | 本番は `AKIYOSI_LINE_GROUP_ID` に変更 |
| `arrivalFrom` | `20260622` | この日付以降の予約を取得 |

## API・認証

- Beds24 API v1: `https://www.beds24.com/api/json/getBookings`
- 認証: `apiKey`（全物件共通）+ `propKey`（物件ごと）
- 各キーは GAS スクリプトプロパティ（`PropertiesService`）で管理
- LINE: `DEV_LINE_CHANNEL_ACCESS_TOKEN` を使用中

## clasp 運用手順

```bash
# 最新コードを GAS から取得
clasp pull

# GAS へ反映
clasp push --force

# 通常のコード変更フロー
# 1. ローカルで編集
# 2. git commit & push
# 3. clasp push --force
```

`.clasp.json`（ルートに配置）は `config_personal/.clasp.json` の内容を `rootDir: "src"` に変更したもの。
