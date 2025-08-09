import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client'

export function getClient() {
  const url = getFullnodeUrl('devnet')
  return new SuiClient({ url })
}

export async function getClientVersion(): Promise<string> {
  try {
    const client = getClient()
    const v = await client.getLatestSuiSystemState()
    return `epoch ${v.epoch}`
  } catch {
    return 'unavailable'
  }
}
