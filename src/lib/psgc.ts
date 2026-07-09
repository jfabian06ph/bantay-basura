// Philippine Standard Geographic Code (PSGC) drill-down.
// Free, no key, CORS-enabled: https://psgc.gitlab.io/api/

const BASE = 'https://psgc.gitlab.io/api'

export interface PsgcItem {
  code: string
  name: string
}

async function get(path: string): Promise<PsgcItem[]> {
  try {
    const res = await fetch(`${BASE}${path}`)
    if (!res.ok) return []
    const data: Array<Record<string, unknown>> = await res.json()
    return data
      .map((d) => ({ code: String(d.code), name: String(d.name) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    return []
  }
}

export const getRegions = () => get('/regions/')
export const getProvinces = (regionCode: string) =>
  get(`/regions/${regionCode}/provinces/`)
export const getCitiesByProvince = (provinceCode: string) =>
  get(`/provinces/${provinceCode}/cities-municipalities/`)
export const getCitiesByRegion = (regionCode: string) =>
  get(`/regions/${regionCode}/cities-municipalities/`)
export const getBarangays = (cityCode: string) =>
  get(`/cities-municipalities/${cityCode}/barangays/`)
