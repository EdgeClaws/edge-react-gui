import { base64 } from 'rfc4648'

/**
 * BIP-137 encodes the signing address' script type in the recoverable-signature
 * header byte, so a verifier can derive the address type without being told it.
 * The two SegWit variants:
 *  - Native SegWit (P2WPKH, `bc1q…`): header 39-42 (Base64 prefix `K`/`L`)
 *  - Nested SegWit (P2SH-P2WPKH, `3…`): header 35-38
 * Legacy (P2PKH) addresses are not remapped by BIP-137.
 */
export type SegwitAddressType = 'p2wpkh' | 'p2sh-p2wpkh'

/**
 * How BIP-137 treats a given address:
 *  - `p2wpkh` / `p2sh-p2wpkh`: remap the header byte to the SegWit range.
 *  - `legacy`: a P2PKH address, which BIP-137 leaves in the standard format.
 *  - `unsupported`: a bech32 address that is not v0 P2WPKH (e.g. Taproot
 *    `bc1p`), for which BIP-137 defines no header, so it must be rejected
 *    rather than signed with a misleading legacy header.
 */
export type Bip137AddressKind = SegwitAddressType | 'legacy' | 'unsupported'

interface SegwitChainInfo {
  // The bech32 human-readable prefix of the chain's native SegWit addresses,
  // including the witness-v0 separator (e.g. `bc1q`).
  nativePrefix: string
  // The base58 leading character(s) of the chain's nested-SegWit (P2SH) addresses.
  nestedPrefixes: string[]
}

// Only chains that actually issue SegWit addresses can produce BIP-137
// signatures. Non-SegWit UTXO chains (Dogecoin, Bitcoin Cash, Dash) are absent
// on purpose, so the UI hides the format option for them.
const SEGWIT_SIGN_CHAINS: Record<string, SegwitChainInfo> = {
  bitcoin: { nativePrefix: 'bc1q', nestedPrefixes: ['3'] },
  litecoin: { nativePrefix: 'ltc1q', nestedPrefixes: ['M', '3'] },
  digibyte: { nativePrefix: 'dgb1q', nestedPrefixes: ['S'] }
}

// The signing plugin emits a compressed-key legacy header of `27 + 4 + recid`.
// BIP-137 keeps the recovery id but shifts the base by the script type.
const LEGACY_COMPRESSED_HEADER_BASE = 31
const NESTED_SEGWIT_HEADER_BASE = 35
const NATIVE_SEGWIT_HEADER_BASE = 39

// A bech32 P2WPKH address is a fixed length: the native prefix (hrp + `1q`)
// plus a 20-byte witness program (32 chars) and a 6-char checksum. Native
// P2WSH shares the `…1q` prefix but has a 32-byte program, so it is longer;
// distinguishing by length keeps single-key P2WPKH from the multisig P2WSH
// script type, which BIP-137 does not cover.
const P2WPKH_CHARS_AFTER_PREFIX = 38

/**
 * Whether the chain issues SegWit addresses, and therefore whether the BIP-137
 * signature format is meaningful for it.
 */
export function isBip137Supported(pluginId: string): boolean {
  return SEGWIT_SIGN_CHAINS[pluginId] != null
}

/**
 * Classifies how BIP-137 should treat an address on the given chain, or `null`
 * when the chain issues no SegWit addresses. Native and nested SegWit get their
 * header byte remapped; legacy P2PKH is left standard; any other bech32 address
 * (Taproot and later witness versions) is `unsupported`, since BIP-137 defines
 * no header for it.
 */
export function getBip137AddressKind(
  address: string,
  pluginId: string
): Bip137AddressKind | null {
  const chainInfo = SEGWIT_SIGN_CHAINS[pluginId]
  if (chainInfo == null) return null

  const trimmed = address.trim()
  const lower = trimmed.toLowerCase()
  // Strip the witness-v0 separator to get the chain's bech32 prefix (`bc1`).
  const bech32Prefix = chainInfo.nativePrefix.slice(0, -1)

  if (lower.startsWith(bech32Prefix)) {
    // A bech32 (SegWit) address. BIP-137 only encodes single-key v0 P2WPKH;
    // longer `…1q` addresses are P2WSH, and other witness versions (Taproot
    // `bc1p`, …) have no BIP-137 header, so both are unsupported.
    const isNativeP2wpkh =
      lower.startsWith(chainInfo.nativePrefix) &&
      lower.length === chainInfo.nativePrefix.length + P2WPKH_CHARS_AFTER_PREFIX
    return isNativeP2wpkh ? 'p2wpkh' : 'unsupported'
  }
  if (chainInfo.nestedPrefixes.some(prefix => trimmed.startsWith(prefix))) {
    return 'p2sh-p2wpkh'
  }
  return 'legacy'
}

/**
 * Rewrites the header byte of a compact recoverable signature so it follows the
 * BIP-137 encoding for the given SegWit script type. The r/s components are
 * untouched, so the result verifies identically to a signature produced with
 * the matching `segwitType`. Returns the input unchanged when the header is not
 * the expected legacy-compressed byte.
 */
export function applyBip137Header(
  signatureBase64: string,
  segwitType: SegwitAddressType
): string {
  const bytes = base64.parse(signatureBase64)
  const recoveryId = bytes[0] - LEGACY_COMPRESSED_HEADER_BASE
  if (recoveryId < 0 || recoveryId > 3) return signatureBase64

  const headerBase =
    segwitType === 'p2wpkh'
      ? NATIVE_SEGWIT_HEADER_BASE
      : NESTED_SEGWIT_HEADER_BASE
  bytes[0] = headerBase + recoveryId
  return base64.stringify(bytes)
}
