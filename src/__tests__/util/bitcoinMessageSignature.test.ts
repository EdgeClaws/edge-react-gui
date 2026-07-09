import { base64 } from 'rfc4648'

import {
  applyBip137Header,
  getBip137AddressKind,
  isBip137Supported
} from '../../util/bitcoinMessageSignature'

describe('bitcoinMessageSignature', () => {
  describe('isBip137Supported', () => {
    it('is true for SegWit UTXO chains', () => {
      expect(isBip137Supported('bitcoin')).toBe(true)
      expect(isBip137Supported('litecoin')).toBe(true)
      expect(isBip137Supported('digibyte')).toBe(true)
    })

    it('is false for non-SegWit chains', () => {
      expect(isBip137Supported('dogecoin')).toBe(false)
      expect(isBip137Supported('bitcoincash')).toBe(false)
      expect(isBip137Supported('dash')).toBe(false)
    })
  })

  describe('getBip137AddressKind', () => {
    it('classifies native SegWit addresses', () => {
      expect(
        getBip137AddressKind(
          'bc1q8xcwww38eucj8d5zgzd8ymmameycs42xzh23qu',
          'bitcoin'
        )
      ).toBe('p2wpkh')
      expect(
        getBip137AddressKind(
          'ltc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
          'litecoin'
        )
      ).toBe('p2wpkh')
    })

    it('classifies nested SegWit addresses', () => {
      expect(
        getBip137AddressKind('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', 'bitcoin')
      ).toBe('p2sh-p2wpkh')
      expect(
        getBip137AddressKind('MLcbG7hUeXxTKfELi8fW9j2rTaGioLmt3H', 'litecoin')
      ).toBe('p2sh-p2wpkh')
    })

    it('classifies legacy addresses as legacy (BIP-137 leaves them standard)', () => {
      expect(
        getBip137AddressKind('1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', 'bitcoin')
      ).toBe('legacy')
    })

    it('marks Taproot and other non-v0 bech32 addresses unsupported', () => {
      // Taproot (bc1p / witness v1) has no BIP-137 header encoding.
      expect(
        getBip137AddressKind(
          'bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr',
          'bitcoin'
        )
      ).toBe('unsupported')
      expect(
        getBip137AddressKind(
          'ltc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqc8gma6',
          'litecoin'
        )
      ).toBe('unsupported')
    })

    it('marks native P2WSH (v0, longer than P2WPKH) unsupported', () => {
      // P2WSH shares the bc1q prefix but has a 32-byte program, so BIP-137's
      // P2WPKH header remap must not be applied to it.
      expect(
        getBip137AddressKind(
          'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3',
          'bitcoin'
        )
      ).toBe('unsupported')
    })

    it('returns null for non-SegWit chains', () => {
      expect(
        getBip137AddressKind('DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L', 'dogecoin')
      ).toBeNull()
    })
  })

  describe('applyBip137Header', () => {
    // From the Asana task: the legacy signature for a native SegWit address
    // starts with `I` (header byte 32, recovery id 1). BIP-137 native SegWit
    // must land in the 39-42 range and start with `K`.
    const legacyNativeSignature =
      'ILDe+aXV9KBN3KIsoB68tMYiCbDzJtp2RBn3mpFzXPc1VG8jq2PbzWBS19lSaRFmEgmk2u7o2c69y5mlnKEhZEg='

    it('remaps a native SegWit header into the 39-42 range', () => {
      const result = applyBip137Header(legacyNativeSignature, 'p2wpkh')
      expect(result.startsWith('K')).toBe(true)
      expect(base64.parse(result)[0]).toBe(40)
    })

    it('remaps a nested SegWit header into the 35-38 range', () => {
      const result = applyBip137Header(legacyNativeSignature, 'p2sh-p2wpkh')
      expect(base64.parse(result)[0]).toBe(36)
    })

    it('preserves the r/s components, changing only the header byte', () => {
      const original = base64.parse(legacyNativeSignature)
      const remapped = base64.parse(
        applyBip137Header(legacyNativeSignature, 'p2wpkh')
      )
      expect(remapped.slice(1)).toEqual(original.slice(1))
    })

    it('leaves a signature with an unexpected header untouched', () => {
      const bytes = new Uint8Array(65)
      bytes[0] = 20 // outside the legacy-compressed 31-34 range
      const encoded = base64.stringify(bytes)
      expect(applyBip137Header(encoded, 'p2wpkh')).toBe(encoded)
    })
  })
})
