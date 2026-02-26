import { updateService } from '../config'

const BASE_URL = updateService.baseUrl
const API_KEY = updateService.apiKey

function getHeaders() {
  const h = { 'Content-Type': 'application/json' }
  if (API_KEY) h['X-API-Key'] = API_KEY
  return h
}

export async function fetchTrades(user, params = {}) {
  const searchParams = new URLSearchParams({
    limit: '50',
    sortBy: 'trade_date',
    sortOrder: 'desc',
    ...params,
  })
  const res = await fetch(`${BASE_URL}/trades/${user}?${searchParams}`, { headers: getHeaders() })
  if (!res.ok) throw new Error('取得交易列表失敗')
  return res.json()
}

export async function createTrade(user, trade) {
  const res = await fetch(`${BASE_URL}/trades/${user}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(trade),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || '新增交易失敗')
  }
  return res.json()
}

export async function deleteTrade(user, id) {
  const res = await fetch(`${BASE_URL}/trades/${user}/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  })
  if (!res.ok) throw new Error('刪除失敗')
  return res.json()
}

export async function parseTrade(user, input) {
  const res = await fetch(`${BASE_URL}/trades/${user}/parse`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ input }),
  })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || '解析失敗')
  }
  return res.json()
}

export async function fetchPnl(user, params = {}) {
  const searchParams = new URLSearchParams(params)
  const qs = searchParams.toString()
  const res = await fetch(`${BASE_URL}/pnl/${user}${qs ? '?' + qs : ''}`, { headers: getHeaders() })
  if (!res.ok) throw new Error('取得損益記錄失敗')
  return res.json()
}

export async function fetchStats(user) {
  const res = await fetch(`${BASE_URL}/stats/${user}`, { headers: getHeaders() })
  if (!res.ok) throw new Error('取得統計資料失敗')
  return res.json()
}

// Broker APIs

export async function fetchBrokers() {
  const res = await fetch(`${BASE_URL}/brokers`, { headers: getHeaders() })
  if (!res.ok) throw new Error('取得券商列表失敗')
  return res.json()
}

export async function getDefaultBroker(user) {
  const res = await fetch(`${BASE_URL}/brokers/user/${user}/default`, { headers: getHeaders() })
  if (!res.ok) throw new Error('取得預設券商失敗')
  return res.json()
}

export async function setDefaultBroker(user, brokerId) {
  const res = await fetch(`${BASE_URL}/brokers/user/${user}/default`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ brokerId }),
  })
  if (!res.ok) throw new Error('設定預設券商失敗')
  return res.json()
}

export async function calculateFee({ brokerId, assetType, price, quantity, side, symbol }) {
  const res = await fetch(`${BASE_URL}/brokers/calculate-fee`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ brokerId, assetType, price, quantity, side, symbol }),
  })
  if (!res.ok) throw new Error('計算手續費失敗')
  return res.json()
}
