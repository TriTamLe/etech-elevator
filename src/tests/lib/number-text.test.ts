import { describe, expect, it } from 'vitest'

import { formatNumberText, parseNumberText } from '#/lib/number-text'

describe('parseNumberText — ô số nguyên (mm, số lượng)', () => {
  it.each([
    ['1500', 1500],
    [' 1500 ', 1500],
    ['0', 0],
    ['1.500', 1500],
    ['20.900', 20900],
    ['1.234.567', 1234567],
  ])('"%s" → %d', (text, n) => {
    expect(parseNumberText(text, false)).toBe(n)
  })

  it.each([
    '',
    ' ',
    '1.5',
    '1,5',
    '15.00',
    '1.5000',
    '.500',
    '1.',
    'abc',
    '-5',
  ])('"%s" → NaN', (text) => {
    expect(parseNumberText(text, false)).toBeNaN()
  })
})

describe('parseNumberText — ô số lẻ (tốc độ, móc treo, dây dư)', () => {
  it.each([
    ['2,5', 2.5],
    ['0,75', 0.75],
    ['90', 90],
    ['1.500', 1500],
    ['1.500,5', 1500.5],
    // Lenient: a dot that cannot be a thousands separator is a decimal point.
    ['2.5', 2.5],
    ['90.25', 90.25],
    ['1234.500', 1234.5],
  ])('"%s" → %d', (text, n) => {
    expect(parseNumberText(text, true)).toBe(n)
  })

  it.each(['', '2,', ',5', '2,5,1', '2.5,1', '1.50,5', '2.5.1', 'x'])(
    '"%s" → NaN',
    (text) => {
      expect(parseNumberText(text, true)).toBeNaN()
    },
  )
})

describe('parseNumberText — biên bổ sung', () => {
  it('số nguyên: nhóm nghìn sai dạng → NaN', () => {
    for (const t of [
      '1.50',
      '1.5000',
      '12.34.567',
      '1..500',
      '1 500',
      '1500.',
    ]) {
      expect(parseNumberText(t, false)).toBeNaN()
    }
  })

  it('số lẻ: "1.500" là 1500 còn "1.50" / "1.5000" là thập phân', () => {
    expect(parseNumberText('1.500', true)).toBe(1500)
    expect(parseNumberText('1.50', true)).toBe(1.5)
    expect(parseNumberText('1.5000', true)).toBe(1.5)
  })

  it('số lẻ: có phẩy thì dấu chấm phải là ngăn nghìn đúng dạng', () => {
    expect(parseNumberText('1.234.567,25', true)).toBe(1234567.25)
    expect(parseNumberText('1.5,5', true)).toBeNaN()
  })

  it('nhóm đầu bắt đầu bằng 0 không phải ngăn nghìn: "0.500" ≠ 500', () => {
    for (const t of ['0.500', '00.750', '000.500', '0.500,5']) {
      expect(parseNumberText(t, false)).toBeNaN()
    }
    expect(parseNumberText('0.500', true)).toBe(0.5)
    expect(parseNumberText('00.750', true)).toBe(0.75)
    expect(parseNumberText('0.500,5', true)).toBeNaN()
    expect(parseNumberText('0', false)).toBe(0)
    expect(parseNumberText('0,5', true)).toBe(0.5)
  })

  it('khoảng trắng hai đầu được bỏ, giữa thì NaN', () => {
    expect(parseNumberText('  2,5  ', true)).toBe(2.5)
    expect(parseNumberText('2 ,5', true)).toBeNaN()
  })
})

describe('formatNumberText', () => {
  it('số lẻ dùng dấu phẩy, số nguyên không có dấu ngăn nghìn', () => {
    expect(formatNumberText(2.5, true)).toBe('2,5')
    expect(formatNumberText(90, true)).toBe('90')
    expect(formatNumberText(20900, false)).toBe('20900')
  })

  it('số lẻ nhỏ và số nguyên trong ô số lẻ', () => {
    expect(formatNumberText(0.5, true)).toBe('0,5')
    expect(formatNumberText(1500.5, true)).toBe('1500,5')
    expect(formatNumberText(1500, true)).toBe('1500')
  })

  it('null và NaN → ô trống', () => {
    expect(formatNumberText(null, false)).toBe('')
    expect(formatNumberText(Number.NaN, true)).toBe('')
  })

  it('hiện rồi đọc lại ra đúng số', () => {
    for (const [n, decimal] of [
      [2.5, true],
      [0.75, true],
      [1500.5, true],
      [60, true],
      [20900, false],
      [0, false],
    ] as const) {
      expect(parseNumberText(formatNumberText(n, decimal), decimal)).toBe(n)
    }
  })
})
