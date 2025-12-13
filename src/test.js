const bookings = [
  {
    bookId: '65100000', // 既存でキャンセルされていなかったものがキャンセルになるケース
    roomId: '547174',
    firstNight: '2026-04-08', // 2026年4月へ変更
    lastNight: '2026-04-12',
    guestFirstName: 'guestFirstName',
    guestName: 'guestName',
    status: '0', // キャンセル
    cancelTime:'2026-04-09 10:00:00', // キャンセル時刻
    referer: 'Booking.com',
    numAdult: 2, numChild: 0, guestCountry: 'JP'
  },
  {
    bookId: '67511111', // 既存で変更なし
    roomId: '547172',
    firstNight: '2026-04-25', // 2026年4月へ変更
    lastNight: '2026-04-27',
    guestFirstName: 'FirstName',
    guestName: 'guestName',
    status: '1', // 有効
    cancelTime:'',
    referer: 'Booking.com',
    numAdult: 1, numChild: 1, guestCountry: 'US'
  },
  {
    bookId: '67522222', // 新規追加
    roomId: '547172',
    firstNight: '2026-05-21', // 2026年5月へ変更
    lastNight: '2026-05-21',
    guestFirstName: 'guestFirstName',
    guestName: 'guestName',
    status: '1', // 有効
    cancelTime:'',
    referer: 'Airbnb',
    numAdult: 3, numChild: 0, guestCountry: 'KR'
  },
  {
    bookId: '99999999', // 既存だが既にキャンセル済みの場合
    roomId: '547175',
    firstNight: '2026-06-01', // 2026年6月へ変更
    lastNight: '2026-06-03',
    guestFirstName: 'Already',
    guestName: 'Cancelled',
    status: '0', // キャンセル
    cancelTime:'2026-05-15 12:00:00', // 2026年5月へ変更
    referer: 'Expedia',
     numAdult: 1, numChild: 0, guestCountry: 'GB'
  }
];
