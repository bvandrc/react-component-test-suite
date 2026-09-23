import type React from 'react'
import { render, waitFor } from '@testing-library/react'
import type { EmptyObject } from 'type-fest'
import { describe, expect, type Mock, test, vi } from 'vitest'

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

    vi.clearAllMocks()
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
