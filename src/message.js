const pushLineMessage = (targetGroupId, message) => {
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
