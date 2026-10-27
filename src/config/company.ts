// The design company printed on the cover and in every title block (as on the reference
// sets). Change it here only; sheet functions read it, never hard-code it.

export const COMPANY = {
  /** Cover heading, one entry per printed line. */
  nameLines: ['CÔNG TY TNHH EDUCATION SOLUTIONS', 'VIỆT NAM'],
  /** Used in running text (DTP 01). */
  shortName: 'CÔNG TY TNHH EDUCATION SOLUTION VN',
  address:
    'Trụ sở : Tầng 1, Tòa Nhà Vietphone Building, Số 64 Nguyễn Đình Chiểu, P. Đa Kao, Quận 1, TP. HCM',
  phone: 'Điện thoại: (028) 3845 6604',
  logo: {
    href: '/brand/dtp-logo.webp',
    /** Pixel size of the file, for the aspect ratio. */
    width: 1298,
    height: 663,
  },
} as const
