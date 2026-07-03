import type { EdgeTokenId } from 'edge-core-js'

/**
 * A destination chain HoudiniSwap can pay out to, keyed by the Edge currency
 * pluginId. `addressValidation` is Houdini's own per-chain regex, reused for
 * client-side validation of pasted destination addresses. `memoNeeded` chains
 * show a destination-tag row whose value rides `toAddressInfo.toMemos` to the
 * plugin and onward as `destinationTag` on order creation.
 */
export interface HoudiniChain {
  pluginId: string
  houdiniShortName: string
  memoNeeded: boolean
  addressValidation: RegExp
}

/**
 * Snapshot of Houdini's `GET /chains` (v2 partner API, fetched 2026-07-02)
 * intersected with Edge's currency pluginIds, mirroring the
 * edge-exchange-plugins Houdini chain mapping. IBC-family chains are excluded
 * there (no trustworthy memo metadata), so they are absent here too. A
 * follow-up can source this dynamically from the API once chain metadata is
 * exposed through the swap plugin.
 */
export const HOUDINI_CHAINS: HoudiniChain[] = [
  {
    pluginId: 'algorand',
    houdiniShortName: 'algorand',
    memoNeeded: false,
    addressValidation: /^[A-Z0-9]{58,58}$/
  },
  {
    pluginId: 'arbitrum',
    houdiniShortName: 'arbitrum',
    memoNeeded: false,
    addressValidation: /^(0x)[0-9A-Za-z]{40}$/
  },
  {
    pluginId: 'avalanche',
    houdiniShortName: 'avalanche',
    memoNeeded: false,
    addressValidation: /^(0x)[0-9A-Za-z]{40}$/
  },
  {
    pluginId: 'base',
    houdiniShortName: 'base',
    memoNeeded: false,
    addressValidation: /^(0x)[0-9A-Za-z]{40}$/
  },
  {
    pluginId: 'binancesmartchain',
    houdiniShortName: 'bsc',
    memoNeeded: false,
    addressValidation: /^(0x)[0-9A-Za-z]{40}$/
  },
  {
    pluginId: 'bitcoin',
    houdiniShortName: 'bitcoin',
    memoNeeded: false,
    addressValidation:
      /^([13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39}|bc1[a-z0-9]{59})$/
  },
  {
    pluginId: 'bitcoincash',
    houdiniShortName: 'bitcoincash',
    memoNeeded: false,
    addressValidation:
      /^([13][a-km-zA-HJ-NP-Z1-9]{25,34})$|^((bitcoincash:)?(q|p)[a-z0-9]{41})$|^((BITCOINCASH:)?(Q|P)[A-Z0-9]{41})$/
  },
  {
    pluginId: 'bitcoinsv',
    houdiniShortName: 'bsv',
    memoNeeded: false,
    addressValidation: /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/
  },
  {
    pluginId: 'cardano',
    houdiniShortName: 'cardano',
    memoNeeded: false,
    addressValidation:
      /^(([1-9A-HJ-NP-Za-km-z]{59})|([0-9A-Za-z]{100,104})|([0-9a-fA-F]{64}))$|^(addr)[0-9A-Za-z]{45,65}$|^[a-zA-z0-9]*|[0-9A-Za-z]{45,65}$/
  },
  {
    pluginId: 'celo',
    houdiniShortName: 'celo',
    memoNeeded: false,
    addressValidation: /^(0x)[0-9A-Za-z]{40}$/
  },
  {
    pluginId: 'cosmoshub',
    houdiniShortName: 'cosmoshub-4',
    memoNeeded: true,
    addressValidation: /^(cosmos1)[0-9a-z]{38}$/
  },
  {
    pluginId: 'dash',
    houdiniShortName: 'dash',
    memoNeeded: false,
    addressValidation: /^[X|7][0-9A-Za-z]{33}$/
  },
  {
    pluginId: 'dogecoin',
    houdiniShortName: 'doge',
    memoNeeded: false,
    addressValidation: /^(D|A|9)[a-km-zA-HJ-NP-Z1-9]{33,34}$/
  },
  {
    pluginId: 'ecash',
    houdiniShortName: 'eCash',
    memoNeeded: false,
    addressValidation:
      /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^[0-9A-Za-z]{42,42}$|^(ecash:)[0-9A-Za-z]{30,70}$/
  },
  {
    pluginId: 'ethereum',
    houdiniShortName: 'ethereum',
    memoNeeded: false,
    addressValidation: /^(0x)[0-9A-Za-z]{40}$/
  },
  {
    pluginId: 'fantom',
    houdiniShortName: 'fantom',
    memoNeeded: false,
    addressValidation: /^(0x)[0-9A-Za-z]{40}$/
  },
  {
    pluginId: 'hedera',
    houdiniShortName: 'hedera',
    memoNeeded: true,
    addressValidation: /^(0.0.)[0-9]{4,40}$/
  },
  {
    pluginId: 'hyperevm',
    houdiniShortName: 'hyperevm',
    memoNeeded: false,
    addressValidation: /^(0x)[0-9A-Za-z]{40}$/
  },
  {
    pluginId: 'litecoin',
    houdiniShortName: 'litecoin',
    memoNeeded: false,
    addressValidation: /^(L|M|3)[A-Za-z0-9]{33}$|^(ltc1)[0-9A-Za-z]{39}$/
  },
  {
    pluginId: 'monero',
    houdiniShortName: 'monero',
    memoNeeded: false,
    addressValidation: /^[48][a-zA-Z|\d]{94}([a-zA-Z|\d]{11})?$/
  },
  {
    pluginId: 'opbnb',
    houdiniShortName: 'opbnb',
    memoNeeded: false,
    addressValidation: /^(0x)[0-9A-Za-z]{40}$/
  },
  {
    pluginId: 'optimism',
    houdiniShortName: 'optimism',
    memoNeeded: false,
    addressValidation: /^(0x)[0-9A-Za-z]{40}$/
  },
  {
    pluginId: 'pivx',
    houdiniShortName: 'pivx',
    memoNeeded: false,
    addressValidation: /^(D)[0-9A-za-z]{33}$/
  },
  {
    pluginId: 'polkadot',
    houdiniShortName: 'polkadot',
    memoNeeded: false,
    addressValidation: /^1[1-9A-HJ-NP-Za-km-z]{46,47}$/
  },
  {
    pluginId: 'polygon',
    houdiniShortName: 'polygon',
    memoNeeded: false,
    addressValidation: /^(0x)[0-9A-Za-z]{40}$/
  },
  {
    pluginId: 'pulsechain',
    houdiniShortName: 'pulsechain',
    memoNeeded: false,
    addressValidation: /^(0x)[0-9A-Za-z]{40}$/
  },
  {
    pluginId: 'ripple',
    houdiniShortName: 'ripple',
    memoNeeded: true,
    addressValidation: /^r[1-9A-HJ-NP-Za-km-z]{25,34}$/
  },
  {
    pluginId: 'rsk',
    houdiniShortName: 'rootstock',
    memoNeeded: false,
    addressValidation: /^(0x)[0-9A-Za-z]{40}$/
  },
  {
    pluginId: 'solana',
    houdiniShortName: 'solana',
    memoNeeded: false,
    addressValidation: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
  },
  {
    pluginId: 'sonic',
    houdiniShortName: 'sonic',
    memoNeeded: false,
    addressValidation: /^(0x)[0-9A-Za-z]{40}$/
  },
  {
    pluginId: 'stellar',
    houdiniShortName: 'xlm',
    memoNeeded: true,
    addressValidation: /^G[A-D]{1}[A-Z2-7]{54}$/
  },
  {
    pluginId: 'sui',
    houdiniShortName: 'sui',
    memoNeeded: false,
    addressValidation: /^(0x)[0-9A-Za-z]{64}$/
  },
  {
    pluginId: 'telos',
    houdiniShortName: 'telos',
    memoNeeded: false,
    addressValidation: /^(0x)[0-9A-Za-z]{40}$/
  },
  {
    pluginId: 'thorchainrune',
    houdiniShortName: 'thorchain',
    memoNeeded: true,
    addressValidation: /^(thor1)[0-9a-z]{38}$/
  },
  {
    pluginId: 'ton',
    houdiniShortName: 'ton',
    memoNeeded: true,
    addressValidation: /^(EQ|UQ)[A-Za-z0-9-_]{46}$/
  },
  {
    pluginId: 'tron',
    houdiniShortName: 'tron',
    memoNeeded: false,
    addressValidation: /^T[1-9A-HJ-NP-Za-km-z]{33}$/
  },
  {
    pluginId: 'zcash',
    houdiniShortName: 'Zcash',
    memoNeeded: false,
    addressValidation: /^t1[1-9A-HJ-NP-Za-km-z]{33}$/
  },
  {
    pluginId: 'zksync',
    houdiniShortName: 'zksync-era',
    memoNeeded: false,
    addressValidation: /^(0x)[0-9A-Za-z]{40}$/
  }
]

/** Look up the Houdini destination chain for an Edge asset, if served. */
export function getHoudiniChain(
  pluginId: string,
  tokenId: EdgeTokenId
): HoudiniChain | undefined {
  // Only native (chain) assets are offered as destinations for now:
  if (tokenId != null) return undefined
  return HOUDINI_CHAINS.find(chain => chain.pluginId === pluginId)
}

/** Validate a pasted destination address against the chain's own regex. */
export function isValidHoudiniAddress(
  chain: HoudiniChain,
  address: string
): boolean {
  return chain.addressValidation.test(address.trim())
}
