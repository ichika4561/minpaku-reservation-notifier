/**
 * 優先順位リスト(ROOM_ASSIGNMENT_MAP)に基づいて空いている部屋を割り当てる関数
 */
const getRoomNumber = (booking, existingArray) => {
  // main.js で定義された ROOM_ASSIGNMENT_MAP から候補リストを取得
  const assignedRooms = ROOM_ASSIGNMENT_MAP[booking.roomId];

  // 候補リストがない、または空の場合はログを出力
  if (!assignedRooms || assignedRooms.length === 0) {
    Logger.log(`RoomID ${booking.roomId} に対する割り当て候補(assignedRooms)が設定されていません。`);
    return null; // 必要に応じてデフォルト値を設定してください
  }

  // ★追加: 候補が1つだけなら、重複チェックをせずにその部屋を返す
  if (assignedRooms.length === 1) {
    return assignedRooms[0];
  }

  // 予約の日程を計算
  const firstNight = getDates(booking.firstNight);
  const checkOut = addOneDay(booking.lastNight);
  const targetCheckout = getDates(checkOut);

  // 候補リストを上から順にチェック（候補が複数の場合のみここまで来る）
  for (const roomCandidate of assignedRooms) {

    // その部屋候補(roomCandidate)について、既存予約との重複を確認
    const hasConflict = existingArray.some(existing => {
      // 部屋番号が違うなら重複しない
      if (String(existing.RoomNumber) !== String(roomCandidate)) {
        return false;
      }

      const existingCheckIn = getDates(existing.CheckIn);
      const existingCheckOut = getDates(existing.CheckOut);

      // 期間の重複判定
      return (
        (firstNight >= existingCheckIn && firstNight < existingCheckOut) ||
        (targetCheckout > existingCheckIn && targetCheckout <= existingCheckOut) ||
        (firstNight <= existingCheckIn && targetCheckout >= existingCheckOut)
      );
    });

    // コンフリクトがなければ、この部屋を採用して終了
    if (!hasConflict) {
      Logger.log(`Assigned Room: ${roomCandidate}`);
      return roomCandidate;
    }
  }

  Logger.log(`警告: RoomID ${booking.roomId} の候補部屋すべて(${assignedRooms.join(', ')})が埋まっています。`);
  return null;
};
