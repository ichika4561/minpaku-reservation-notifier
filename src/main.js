const IS_TEST_MODE = false;

const props = PropertiesService.getScriptProperties();

// Beds24APIキー
const API_KEY = props.getProperty('BEDS24_API_KEY');

// LINE通知用
const ChannelAccessToken = props.getProperty('DEV_LINE_CHANNEL_ACCESS_TOKEN');

// const ChannelAccessToken = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');

// 井尻清掃会社（深町さん）のLINEグループID
const LINE_GROUP_IJIRI = 'C39a22d60cbd917fa49cc5c5199ff6b27';

// 物件ごとの設定を一元管理
// lineGroupId: null → LINE通知しない
const PROPERTY_CONFIG = {
  '547172': { facilityName: '南福岡ルネッサンス',        facilityNum: "'0038393", rooms: ['405', '605'], lineGroupId: null },
  '547174': { facilityName: '南福岡ルネッサンス',        facilityNum: "'0038393", rooms: ['502'],        lineGroupId: null },
  '586879': { facilityName: 'ソフィアたかき(貝塚)',      facilityNum: "'0040711", rooms: ['202'],        lineGroupId: null },
  '594999': { facilityName: 'コーポプチミラージュ(井尻)', facilityNum: "'0042005", rooms: ['203'],        lineGroupId: LINE_GROUP_IJIRI },
  '662306': { facilityName: 'コーポプチミラージュ(井尻)', facilityNum: "'0042005", rooms: ['202'],        lineGroupId: LINE_GROUP_IJIRI },
  '662309': { facilityName: 'コーポプチミラージュ(井尻)', facilityNum: "'0042005", rooms: ['202'],        lineGroupId: LINE_GROUP_IJIRI },
  '602449': { facilityName: 'ガレット空港前',            facilityNum: "'0042013", rooms: ['107'],        lineGroupId: null },
  '614459': { facilityName: 'ポートハウス天神',          facilityNum: "'0042315", rooms: ['306'],        lineGroupId: null },
};

const ROOM_ASSIGNMENT_MAP = Object.fromEntries(
  Object.entries(PROPERTY_CONFIG).map(([roomId, cfg]) => [roomId, cfg.rooms])
);

// 💡 施設ごとの設定をグローバル定数として定義

// コーポプチミラージュ (IJIRIGoodStay 285193: 202tatami + 203modern)
const PROP_KEY_IJIRI = 'IJIRIqbPpTyf9bBLDQi';
const SPREADSHEET_ID_IJIRI = '1zBIxaa8bZam9JcL3Ta_CD_nRrxvjfae-3U_cIMtqUkc';
const SHEET_NAME_IJIRI = "予約リスト(自動更新)";

// コーポプチミラージュ (IjiriGoodStay 318146: 202号室)
const PROP_KEY_IJIRI_202 = 'ijiri202_37whghea7';
const SPREADSHEET_ID_IJIRI_202 = '1zBIxaa8bZam9JcL3Ta_CD_nRrxvjfae-3U_cIMtqUkc';
const SHEET_NAME_IJIRI_202 = "予約リスト(自動更新)";

// ポートハウス天神
const PROP_KEY_TENJIN = 'tenjin9krs0gsg98gij';
const SPREADSHEET_ID_TENJIN = '1zBIxaa8bZam9JcL3Ta_CD_nRrxvjfae-3U_cIMtqUkc';
const SHEET_NAME_TENJIN = "予約リスト(自動更新)";

// ガレット空港前
const PROP_KEY_KUKOUMAE = 'kukou9ygTGVLobPkP3A';
const SPREADSHEET_ID_KUKOUMAE = '1zBIxaa8bZam9JcL3Ta_CD_nRrxvjfae-3U_cIMtqUkc';
const SHEET_NAME_KUKOUMAE = "予約リスト(自動更新)";

