import { describe, expect, it } from '@jest/globals'
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging'

import { parsePushMessage } from '../util/PushMessageParser'

// The parser only uses `showDevError` from AirshipInstance; stub it so the test
// avoids pulling in the native Airship module.
jest.mock('../components/services/AirshipInstance', () => ({
  showDevError: () => undefined
}))

/**
 * Builds a minimal RemoteMessage; the parser only reads `data` and
 * `notification`.
 */
function makeMessage(
  data: Record<string, string> | undefined,
  notification?: { title?: string; body?: string }
): FirebaseMessagingTypes.RemoteMessage {
  return {
    data,
    notification
  } as unknown as FirebaseMessagingTypes.RemoteMessage
}

describe('parsePushMessage', () => {
  it('captures the campaignId from a marketing payload', () => {
    expect(
      parsePushMessage(makeMessage({ type: 'marketing', campaignId: 'abc123' }))
    ).toEqual({
      type: 'marketing',
      campaignId: 'abc123',
      link: undefined
    })
  })

  it('parses an optional deep-link url into a nested navigation link', () => {
    expect(
      parsePushMessage(
        makeMessage({
          type: 'marketing',
          campaignId: 'abc123',
          url: 'edge://swap'
        })
      )
    ).toEqual({
      type: 'marketing',
      campaignId: 'abc123',
      link: { type: 'swap' }
    })
  })

  it('degrades to track-only when the url is unparseable', () => {
    expect(
      parsePushMessage(
        makeMessage({
          type: 'marketing',
          campaignId: 'abc123',
          url: 'not a url'
        })
      )
    ).toEqual({
      type: 'marketing',
      campaignId: 'abc123',
      link: undefined
    })
  })

  it('ignores a non-marketing payload', () => {
    expect(parsePushMessage(makeMessage({ foo: 'bar' }))).toBeUndefined()
  })

  it('still parses a price-change payload', () => {
    expect(
      parsePushMessage(
        makeMessage(
          { type: 'price-change', pluginId: 'bitcoin' },
          { body: 'BTC is up' }
        )
      )
    ).toEqual({
      type: 'price-change',
      pluginId: 'bitcoin',
      body: 'BTC is up'
    })
  })
})
