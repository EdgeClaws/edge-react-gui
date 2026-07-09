import { useQuery } from '@tanstack/react-query'
import type { EdgeCurrencyWallet } from 'edge-core-js'
import * as React from 'react'
import { View } from 'react-native'

import { useHandler } from '../../hooks/useHandler'
import { lstrings } from '../../locales/strings'
import type { EdgeAppSceneProps } from '../../types/routerTypes'
import {
  applyBip137Header,
  getBip137AddressKind,
  isBip137Supported
} from '../../util/bitcoinMessageSignature'
import { SceneButtons } from '../buttons/SceneButtons'
import { EdgeCard } from '../cards/EdgeCard'
import { EdgeTouchableOpacity } from '../common/EdgeTouchableOpacity'
import { SceneWrapper } from '../common/SceneWrapper'
import { withWallet } from '../hoc/withWallet'
import { EdgeRow } from '../rows/EdgeRow'
import { showError } from '../services/AirshipInstance'
import { cacheStyles, type Theme, useTheme } from '../services/ThemeContext'
import { EdgeText, Paragraph, SmallText } from '../themed/EdgeText'
import { FilledTextInput } from '../themed/FilledTextInput'
import { VectorIcon } from '../themed/VectorIcon'

export interface SignMessageParams {
  walletId: string
}

interface Props extends EdgeAppSceneProps<'signMessage'> {
  wallet: EdgeCurrencyWallet
}

// The signature encoding the user picks. `standard` is the legacy Electrum
// format the plugin emits; `bip137` re-encodes the header byte per BIP-137.
type SignatureFormat = 'standard' | 'bip137'

/**
 * Lets a user sign an arbitrary message with an address they control, to prove
 * self-hosted wallet ownership when withdrawing from a CEX/CASP (EU Travel
 * Rule). BTC-first: the menu entry only appears for UTXO wallets whose plugin
 * implements message signing.
 *
 * The signing address defaults to the wallet's current receive address, but is
 * editable: an exchange usually asks the user to prove control of the specific
 * address they already provided (often a previously-used one), so the user can
 * replace the default with that address. The wallet must control whichever
 * address is entered; the plugin signs with the key derived from that address's
 * stored derivation path, and rejects any address it does not own.
 */