// ソフィアたかき
const PROP_KEY_KAIDUKA_SOFIA = 'kaiCxq3Ha9unneHL';
const SPREADSHEET_ID_KAIDUKA_SOFIA = '1zBIxaa8bZam9JcL3Ta_CD_nRrxvjfae-3U_cIMtqUkc';
const SHEET_NAME_KAIDUKA_SOFIA = "予約リスト(自動更新)";

// 南福岡ルネッサンス
const PROP_KEY_MINAMI_RU = '4jsWy00rLiYcsK9UJA9';
const SPREADSHEET_ID_MINAMI_RU= '1zBIxaa8bZam9JcL3Ta_CD_nRrxvjfae-3U_cIMtqUkc';
const SHEET_NAME_MINAMI_RU = "予約リスト(自動更新)";


// 指定がない場合は本日以降の予約を取得
const getBookInfo = (propKey) => {
  const URL = 'https://www.beds24.com/api/json/getBookings';

  const response = UrlFetchApp.fetch(URL, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
    authentication: {
      apiKey: API_KEY,
      propKey: propKey,
    },
    "arrivalFrom": "20260622",
    }),
  });

  return JSON.parse(response.getContentText());
}

const updateBookingSheet = (propKey, sheetName, spreadsheetId) => {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    Logger.log(`スプレッドシートID: ${spreadsheetId} 内にシート名 ${sheetName} が見つかりません`);
    return;
  }

  // 1) 必須カラムのインデックス取得
  const indexes = getRequiredColumnIndexes(sheet, {
    bookingId: "BookingId",
    checkIn: "チェックイン",
    checkOut: "チェックアウト",
    roomNumber: "部屋番号", // このカラムの位置が変更されても、ヘッダーで参照するため影響なし
    cancel: "キャンセル",
    cancelTime: "キャンセル時刻",
  });
  if (!indexes) return;

  // 2) 既存データを読み取り
  const { existingById, existingArray } = readExistingBookings(sheet, indexes);

  // 3) APIから予約一覧を取得
  const bookings = IS_TEST_MODE ? testBookings : getBookInfo(propKey);


  // 4) 追加・更新処理
  bookings.forEach((b) =>
    upsertOneBooking(sheet, indexes, existingById, existingArray, b)
  );
};

// ----------------------------------------------------------------------
// 新しい実行関数
// ----------------------------------------------------------------------

/**
 * プロパティごとに updateBookingSheet を実行するためのメイン関数
 */
const main = () => {
    updateBookingSheet(PROP_KEY_TENJIN, SHEET_NAME_TENJIN, SPREADSHEET_ID_TENJIN);
    updateBookingSheet(PROP_KEY_KUKOUMAE, SHEET_NAME_KUKOUMAE, SPREADSHEET_ID_KUKOUMAE);
    updateBookingSheet(PROP_KEY_KAIDUKA_SOFIA, SHEET_NAME_KAIDUKA_SOFIA, SPREADSHEET_ID_KAIDUKA_SOFIA);
    updateBookingSheet(PROP_KEY_MINAMI_RU, SHEET_NAME_MINAMI_RU, SPREADSHEET_ID_MINAMI_RU);
    updateBookingSheet(PROP_KEY_IJIRI, SHEET_NAME_IJIRI, SPREADSHEET_ID_IJIRI);
    updateBookingSheet(PROP_KEY_IJIRI_202, SHEET_NAME_IJIRI_202, SPREADSHEET_ID_IJIRI_202);

    // 別の施設がある場合は、以下のように追加で呼び出せます
    // const PROP_KEY2 = 'anotherpropkeyabc';
    // const SPREADSHEET_ID2 = '別のスプレッドシートID';
    // const SHEET_NAME2 = '別のシート名';
    // updateBookingSheet(PROP_KEY2, SHEET_NAME2, SPREADSHEET_ID2);
};


// ----------------------------------------------------------------------
// 小さな責務の関数たち（修正箇所あり）
// ----------------------------------------------------------------------

