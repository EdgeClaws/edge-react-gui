import type {
  EdgeAccount,
  EdgePluginMap,
  EdgeSwapRequestOptions
} from 'edge-core-js'

/**
 * Restricts a swap request to the Houdini privacy provider, for Stealth Swap
 * and Stealth Send. Every other enabled swap provider is disabled for the
 * request, and any preferred-provider override is cleared so it cannot fight
 * the restriction.
 */
export function makeStealthSwapRequestOptions(
  account: EdgeAccount,
  opts: EdgeSwapRequestOptions = {}
): EdgeSwapRequestOptions {
  const disabled: EdgePluginMap<true> = { ...opts.disabled }
  for (const swapPluginId of Object.keys(account.swapConfig)) {
    if (swapPluginId !== 'houdini') disabled[swapPluginId] = true
  }
  return {
    ...opts,
    disabled,
    preferPluginId: undefined,
    preferType: undefined
  }
}
