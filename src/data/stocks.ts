import type { Stock } from '@/sim/types'

/**
 * The Novus Exchange listing.
 *
 * Every company here is invented. Keep it that way — the moment a real company
 * name appears, a game about learning turns into something that looks like a
 * tip sheet.
 *
 * Sectors are chosen so events split the board: an infrastructure announcement
 * should lift some names, leave others flat, and quietly hurt one or two.
 */

const cr = (n: number) => Math.round(n * 1e7 * 100) // crore rupees -> paise
const rs = (n: number) => Math.round(n * 100) // rupees -> paise

export const STOCKS: Stock[] = [
  {
    id: 'sethu',
    name: 'Sethu Infra',
    ticker: 'SETHU',
    sector: 'construction',
    price: rs(412),
    previousClose: rs(408),
    fairValue: rs(430),
    volatility: 0.022,
    fundamentals: { marketCap: cr(8200), revenue: cr(3100), earnings: cr(240), peRatio: 34.1, revenueGrowth: 0.18, debtToEquity: 1.4 },
  },
  {
    id: 'kalash',
    name: 'Kalash Cement',
    ticker: 'KLSH',
    sector: 'cement',
    price: rs(1180),
    previousClose: rs(1195),
    fairValue: rs(1150),
    volatility: 0.016,
    fundamentals: { marketCap: cr(14500), revenue: cr(6800), earnings: cr(710), peRatio: 20.4, revenueGrowth: 0.09, debtToEquity: 0.6 },
  },
  {
    id: 'lohit',
    name: 'Lohit Steel',
    ticker: 'LOHT',
    sector: 'steel',
    price: rs(268),
    previousClose: rs(272),
    fairValue: rs(255),
    volatility: 0.028,
    fundamentals: { marketCap: cr(5400), revenue: cr(9200), earnings: cr(310), peRatio: 17.4, revenueGrowth: 0.04, debtToEquity: 1.9 },
  },
  {
    id: 'suvarna',
    name: 'Suvarna Bank',
    ticker: 'SUVB',
    sector: 'banking',
    price: rs(742),
    previousClose: rs(738),
    fairValue: rs(760),
    volatility: 0.014,
    fundamentals: { marketCap: cr(31000), revenue: cr(12400), earnings: cr(2600), peRatio: 11.9, revenueGrowth: 0.13, debtToEquity: 0 },
  },
  {
    id: 'tarang',
    name: 'Tarang Payments',
    ticker: 'TRNG',
    sector: 'payments',
    price: rs(96),
    previousClose: rs(101),
    fairValue: rs(88),
    volatility: 0.041,
    fundamentals: { marketCap: cr(2900), revenue: cr(640), earnings: cr(-70), peRatio: 0, revenueGrowth: 0.44, debtToEquity: 0.2 },
  },
  {
    id: 'anvaya',
    name: 'Anvaya Systems',
    ticker: 'ANVY',
    sector: 'it',
    price: rs(1620),
    previousClose: rs(1612),
    fairValue: rs(1640),
    volatility: 0.013,
    fundamentals: { marketCap: cr(42000), revenue: cr(18900), earnings: cr(3400), peRatio: 12.4, revenueGrowth: 0.07, debtToEquity: 0.1 },
  },
  {
    id: 'vaidya',
    name: 'Vaidya Pharma',
    ticker: 'VDYA',
    sector: 'pharma',
    price: rs(884),
    previousClose: rs(879),
    fairValue: rs(900),
    volatility: 0.019,
    fundamentals: { marketCap: cr(11800), revenue: cr(4300), earnings: cr(620), peRatio: 19.0, revenueGrowth: 0.11, debtToEquity: 0.3 },
  },
  {
    id: 'grihini',
    name: 'Grihini Foods',
    ticker: 'GRHN',
    sector: 'consumer',
    price: rs(534),
    previousClose: rs(533),
    fairValue: rs(540),
    volatility: 0.011,
    fundamentals: { marketCap: cr(9600), revenue: cr(5100), earnings: cr(430), peRatio: 22.3, revenueGrowth: 0.06, debtToEquity: 0.2 },
  },
  {
    id: 'jyoti',
    name: 'Jyoti Power',
    ticker: 'JYOT',
    sector: 'energy',
    price: rs(198),
    previousClose: rs(203),
    fairValue: rs(190),
    volatility: 0.026,
    fundamentals: { marketCap: cr(6700), revenue: cr(7400), earnings: cr(380), peRatio: 17.6, revenueGrowth: 0.03, debtToEquity: 2.2 },
  },
  {
    id: 'patha',
    name: 'Patha Logistics',
    ticker: 'PATH',
    sector: 'logistics',
    price: rs(356),
    previousClose: rs(351),
    fairValue: rs(370),
    volatility: 0.023,
    fundamentals: { marketCap: cr(4100), revenue: cr(2700), earnings: cr(180), peRatio: 22.8, revenueGrowth: 0.21, debtToEquity: 0.9 },
  },
  {
    id: 'meruvi',
    name: 'Meruvi Housing Finance',
    ticker: 'MERU',
    sector: 'banking',
    price: rs(288),
    previousClose: rs(296),
    fairValue: rs(265),
    volatility: 0.033,
    fundamentals: { marketCap: cr(3800), revenue: cr(1900), earnings: cr(210), peRatio: 18.1, revenueGrowth: 0.26, debtToEquity: 4.1 },
  },
  {
    id: 'chitra',
    name: 'Chitra Retail',
    ticker: 'CHTR',
    sector: 'consumer',
    price: rs(1042),
    previousClose: rs(1030),
    fairValue: rs(980),
    volatility: 0.024,
    fundamentals: { marketCap: cr(15200), revenue: cr(8800), earnings: cr(410), peRatio: 37.1, revenueGrowth: 0.16, debtToEquity: 0.7 },
  },
]

/**
 * Two of these are deliberate traps for a player who only reads the price.
 * Meruvi carries 4.1x debt to equity, which is fine until rates move.
 * Chitra is priced at 37 times earnings on 16% growth, which needs everything
 * to keep going right. Neither is labelled in the UI. That is the point.
 */
