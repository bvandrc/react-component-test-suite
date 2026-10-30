import React from 'react'

import { getComponentName } from '../index'

/** Anonymous, so `displayName` is the only name it can be given. */
const buildAnonymousComponent = (): React.FC => () => <div>Anonymous</div>
const AnonymousComponent = buildAnonymousComponent()
AnonymousComponent.displayName = 'NamedByDisplayName'

/** A memo has neither a function name nor a displayName of its own. */
const MemoComponent = React.memo(() => <div>Memo</div>)

const NamedComponent = () => <div>Named</div>

describe('getComponentName', () => {
  test('names a component after its function', () => {
    expect(getComponentName(<NamedComponent />)).toBe('NamedComponent')
  })

  test('takes the displayName when the function has no name', () => {
    expect(getComponentName(<AnonymousComponent />)).toBe('NamedByDisplayName')
  })

  test('throws when a component has no name to take', () => {
    expect(() => getComponentName(<MemoComponent />)).toThrow(
      'Component has no name.'
    )
  })
})
