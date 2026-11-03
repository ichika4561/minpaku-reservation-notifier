// 部屋が決まっていない予約に書く部屋番号
const UNASSIGNED_ROOM = '要割当';

/**
 * Beds24 の割当(unitId)から部屋番号を決める関数
 * unitId は ROOM_ASSIGNMENT_MAP の並び順に対応（1 = 1番目の部屋）
 * - 1部屋だけの roomId は unitId に関係なくその部屋
 * - 複数部屋の roomId で unitId=0（Beds24 で部屋未割当）なら UNASSIGNED_ROOM
 */
const getRoomNumber = (booking) => {
  const assignedRooms = ROOM_ASSIGNMENT_MAP[booking.roomId];

  // 候補リストがない、または空の場合はログを出力
  if (!assignedRooms || assignedRooms.length === 0) {
    Logger.log(`RoomID ${booking.roomId} に対する割り当て候補(assignedRooms)が設定されていません。`);
    return null;
  }

  if (assignedRooms.length === 1) {
    return assignedRooms[0];
  }

  const unitId = Number(booking.unitId || 0);
  if (unitId >= 1 && unitId <= assignedRooms.length) {
    return assignedRooms[unitId - 1];
  }

  Logger.log(`警告: BookingId ${booking.bookId} は Beds24 で部屋が割り当てられていません（unitId=${booking.unitId}）。`);
  return UNASSIGNED_ROOM;
};
