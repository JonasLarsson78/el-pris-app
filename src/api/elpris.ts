const API_BASE = 'https://el-pris-api.vercel.app'
const API_KEY = '557b938f23a85252a5e8c2865b108f8cab8b631158ba74a3c8799d8d2a28378b'

export type Zone = 'SE1' | 'SE2' | 'SE3' | 'SE4'

export interface PriceEntry {
  startTime: string  // e.g. "25 apr. 2026 22:00"
  endTime: string
  pris: number       // already in öre/kWh
  unit: string       // "öre"
}

interface ApiResponse {
  data: PriceEntry[][]
}

export async function fetchPrices(params: {
  year?: number
  date?: string
  zone?: Zone
}): Promise<PriceEntry[]> {
  const query = new URLSearchParams()
  if (params.year) query.set('year', String(params.year))
  if (params.date) query.set('date', params.date)
  if (params.zone) query.set('zone', params.zone)

  const res = await fetch(`${API_BASE}/api/v1/el?${query}`, {
    headers: { 'x-api-key': API_KEY },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }

  const json: ApiResponse = await res.json()
  // data is an array of arrays; flatten to a single list
  return json.data.flat()
}
