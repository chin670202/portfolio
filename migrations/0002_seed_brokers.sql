-- Seed 14 Taiwan securities brokers
INSERT OR REPLACE INTO brokers (id, name, name_en, tw_stock_discount, tw_stock_min_fee, us_stock_fee_rate, us_stock_min_fee, notes, sort_order)
VALUES
  ('cathay', '國泰證券', 'Cathay Securities', 0.28, 1, 0.001, 0, '台股電子下單2.8折（線上開戶標準優惠）。美股0.1%免低消，ETF均一價3美元。', 1),
  ('yuanta', '元大證券', 'Yuanta Securities', 0.6, 20, 0.001, 1, '台股牌告6折，可協商至2.8~3.8折。美股0.1%低消1美元（促銷價）。券源最多。', 2),
  ('fubon', '富邦證券', 'Fubon Securities', 0.6, 20, 0.0006, 0, '台股牌告6折，新戶100萬內享1.8折。美股新戶0.06%免低消。', 3),
  ('sinopac', '永豐金證券', 'SinoPac Securities', 0.2, 1, 0.0008, 0, '大戶投APP每月成交100萬內享2折，超過6.5折。美股約0.08%免低消。', 4),
  ('kgi', '凱基證券', 'KGI Securities', 0.6, 20, 0.005, 39.9, '台股牌告6折，新戶前3個月可享2.5~2.8折，可協商至3~5折。', 5),
  ('ctbc', '中國信託證券', 'CTBC Securities', 0.38, 20, 0.005, 35, '台股3.8折。美股牌告0.5%低消35美元。', 6),
  ('esun', '玉山證券', 'E.SUN Securities', 0.6, 20, 0.005, 35, '台股牌告6折，依交易量可降至3.8折。富果帳戶零股最低1元。', 7),
  ('taishin', '台新證券', 'Taishin Securities', 0.28, 20, 0.005, 35, '台股線上開戶2.8折。美股牌告0.5%低消35美元。', 8),
  ('jihsun', '日盛證券', 'JihSun Securities', 0.6, 20, NULL, NULL, '台股牌告6折。已併入國泰金控體系。', 9),
  ('capital', '群益證券', 'Capital Securities', 0.65, 20, 0.002, 3, '台股牌告6.5折，可與營業員協商。美股0.2%低消3美元。', 10),
  ('ibf', '國票證券', 'IBF Securities', 0.65, 20, 0.005, 39, '台股牌告6.5折，線上開戶可能取得2.8折。定期定額及零股最低1元。', 11),
  ('mega', '兆豐證券', 'Mega Securities', 0.5, 20, 0.004, 0, '台股5折。美股約0.4%免低消（優惠期間）。', 12),
  ('hnanb', '華南永昌證券', 'Hua Nan Securities', 0.65, 1, 0.005, 35, '台股牌告6.5折，最低手續費1元。', 13),
  ('president', '統一證券', 'President Securities', 0.6, 1, 0.005, 39.9, '台股牌告6折（UMONEY帳戶1.68~2.5折依資產規模），最低1元。', 14);
