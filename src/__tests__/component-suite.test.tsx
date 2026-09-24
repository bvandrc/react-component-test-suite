import React from 'react'
import { render, waitFor } from '@testing-library/react'
import type { EmptyObject } from 'type-fest'
import type { Mock } from 'vitest'

import {
  componentTestSuite,
  mapTestList,
  type OverallOptions,
  resolveTestSuiteArgs,
  type TestList,
} from '../component-suite'
import { spyOnVitestCallers } from './__helpers__/spy-on-tests'

const TestComponent = () => <div>Test Component</div>

const DifferentTestComponent = () => <div>Test Component</div>

const TestWrapper = ({ children }: React.PropsWithChildren<EmptyObject>) => (
  <div data-testid="wrapper">{children}</div>
)

/** Anonymous, so `displayName` is the only name the suite can be given. */
const makeAnonymous = (): React.FC => () => <div>Anonymous</div>
const AnonymousComponent = makeAnonymous()
AnonymousComponent.displayName = 'NamedByDisplayName'

/** A memo has neither a function name nor a displayName of its own. */
const MemoComponent = React.memo(() => <div>Memo</div>)

const TEST_LIST_SINGLE = [{ testTitleSuffix: 'test 1' }] satisfies TestList
const TEST_LIST_MULTIPLE = [
  ...TEST_LIST_SINGLE,
  { testTitleSuffix: 'test 2', Component: <TestComponent /> },
] satisfies TestList

const OVERALL_OPTIONS = {
  insideSuite: vi.fn(),
  Wrapper: TestWrapper,
} satisfies OverallOptions

test('TestList type', () => {
  const tests = [
    ...TEST_LIST_MULTIPLE,
    { testTitleSuffix: 'test 3' },
    //@ts-expect-error missing component
  ] satisfies TestList

  expectTypeOf<typeof tests>().not.toExtend<TestList>()
})

describe('resolveTestSuiteArgs', () => {
  test('resolves empty args', () => {
    const result = resolveTestSuiteArgs([])
    expect(result).toEqual({
      overallOptions: {},
      tests: [],
    })
  })

  test('resolves with only test list', () => {
    const result = resolveTestSuiteArgs([TEST_LIST_SINGLE])
    expect(result).toEqual({
      overallOptions: {},
      tests: TEST_LIST_SINGLE,
    })
  })

  test('resolves with only overall options', () => {
    const result = resolveTestSuiteArgs([OVERALL_OPTIONS])
    expect(result).toEqual({
      overallOptions: OVERALL_OPTIONS,
      tests: [],
    })
  })

  test('resolves with overall options and test list', () => {
    const result = resolveTestSuiteArgs([OVERALL_OPTIONS, TEST_LIST_MULTIPLE])
    expect(result).toEqual({
      overallOptions: OVERALL_OPTIONS,
      tests: TEST_LIST_MULTIPLE,
    })
  })
})

describe('componentTestSuite - execution', () => {
  componentTestSuite(
    <TestComponent />,
    {
      testTitle: 'renders the component',
      renderFunction: render,
    },
    { testTitleSuffix: 'test 1' },
    { testTitleSuffix: 'test 2', Component: <TestComponent /> }
  )
})

