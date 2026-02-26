/**
 * Seed broker fee data for Taiwan securities brokers
 * Run once or on startup to ensure data exists
 */

const brokers = [
  {
    id: 'cathay',
    name: '國泰證券',
    name_en: 'Cathay Securities',
    tw_stock_discount: 0.28,
    tw_stock_min_fee: 1,
    us_stock_fee_rate: 0.001,
    us_stock_min_fee: 0,
    notes: '台股電子下單2.8折（線上開戶標準優惠）。美股0.1%免低消，ETF均一價3美元。',
    sort_order: 1,
  },
  {
    id: 'yuanta',
    name: '元大證券',
    name_en: 'Yuanta Securities',
    tw_stock_discount: 0.6,
    tw_stock_min_fee: 20,
    us_stock_fee_rate: 0.001,
    us_stock_min_fee: 1,
    notes: '台股牌告6折，可協商至2.8~3.8折。美股0.1%低消1美元（促銷價）。券源最多。',
    sort_order: 2,
  },
  {
    id: 'fubon',
    name: '富邦證券',
    name_en: 'Fubon Securities',
    tw_stock_discount: 0.6,
    tw_stock_min_fee: 20,
    us_stock_fee_rate: 0.0006,
    us_stock_min_fee: 0,
    notes: '台股牌告6折，新戶100萬內享1.8折。美股新戶0.06%免低消。',
    sort_order: 3,
  },
  {
    id: 'sinopac',
    name: '永豐金證券',
    name_en: 'SinoPac Securities',
    tw_stock_discount: 0.2,
    tw_stock_min_fee: 1,
    us_stock_fee_rate: 0.0008,
    us_stock_min_fee: 0,
    notes: '大戶投APP每月成交100萬內享2折，超過6.5折。美股約0.08%免低消。',
    sort_order: 4,
  },
  {
    id: 'kgi',
    name: '凱基證券',
    name_en: 'KGI Securities',
    tw_stock_discount: 0.6,
    tw_stock_min_fee: 20,
    us_stock_fee_rate: 0.005,
    us_stock_min_fee: 39.9,
    notes: '台股牌告6折，新戶前3個月可享2.5~2.8折，可協商至3~5折。',
    sort_order: 5,
  },
  {
    id: 'ctbc',
    name: '中國信託證券',
    name_en: 'CTBC Securities',
    tw_stock_discount: 0.38,
    tw_stock_min_fee: 20,
    us_stock_fee_rate: 0.005,
    us_stock_min_fee: 35,
    notes: '台股3.8折。美股牌告0.5%低消35美元。',
    sort_order: 6,
  },
  {
    id: 'esun',
    name: '玉山證券',
    name_en: 'E.SUN Securities',
    tw_stock_discount: 0.6,
    tw_stock_min_fee: 20,
    us_stock_fee_rate: 0.005,
    us_stock_min_fee: 35,
    notes: '台股牌告6折，依交易量可降至3.8折。富果帳戶零股最低1元。',
    sort_order: 7,
  },
  {
    id: 'taishin',
    name: '台新證券',
    name_en: 'Taishin Securities',
    tw_stock_discount: 0.28,
    tw_stock_min_fee: 20,
    us_stock_fee_rate: 0.005,
    us_stock_min_fee: 35,
    notes: '台股線上開戶2.8折。美股牌告0.5%低消35美元。',
    sort_order: 8,
  },
  {
    id: 'jihsun',
    name: '日盛證券',
    name_en: 'JihSun Securities',
    tw_stock_discount: 0.6,
    tw_stock_min_fee: 20,
    us_stock_fee_rate: null,
    us_stock_min_fee: null,
    notes: '台股牌告6折。已併入國泰金控體系。',
    sort_order: 9,
  },
  {
    id: 'capital',
    name: '群益證券',
    name_en: 'Capital Securities',
    tw_stock_discount: 0.65,
    tw_stock_min_fee: 20,
    us_stock_fee_rate: 0.002,
    us_stock_min_fee: 3,
    notes: '台股牌告6.5折，可與營業員協商。美股0.2%低消3美元。',
    sort_order: 10,
  },
  {
    id: 'ibf',
    name: '國票證券',
    name_en: 'IBF Securities',
    tw_stock_discount: 0.65,
    tw_stock_min_fee: 20,
    us_stock_fee_rate: 0.005,
    us_stock_min_fee: 39,
    notes: '台股牌告6.5折，線上開戶可能取得2.8折。定期定額及零股最低1元。',
    sort_order: 11,
  },
  {
    id: 'mega',
    name: '兆豐證券',
    name_en: 'Mega Securities',
    tw_stock_discount: 0.5,
    tw_stock_min_fee: 20,
    us_stock_fee_rate: 0.004,
    us_stock_min_fee: 0,
    notes: '台股5折。美股約0.4%免低消（優惠期間）。',
    sort_order: 12,
  },
  {
    id: 'hnanb',
    name: '華南永昌證券',
    name_en: 'Hua Nan Securities',
    tw_stock_discount: 0.65,
    tw_stock_min_fee: 1,
    us_stock_fee_rate: 0.005,
    us_stock_min_fee: 35,
    notes: '台股牌告6.5折，最低手續費1元。',
    sort_order: 13,
  },
  {
    id: 'president',
    name: '統一證券',
    name_en: 'President Securities',
    tw_stock_discount: 0.6,
    tw_stock_min_fee: 1,
    us_stock_fee_rate: 0.005,
    us_stock_min_fee: 39.9,
    notes: '台股牌告6折（UMONEY帳戶1.68~2.5折依資產規模），最低1元。',
    sort_order: 14,
  },
];

function seedBrokers(db) {
  const insert = db.prepare(`
    INSERT OR REPLACE INTO brokers (id, name, name_en, tw_stock_discount, tw_stock_min_fee, us_stock_fee_rate, us_stock_min_fee, notes, sort_order)
    VALUES (@id, @name, @name_en, @tw_stock_discount, @tw_stock_min_fee, @us_stock_fee_rate, @us_stock_min_fee, @notes, @sort_order)
  `);

  const tx = db.transaction(() => {
    for (const broker of brokers) {
      insert.run(broker);
    }
  });
  tx();

  console.log(`Seeded ${brokers.length} brokers`);
}

module.exports = { seedBrokers };