const getRequiredColumnIndexes = (sheet, headerMap) => {
  const lastCol = sheet.getLastColumn() || 1;
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  const idx = Object.fromEntries(
    Object.entries(headerMap).map(([key, label]) => [key, headers.indexOf(label) + 1])
  );

  const missing = Object.entries(idx).filter(([, v]) => v === 0);
  if (missing.length) {
    const need = Object.values(headerMap).join(", ");
    Logger.log(`必須カラム名（${need}）のいずれかが見つかりません`);
    return null;
  }
  return idx;
};

const readExistingBookings = (sheet, idx) => {
  const data = sheet.getDataRange().getValues();
  const existingById = {};
  const existingArray = [];

  data.slice(1).forEach((row, i) => {
    const bookId = row[idx.bookingId - 1];
    if (!bookId) return;

    existingById[bookId] = {
      rowNum: i + 2,
      cancel: normalizeCancel(row[idx.cancel - 1]),
      roomNumber: row[idx.roomNumber - 1],
      checkIn: String(row[idx.checkIn - 1] || ""),
      checkOut: String(row[idx.checkOut - 1] || ""),
    };

    existingArray.push({
      BookingId: bookId,
      CheckIn: row[idx.checkIn - 1],
      CheckOut: row[idx.checkOut - 1],
      RoomNumber: row[idx.roomNumber - 1],
    });
  });

  return { existingById, existingArray };
};

const upsertOneBooking = (sheet, idx, existingById, existingArray, booking) => {
  const {
    bookId,
    firstNight,
    lastNight,
    status,
    cancelTime,
    guestName,
    guestFirstName,
    referer,
    numAdult,
    numChild,
    guestCountry,
    roomId: rawRoomId,
  } = booking;

  const checkIn = firstNight;
  const checkOut = formatDate(addOneDay(lastNight));
  const newCancel = status === "0" ? "TRUE" : "";

  const roomId = String(rawRoomId);
  const config = PROPERTY_CONFIG[roomId] || {};
  const facilityName = config.facilityName || '不明な施設';
  const facilityNum = config.facilityNum || "";

  if (existingById[bookId]) {
    updateExistingRow(sheet, idx, existingById[bookId], { bookId, newCancel, cancelTime, checkIn, checkOut });
  } else {
    // 部屋番号は、roomIDから取得できる情報がない場合、グローバル定数のデフォルトを使用
      const roomNumber = getRoomNumber(booking, existingArray);

    const numberOfGuests = toNumber(numAdult) + toNumber(numChild);
    const guestCountryName = getCountryNameFromCode(guestCountry);

    // 施設番号、施設名、部屋番号の順序を変更して渡す
    appendNewBookingRow(sheet, idx, {
      bookId,
      guestName,
      guestFirstName,
      checkIn,
      checkOut,
      facilityNum,
      facilityName,
      roomNumber,
      referer,
      numAdult: toNumber(numAdult),
      numChild: toNumber(numChild),
      numberOfGuests,
      guestCountryName,
      cancel: newCancel,
      cancelTime: cancelTime || "",
    });

    const lineGroupId = config.lineGroupId || null;
    const today = getDates(new Date());
    const isTodayCheckIn = checkIn === today;
    const shouldNotify = lineGroupId && newCancel !== "TRUE" && (isTodayCheckIn || true);
    // 当日IN以外も通知する場合は上の `|| true` を残す。当日INのみにするなら `isTodayCheckIn` だけにする

    if (shouldNotify) {
      pushNewBookingLineNotification({
        lineGroupId,
        facilityName,
        checkIn,
        checkOut,
        roomNumber,
        guestName,
        guestFirstName,
        numberOfGuests,
        guestCountryName,
        referer,
      });
    } else if (newCancel === "TRUE") {
      Logger.log(`新規追加されたBookingId ${bookId} はキャンセル済みのため、LINE通知は送信しませんでした。`);
    } else if (!lineGroupId) {
      Logger.log(`BookingId ${bookId} の物件(roomId: ${roomId})にはLINE通知先が設定されていません。`);
    }
  }
};