describe('componentTestSuite', () => {
  const mockRender = vi.fn((ui: React.ReactElement) => render(ui))

  const MOCK_SUITE_ARGS = {
    testTitle: 'renders the component',
    renderFunction: mockRender,
  }

  let describeSpy: Mock
  let testSpy: Mock

  spyOnVitestCallers()

  beforeEach(() => {
    // biome-ignore lint/suspicious/noTsIgnore: is valid
    // @ts-ignore is present
    describeSpy = vi.spyOn(globalThis, 'describe')
    // biome-ignore lint/suspicious/noTsIgnore: is valid
    // @ts-ignore is present
    testSpy = vi.spyOn(globalThis, 'test')
  })

  test('creates suite with default render test when no tests provided', async () => {
    await componentTestSuite(<TestComponent />, MOCK_SUITE_ARGS)

    expect(mockRender).toHaveBeenCalled()
    expect(describeSpy).toHaveBeenCalledWith(
      'TestComponent',
      expect.any(Function)
    )
    expect(testSpy).toHaveBeenCalledWith(
      MOCK_SUITE_ARGS.testTitle,
      expect.any(Function)
    )
  })

  test('creates suite with single test', async () => {
    await componentTestSuite(<TestComponent />, MOCK_SUITE_ARGS, {
      testTitleSuffix: 'with default props',
    })

    expect(mockRender).toHaveBeenCalled()
    expect(describeSpy).toHaveBeenCalledWith(
      'TestComponent',
      expect.any(Function)
    )
    expect(testSpy.mock.calls).toEqual([
      [
        `${MOCK_SUITE_ARGS.testTitle} - with default props`,
        expect.any(Function),
      ],
    ])
  })

  test('creates suite with multiple tests', async () => {
    await componentTestSuite(
      <TestComponent />,
      MOCK_SUITE_ARGS,
      { testTitleSuffix: 'test 1' },
      { testTitleSuffix: 'test 2', Component: <TestComponent /> }
    )

    expect(mockRender).toHaveBeenCalledTimes(2)
    expect(describeSpy).toHaveBeenCalledWith(
      'TestComponent',
      expect.any(Function)
    )
    expect(testSpy.mock.calls).toEqual([
      [`${MOCK_SUITE_ARGS.testTitle} - test 1`, expect.any(Function)],
      [`${MOCK_SUITE_ARGS.testTitle} - test 2`, expect.any(Function)],
    ])
  })

  test('calls insideSuite hook', async () => {
    const insideSuite = vi.fn()

    await componentTestSuite(<TestComponent />, {
      ...MOCK_SUITE_ARGS,
      insideSuite,
    })

    expect(insideSuite).toHaveBeenCalledOnce()
  })

  test('calls beforeRender hook', async () => {
    const beforeRender = vi.fn()

    await componentTestSuite(<TestComponent />, MOCK_SUITE_ARGS, {
      beforeRender,
    })

    expect(beforeRender).toHaveBeenCalledOnce()
  })

  test('calls afterRender hook', async () => {
    const afterRender = vi.fn()

    await componentTestSuite(<TestComponent />, MOCK_SUITE_ARGS, {
      afterRender,
    })

    await waitFor(() => {
      expect(afterRender).toHaveBeenCalledOnce()
    })
  })

  test('awaits async beforeRender hook', async () => {
    const beforeRender = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    await componentTestSuite(<TestComponent />, MOCK_SUITE_ARGS, {
      beforeRender,
    })

    expect(beforeRender).toHaveBeenCalledOnce()
  })

  test('awaits async afterRender hook', async () => {
    const afterRender = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    await componentTestSuite(<TestComponent />, MOCK_SUITE_ARGS, {
      afterRender,
    })

    await waitFor(() => {
      expect(afterRender).toHaveBeenCalledOnce()
    })
  })

  test('uses custom Wrapper', async () => {
    await componentTestSuite(<TestComponent />, {
      ...MOCK_SUITE_ARGS,
      Wrapper: TestWrapper,
    })

    expect(mockRender).toHaveBeenCalled()
    const renderCall = mockRender.mock.calls[0][0]
    expect(renderCall.type).toBe(TestWrapper)
  })

  test('throws error when component types mismatch', () => {
    expect(() => {
      componentTestSuite(
        <TestComponent />,
        MOCK_SUITE_ARGS,
        {},
        {
          testTitleSuffix: 'different component',
          Component: <DifferentTestComponent />,
        }
      )
    }).toThrow('all tests must be of same component type')
  })

  test('names the suite from displayName when the function has no name', async () => {
    await componentTestSuite(<AnonymousComponent />, MOCK_SUITE_ARGS)

    expect(describeSpy).toHaveBeenCalledWith(
      'NamedByDisplayName',
      expect.any(Function)
    )
  })

  test('throws when a component has no name to take', () => {
    // A memo has neither, and the suite cannot be titled without one.
    expect(() =>
      componentTestSuite(<MemoComponent />, MOCK_SUITE_ARGS)
    ).toThrow('Component has no name.')
  })

  test('runs the suite through the suiteFn it is given', async () => {
    const suiteFn = vi.fn((_name: string, fn: () => void) => {
      fn()
    })

    await componentTestSuite(<TestComponent />, {
      ...MOCK_SUITE_ARGS,
      // What `describe.only` is passed as while debugging one suite.
      suiteFn: suiteFn as unknown as typeof describe.only,
    })

    expect(suiteFn).toHaveBeenCalledWith('TestComponent', expect.any(Function))
    expect(describeSpy).not.toHaveBeenCalled()
  })

  test('renders through a Fragment when no Wrapper is given', async () => {
    await componentTestSuite(<TestComponent />, MOCK_SUITE_ARGS)

    // A Fragment adds no element, so the wrapper cannot change the markup.
    expect(mockRender.mock.calls[0][0].type).toBe(React.Fragment)
  })

  test('renders between the two hooks, not before or after both', async () => {
    const order: string[] = []
    const renderFunction = vi.fn(() => {
      order.push('render')
    })

    await componentTestSuite(
      <TestComponent />,
      { ...MOCK_SUITE_ARGS, renderFunction },
      {
        beforeRender: () => order.push('before'),
        afterRender: () => order.push('after'),
      }
    )

    await waitFor(() => expect(order).toEqual(['before', 'render', 'after']))
  })
})

describe('mapTestList', () => {
  test('maps empty test list', () => {
    const result = mapTestList([], () => ({}))
    expect(result).toEqual([])
  })

  test('maps undefined test list', () => {
    const result = mapTestList(undefined, () => ({}))
    expect(result).toEqual(undefined)
  })

  test('maps test list with callback', () => {
    const tests = [
      { testTitleSuffix: 'test 1', customProp: 'value1' },
      {
        testTitleSuffix: 'test 2',
        Component: <TestComponent />,
        customProp: 'value2',
      },
    ] satisfies TestList<{ customProp: string }>

    const result = mapTestList(tests, (t) => ({
      afterRender: () => console.log(t.customProp),
    }))

    expect(result).toStrictEqual([
      {
        testTitleSuffix: 'test 1',
        customProp: 'value1',
        afterRender: expect.any(Function),
      },
      {
        testTitleSuffix: 'test 2',
        Component: <TestComponent />,
        customProp: 'value2',
        afterRender: expect.any(Function),
      },
    ])
  })

  test('preserves original properties while adding new ones', () => {
    const beforeRender = vi.fn()
    const tests = [{ testTitleSuffix: 'test', beforeRender }] satisfies TestList

    const result = mapTestList(tests, () => ({ afterRender: vi.fn() }))

    expect(result).toStrictEqual([
      {
        testTitleSuffix: 'test',
        beforeRender,
        afterRender: expect.any(Function),
      },
    ])
  })
})
