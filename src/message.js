// オーナー宛通知
// スクリプトプロパティ OWNER_LINE_CHANNEL_ACCESS_TOKEN（DevBot）があれば broadcast（友だちはオーナーのみ）
// 未設定 or テストモード時はテスト用グループ(DEV_LINE_GROUP_ID)へ DEV トークンで push
const pushOwnerLineMessage = (message) => {
  const ownerToken = props.getProperty('OWNER_LINE_CHANNEL_ACCESS_TOKEN');
  const useBroadcast = ownerToken && !NOTIFY_TEST_MODE;

  const url = useBroadcast
    ? "https://api.line.me/v2/bot/message/broadcast"
    : "https://api.line.me/v2/bot/message/push";
  const payload = { messages: [{ type: "text", text: message }] };
  if (!useBroadcast) payload.to = TEST_LINE_GROUP_ID;
  const token = useBroadcast ? ownerToken : props.getProperty('DEV_LINE_CHANNEL_ACCESS_TOKEN');

  Logger.log(`[オーナー通知] ${message}`);
  try {
    const response = UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      headers: { "Authorization": `Bearer ${token}` },
      muteHttpExceptions: true,
    });
    Logger.log(`オーナー通知 Response: ${response.getResponseCode()} ${response.getContentText()}`);
  } catch (e) {
    Logger.log(`オーナー通知の送信に失敗: ${e.toString()}`);
  }
};

const pushLineMessage = (targetGroupId, message) => {
  // ★一時テストモード: 宛先をテスト用グループに差し替え（main.js の NOTIFY_TEST_MODE 参照）
  if (typeof NOTIFY_TEST_MODE !== 'undefined' && NOTIFY_TEST_MODE) {
    Logger.log(`[TEST] 本来の宛先: ${targetGroupId} → テスト用グループに差し替え`);
    targetGroupId = TEST_LINE_GROUP_ID;
    message = `【テスト送信】\n${message}`;
  }

  if (!targetGroupId) {
    Logger.log('送信先のGROUP_IDが指定されていません。メッセージ送信を中止します。');
    return;
  }

  Logger.log(message);

  const url = "https://api.line.me/v2/bot/message/push";
  const payload = {
    to: targetGroupId,
    messages: [{
      type: "text",
      text: message
    }]
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    headers: {
      "Authorization": `Bearer ${ChannelAccessToken}`
    }
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    Logger.log(`LINE Push API Response for GROUP_ID ${targetGroupId}: ${response.getContentText()}`);
  } catch(e) {
    Logger.log(`Error sending LINE message to GROUP_ID ${targetGroupId}: ${e.toString()}`);
  }
}