const updateExistingRow = (sheet, idx, existing, { bookId, newCancel, cancelTime, checkIn, checkOut }) => {
  const row = existing.rowNum;
  const currentCancel = existing.cancel;

  // 日付変更チェック
  const normalizedCheckIn = String(checkIn || "").slice(0, 10);
  const normalizedCheckOut = String(checkOut || "").slice(0, 10);
  const existingCheckIn = String(existing.checkIn || "").slice(0, 10);
  const existingCheckOut = String(existing.checkOut || "").slice(0, 10);

  if (normalizedCheckIn !== existingCheckIn) {
    sheet.getRange(row, idx.checkIn).setValue(checkIn);
    Logger.log(`BookingId ${bookId} のチェックインを ${existingCheckIn} → ${normalizedCheckIn} に更新しました。`);
  }
  if (normalizedCheckOut !== existingCheckOut) {
    sheet.getRange(row, idx.checkOut).setValue(checkOut);
    Logger.log(`BookingId ${bookId} のチェックアウトを ${existingCheckOut} → ${normalizedCheckOut} に更新しました。`);
  }

  if (currentCancel === newCancel) return;

  sheet.getRange(row, idx.cancel).setValue(newCancel);
  sheet.getRange(row, idx.cancelTime).setValue(cancelTime || "");

  if (newCancel === "TRUE") {
    const currentRoomNumber = String(existing.roomNumber || "");
    if (!currentRoomNumber.endsWith("_キャンセル")) {
      const newRoomNumber = `${currentRoomNumber}_キャンセル`;
      sheet.getRange(row, idx.roomNumber).setValue(newRoomNumber);
      Logger.log(
        `BookingId ${bookId} がキャンセルされたため、部屋番号を ${newRoomNumber} に更新しました。`
      );
    }
  }
};

// 💡 修正: roomNumberをfacilityNameとrefererの間に移動
const appendNewBookingRow = (sheet, idx, payload) => {
  const {
    bookId,
    guestName,
    guestFirstName,
    checkIn,
    checkOut,
    facilityNum,
    facilityName,
    roomNumber,
    referer,
    numAdult,
    numChild,
    numberOfGuests,
    guestCountryName,
    cancel,
    cancelTime,
  } = payload;

  sheet.appendRow([
    bookId,
    `${guestName || ""} ${guestFirstName || ""}`.trim(),
    checkIn,
    checkOut,
    facilityNum,
    facilityName,
    roomNumber,
    referer,
    numAdult,
    numChild,
    numberOfGuests,
    guestCountryName,
    cancel,
    cancelTime,
  ]);
};

const pushNewBookingLineNotification = ({
  lineGroupId,
  facilityName,
  checkIn,
  checkOut,
  roomNumber,
  guestName,
  guestFirstName,
  numberOfGuests,
  guestCountryName,
  referer,
}) => {
  pushLineMessage(
    lineGroupId,
    `お疲れ様です！
宿泊施設名：【${facilityName}】
・チェックイン：${checkIn}
・チェックアウト：${checkOut}
・部屋番号: ${roomNumber}
・ゲスト名： ${(guestName || "") + " " + (guestFirstName || "")}
・ゲスト人数： ${numberOfGuests}
・国籍： ${guestCountryName || "不明"}

・OTA(予約サイト)： ${referer || "不明"}
`
  );
};

/* ===============================
 * ユーティリティ（変更なし）
 * =============================== */
const toNumber = (n) => Number(n || 0);

const normalizeCancel = (val) =>
  String(val).toUpperCase() === "TRUE" ? "TRUE" : "";

// 日付を1日加算する関数
const addOneDay = dateStr => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + 1);
  return date;
};

const getDates = (date) => {
  // 日付部分だけを取得（時刻情報を除外）
  return Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), "yyyy-MM-dd")
}

// YYYY-MM-DD 形式にフォーマットする関数
const formatDate = date => {
  const year = date.getFullYear();
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const day = ('0' + date.getDate()).slice(-2);
  return `${year}-${month}-${day}`;
};
