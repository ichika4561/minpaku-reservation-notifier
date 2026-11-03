# minpaku-reservation-notifier 仕様書

Beds24 の予約データを Google スプレッドシートに自動同期する Google Apps Script。

目的・業務ルールなどの要件は [REQUIREMENTS.md](REQUIREMENTS.md) を参照。

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
| `src/roomNumber-getter.js` | Beds24 の割当(unitId)から部屋番号を決める |
| `src/lang.js` | 国コード → 国名変換 |
| `src/test.js` | テスト用ダミー予約データ |

## 管理物件一覧

| 物件名 | Room ID | 部屋番号 | propKey 定数 | 施設番号 |
|--------|---------|---------|-------------|---------|
| 南福岡ルネッサンス 405/605 | `547172` | 405（unitId 1）/ 605（unitId 2） | `PROP_KEY_MINAMI_RU` | 0038393 |
| 南福岡ルネッサンス 502 | `547174` | 502 | `PROP_KEY_MINAMI_RU` | 0038393 |
| ソフィアたかき(貝塚) | `586879` | 202 | `PROP_KEY_KAIDUKA_SOFIA` | 0040711 |
| コーポプチミラージュ(井尻) 203 | `594999` | 203 | `PROP_KEY_IJIRI` | 0042005 |
| コーポプチミラージュ(井尻) 202 tatami | `662306` | 202 | `PROP_KEY_IJIRI` | 0042005 |
| コーポプチミラージュ(井尻) 202 | `662309` | 202 | `PROP_KEY_IJIRI_202` | 0042005 |
| ガレット空港前 | `602449` | 107 | `PROP_KEY_KUKOUMAE` | 0042013 |
| ポートハウス天神 | `614459` | 306 | `PROP_KEY_TENJIN` | 0042315 |

※ Room ID は Beds24 の roomId（物件内の部屋単位の ID）。部屋番号はスプレッドシートに記録される物理的な部屋番号。

## main() の実行内容

`PROPERTIES` に定義された 6 つの propKey ごとに `updateBookingSheet()` を呼び出す（井尻は propKey が2つに分かれているため）。

```
TENJIN → KUKOUMAE → KAIDUKA_SOFIA → MINAMI_RU → IJIRI → IJIRI_202
```

スプレッドシートの既存データは、同じシートを使う物件間で最初に1回だけ読み取り、使い回す（追記した行もメモリ上に反映）。

各呼び出しで以下を実行：
1. Beds24 API から「チェックアウトが14日前以降」の予約を取得（`arrivalFrom`=60日前 + `departureFrom`=14日前。v1 は `departureFrom` 単独だと無視されるため併用）
2. 予約ごとに upsert 処理

※ 2026-10-22 改修: 以前は `arrivalFrom` を固定日付（20260525）にして毎回全件取得・物件ごとにシート全体を再読込しており、6分の実行時間上限を超える失敗が1日2〜9回出ていた。チェックアウトが14日より前の予約の変更・キャンセルはシートに反映されない。

## upsert ロジック

### 新規（BookingId が未登録）
- Beds24 の割当（`unitId`）から部屋番号を決める（下記「部屋割り当てロジック」）
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
  - 日程変更のみ追加条件: 変更前または変更後のチェックアウトが「翌日」の予約も `LINE_GROUP_SHIGETA` に通知（新規・キャンセルは対象外）
- どちらにも該当しない場合は通知しない

## 部屋割り当てロジック（getRoomNumber）

2026-11-03 改修: 部屋番号は **Beds24 の割当（`unitId`）をそのまま使う**。以前はスプシ上の既存予約を見て 405→605 の順に空きを探していたが、全泊通しで空く部屋がない予約（Beds24 も `unitId=0` = 部屋未割当）で空欄のまま誰にも気づかれない事故があった（LIU BIN 95597096）。

- `unitId` は `ROOM_ASSIGNMENT_MAP` の並び順に対応（1 = 1番目の部屋）。南福岡 547172 は 1=405 / 2=605
- 候補が1部屋のみ → `unitId` に関係なくその部屋
- 複数部屋で `unitId=0` → `要割当`（定数 `UNASSIGNED_ROOM`）
- 部屋の決め方・移動は **Beds24 側で行う**（スプシを手で直しても、Beds24 と違えば次回実行で上書きされる）

### 部屋の追従・オーナー通知
- 新規予約が `要割当` → オーナーに【要割当】通知（キャンセル済みは `要割当` にせず通知もしない）
- 既存予約（キャンセル以外）で Beds24 の部屋とスプシが違う → スプシを Beds24 に合わせ、**清掃グループ**に【部屋変更】通知（`要割当` → 部屋確定もこれ）。送り先は `lineGroupId`（井尻=深町さん）、なければ `LINE_GROUP_SHIGETA`。当日チェックインに限らず即時送信
- 既存予約で Beds24 が未割当、スプシが空欄 → `要割当` にしてオーナーに【要割当】通知
- 既存予約で Beds24 が未割当、スプシに部屋が入っている → 何もしない（入力済みの部屋は消さない）
- 【要割当】のオーナー通知先: スクリプトプロパティ `OWNER_LINE_CHANNEL_ACCESS_TOKEN`（DevBot @095extxz）があれば broadcast。未設定 or `NOTIFY_TEST_MODE` 時はテストグループ（`DEV_LINE_GROUP_ID` / `DEV_LINE_CHANNEL_ACCESS_TOKEN`）へ push
- 案内送信済みのゲストへの再連絡は自動ではしない（オーナーが対応）

```js
const ROOM_ASSIGNMENT_MAP = {
  '547172': ['405', '605'],  // unitId 1=405, 2=605
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
| 部屋番号 | Beds24 の割当 / `要割当` / `{番号}_キャンセル` |
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
| `NOTIFY_TEST_MODE` | `false` | true にすると全LINE通知を `DEV_LINE_GROUP_ID`（テストグループ）へ差し替え |
| LINE 通知 | 稼働中 | 新規予約・日程変更・キャンセルの3種類 |
| LINE 通知先 | 井尻=深町さんグループ（常時） / 他物件=当日チェックインのみ しげた整骨院グループ | 定数 `LINE_GROUP_IJIRI` / `LINE_GROUP_SHIGETA` |
| `FETCH_DEPARTURE_DAYS_AGO` | `14` | チェックアウトがこの日数前以降の予約を取得 |
| `FETCH_ARRIVAL_DAYS_AGO` | `60` | 長期滞在の取りこぼし防止用の到着日下限 |

## API・認証

- Beds24 API v1: `https://www.beds24.com/api/json/getBookings`
- 認証: `apiKey`（全物件共通）+ `propKey`（物件ごと）
- 各キーは GAS スクリプトプロパティ（`PropertiesService`）で管理
- LINE: 本番 `LINE_CHANNEL_ACCESS_TOKEN` を使用（`NOTIFY_TEST_MODE=true` 時のみ `DEV_LINE_CHANNEL_ACCESS_TOKEN`）

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