const SignMessageSceneComponent: React.FC<Props> = props => {
  const { wallet } = props

  const theme = useTheme()
  const styles = getStyles(theme)

  const [address, setAddress] = React.useState('')
  const [addressTouched, setAddressTouched] = React.useState(false)
  const [message, setMessage] = React.useState('')
  const [signature, setSignature] = React.useState('')
  const [isSigning, setIsSigning] = React.useState(false)
  const [sigFormat, setSigFormat] = React.useState<SignatureFormat>('standard')

  // BIP-137 only maps SegWit script types, so the format choice is offered
  // solely on chains that issue SegWit addresses (BTC, LTC, DGB). Other UTXO
  // chains (Dogecoin, Bitcoin Cash, Dash) always sign in the standard format.
  const { pluginId } = wallet.currencyInfo
  const showFormatOptions = isBip137Supported(pluginId)

  // Default to the wallet's own receive address. Prefer the native segwit
  // address (the canonical receive address the user hands the exchange),
  // matching `segwitAddress ?? publicAddress` used elsewhere; the
  // `publicAddress` type is the wrapped/legacy variant.
  const { data: defaultAddress, error: addressError } = useQuery({
    queryKey: ['signMessageAddress', wallet.id],
    queryFn: async () => {
      const addresses = await wallet.getAddresses({ tokenId: null })
      const receiveAddress =
        addresses.find(address => address.addressType === 'segwitAddress') ??
        addresses.find(address => address.addressType === 'publicAddress') ??
        addresses[0]
      if (receiveAddress == null) {
        throw new Error(lstrings.sign_message_no_address_error)
      }
      return receiveAddress.publicAddress
    }
  })

  React.useEffect(() => {
    if (addressError != null) showError(addressError)
  }, [addressError])

  // Seed the editable address with the default once it loads, unless the user
  // has already typed their own address.
  React.useEffect(() => {
    if (!addressTouched && defaultAddress != null) setAddress(defaultAddress)
  }, [addressTouched, defaultAddress])

  // A signature is bound to both the message and the address, so clear it
  // whenever either changes to prevent copying a stale signature.
  const handleChangeAddress = useHandler((text: string) => {
    setAddressTouched(true)
    setAddress(text.trim())
    setSignature('')
  })

  const handleUseDefaultAddress = useHandler(() => {
    setAddressTouched(false)
    if (defaultAddress != null) setAddress(defaultAddress)
    setSignature('')
  })

  const handleChangeMessage = useHandler((text: string) => {
    setMessage(text)
    setSignature('')
  })

  // The signature is bound to the chosen format, so clear it when the format
  // changes to prevent copying a signature in the wrong encoding.
  const handleSelectStandardFormat = useHandler(() => {
    setSigFormat('standard')
    setSignature('')
  })

  const handleSelectBip137Format = useHandler(() => {
    setSigFormat('bip137')
    setSignature('')
  })

  const handleSign = useHandler(async () => {
    if (address === '') {
      showError(lstrings.sign_message_no_address_error)
      return
    }

    // BIP-137 defines no header for Taproot or other non-v0-SegWit bech32
    // addresses, so reject them up front rather than returning a legacy-header
    // signature the exchange would fail to verify.
    const bip137Kind =
      sigFormat === 'bip137' ? getBip137AddressKind(address, pluginId) : null
    if (bip137Kind === 'unsupported') {
      showError(lstrings.sign_message_bip137_unsupported_address_error)
      return
    }

    setIsSigning(true)
    try {
      // `signMessage` signs the literal UTF-8 message, which is what exchanges
      // verify. `signBytes` would base64-re-encode the bytes before signing and
      // produce a signature over the wrong data, so it is not usable here.
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      let signedMessage = await wallet.signMessage(message, {
        otherParams: { publicAddress: address }
      })

      // The plugin emits the legacy Electrum format. For BIP-137, remap the
      // header byte on SegWit addresses so strict verifiers recognize the
      // script type. Legacy addresses stay unchanged, since BIP-137 does not
      // alter their signatures.
      if (bip137Kind === 'p2wpkh' || bip137Kind === 'p2sh-p2wpkh') {
        signedMessage = applyBip137Header(signedMessage, bip137Kind)
      }
      setSignature(signedMessage)
    } catch (error: unknown) {
      // These are the plugin's errors for an address the wallet cannot sign
      // with: a valid address it does not own, or one it cannot parse. Map only
      // those to the friendly message so unrelated failures surface verbatim.
      if (
        error instanceof Error &&
        /Missing data-layer address|Could not determine address type|invalid address type in address to script pubkey|failed converting address to scriptPubkey/i.test(
          error.message
        )
      ) {
        showError(lstrings.sign_message_address_not_owned_error)
      } else {
        showError(error)
      }
    } finally {
      setIsSigning(false)
    }
  })

  const showUseDefault =
    defaultAddress != null && address !== defaultAddress && !isSigning

  return (
    <SceneWrapper scroll>
      <View style={styles.container}>
        <Paragraph>{lstrings.sign_message_instructions}</Paragraph>

        <FilledTextInput
          aroundRem={0.5}
          autoCapitalize="none"
          autoCorrect={false}
          // Lock the field while signing so the address cannot change mid-flight
          // and leave the produced signature bound to a different address.
          disabled={isSigning}
          placeholder={lstrings.sign_message_address_input_placeholder}
          testID="signMessageAddressInput"
          value={address}
          onChangeText={handleChangeAddress}
        />
        <Paragraph>
          <SmallText>{lstrings.sign_message_address_helper}</SmallText>
        </Paragraph>
        {showUseDefault ? (
          <EdgeTouchableOpacity
            style={styles.useDefault}
            onPress={handleUseDefaultAddress}
          >
            <EdgeText style={styles.useDefaultText}>
              {lstrings.sign_message_use_default_address}
            </EdgeText>
          </EdgeTouchableOpacity>
        ) : null}

        <FilledTextInput
          aroundRem={0.5}
          autoCorrect={false}
          // Lock the field while signing so the message cannot change mid-flight
          // and leave the produced signature bound to a different message.
          disabled={isSigning}
          multiline
          numberOfLines={4}
          placeholder={lstrings.sign_message_input_placeholder}
          testID="signMessageInput"
          value={message}
          onChangeText={handleChangeMessage}
        />

        {showFormatOptions ? (
          <View style={styles.formatSection}>
            <Paragraph>
              <SmallText>{lstrings.sign_message_format_label}</SmallText>
            </Paragraph>
            <SignatureFormatRow
              disabled={isSigning}
              label={lstrings.sign_message_format_standard}
              selected={sigFormat === 'standard'}
              testID="signMessageFormatStandard"
              onPress={handleSelectStandardFormat}
            />
            <SignatureFormatRow
              disabled={isSigning}
              label={lstrings.sign_message_format_bip137}
              selected={sigFormat === 'bip137'}
              testID="signMessageFormatBip137"
              onPress={handleSelectBip137Format}
            />
            <Paragraph>
              <SmallText>{lstrings.sign_message_format_helper}</SmallText>
            </Paragraph>
          </View>
        ) : null}

        {signature !== '' && (
          <EdgeCard>
            <EdgeRow
              rightButtonType="copy"
              title={lstrings.sign_message_signature_label}
              body={signature}
            />
          </EdgeCard>
        )}

        <Paragraph>
          <SmallText>{lstrings.sign_message_safety_note}</SmallText>
        </Paragraph>

        <SceneButtons
          primary={{
            label: lstrings.sign_message_sign_button,
            onPress: handleSign,
            disabled: message === '' || address === '',
            spinner: isSigning,
            testID: 'signMessageButton'
          }}
        />
      </View>
    </SceneWrapper>
  )
}

interface SignatureFormatRowProps {
  disabled: boolean
  label: string
  selected: boolean
  testID: string
  onPress: () => void
}

/**
 * A single radio option in the signature-format selector.
 */
const SignatureFormatRow: React.FC<SignatureFormatRowProps> = props => {
  const { disabled, label, selected, testID, onPress } = props
  const theme = useTheme()
  const styles = getStyles(theme)

  return (
    <EdgeTouchableOpacity
      style={styles.formatRow}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      disabled={disabled}
      testID={testID}
      onPress={onPress}
    >
      <VectorIcon
        font="Ionicons"
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={theme.rem(1.25)}
        color={theme.iconTappable}
        style={styles.formatRadioIcon}
      />
      <EdgeText style={styles.formatRowLabel}>{label}</EdgeText>
    </EdgeTouchableOpacity>
  )
}

const getStyles = cacheStyles((theme: Theme) => ({
  container: {
    padding: theme.rem(0.5)
  },
  useDefault: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.rem(0.5),
    paddingBottom: theme.rem(0.5)
  },
  useDefaultText: {
    color: theme.iconTappable,
    fontSize: theme.rem(0.75)
  },
  formatSection: {
    paddingTop: theme.rem(0.5)
  },
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.rem(0.5),
    paddingVertical: theme.rem(0.5)
  },
  formatRadioIcon: {
    marginRight: theme.rem(0.75)
  },
  formatRowLabel: {
    flex: 1
  }
}))

export const SignMessageScene = withWallet(SignMessageSceneComponent)
