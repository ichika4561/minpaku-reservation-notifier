const pushLineMessage = (roomId, message) => {
  const roomIdStr = String(roomId);
  let targetGroupId = null;

  if (LINE_GROUP_ID_MAP.hasOwnProperty(roomIdStr)) {
    targetGroupId = LINE_GROUP_ID_MAP[roomIdStr];
    Logger.log(`RoomID ${roomIdStr} に対応するGROUP_IDが見つかりました: ${targetGroupId}`);
  } else {
    targetGroupId = DEFAULT_LINE_GROUP_ID;
    Logger.log(`RoomID ${roomIdStr} に対応するGROUP_IDがマップに見つかりません。デフォルトのGROUP_ID (${DEFAULT_LINE_GROUP_ID}) を使用します。`);
  }

  if (!targetGroupId) {
    Logger.log('送信先のGROUP_IDが特定できませんでした。メッセージ送信を中止します。');
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
