import { useEffect, useState } from 'react'
import { getClientVersion } from './lib/sui'
import WalletConnectButton from './components/WalletConnectButton'

export default function App() {
  const [version, setVersion] = useState<string>('')
  useEffect(() => {
    getClientVersion().then(setVersion).catch(() => setVersion('unknown'))
  }, [])

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">SuiLoyal</h1>
      <p className="text-sm text-gray-600">Sui client: {version}</p>
      <WalletConnectButton />
    </div>
  )
}
