const getRoomNumber = (booking, existingArray) => {
  const assignedRooms = ROOM_ASSIGNMENT_MAP[booking.roomId];


  // 割り当てリストが存在する場合、最初の要素（優先度の高い部屋）を返す
  if (assignedRooms && assignedRooms.length > 0) {
    return assignedRooms[0];
  }


  const firstNight = getDates(booking.firstNight);
  const checkOut = addOneDay(booking.lastNight);
  const targetCheckout = getDates(checkOut);

  const hasConflict = existingArray.some(existing => {
    const existingCheckIn = getDates(existing.CheckIn);
    const existingCheckOut = getDates(existing.CheckOut);
    // if (existing.RoomNumber === 405) {
    // console.log(existingCheckIn, existingCheckOut);
    // console.log(firstNight, targetCheckout);

    // console.log(targetCheckout > existingCheckIn, targetCheckout, existingCheckIn);
    // console.log(targetCheckout <= existingCheckOut);

    // console.log((firstNight >= existingCheckIn && firstNight < existingCheckOut));
    // console.log((targetCheckout > existingCheckIn && targetCheckout <= existingCheckOut));
    // console.log((firstNight <= existingCheckIn && targetCheckout >= existingCheckOut));
    // }


    // 部屋番号が 405 の予約と比較し、期間が重複するか確認
      return existing.RoomNumber === 405 && (
      (firstNight >= existingCheckIn && firstNight < existingCheckOut) ||  // 新しい予約のチェックインが重複
      (targetCheckout > existingCheckIn && targetCheckout <= existingCheckOut) ||   // 新しい予約のチェックアウトが重複
      (firstNight <= existingCheckIn && targetCheckout >= existingCheckOut)     // 新しい予約が既存予約を完全に覆っている
  );
  });

    console.log('hasConflict', hasConflict)


  // 重複がなければ 405、重複があれば 605 を返す
  const assignedRoom = hasConflict ? "605" : "405";
    // const assignedRoom = "405";


  Logger.log(`Assigned Room: ${assignedRoom}`);
  return assignedRoom;
};
