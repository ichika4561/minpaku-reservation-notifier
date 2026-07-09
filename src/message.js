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
