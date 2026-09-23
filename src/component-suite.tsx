/**
 * React component test-suite helpers.
 *
 * Provides building blocks to define consistent test suites for React function
 * components, giving the name of the component to the title of the suite, and
 * offering flexible per-test options.
 */

import React from 'react'
import { act } from '@testing-library/react'
import type {
  EmptyObject,
  HasRequiredKeys,
  Promisable,
  SetOptional,
  UnknownRecord,
} from 'type-fest'

import { type AnyFunctionComponent, getComponentName } from './utils'

/**
 * Options that apply to a whole component test suite, rather than one test.
 *
 * - Use `insideSuite` to register test lifecycle hooks (e.g., `beforeEach`,
 *   `beforeAll`, `afterEach`, and `afterAll`).
 * - Use `suiteFn` if debugging tests via `describe.skip` or `describe.only`.
 */
export type OverallOptions = {
  /**
   * Include any `beforeEach`, `beforeAll`, `afterEach`, `afterAll` in this.
   */
  insideSuite?: () => void
  /**
   * For debugging tests via `describe.skip` or `describe.only`
   * @default `describe`
   */
  suiteFn?: typeof describe.skip | typeof describe.only
  /**
   * Wrapper for the component
   */
  Wrapper?: React.FC<{ children: React.ReactNode }>
}

/**
 * Base criteria for a single test entry in a suite.
 */
export type TestCriteria = {
  /**
   * Appended to the base `testTitle` for this test.
   */
  testTitleSuffix: string
  /**
   * May be sync or async; it will be awaited.
   */
  beforeRender?: () => Promisable<unknown>
  /**
   * Component under test for this entry.
   */
  Component: AnyFunctionComponent
}

/**
 * Ordered collection of per-test configurations for a suite (each being a call
 * to `test()`).
 *
 * - The first item omits `Component` (the top-level `Component` is
 *   used) and may omit `testTitleSuffix` (the base title is used alone).
 * - All subsequent items must provide both `Component` and
 *   `testTitleSuffix` (`testTitleSuffix` required in order to specify what is
 *   tested).
 * - If `AddlArgs` has required keys, then at least one test must be provided.
 *   Otherwise, an empty list is allowed, in which case a simple render test
 *   will be ran.
 *
 * @template AddlArgs Additional fields allowed in each test definition.
 */
export type TestList<AddlArgs extends UnknownRecord = EmptyObject> =
  // non-empty test list
  | [
      AddlArgs &
        SetOptional<Omit<TestCriteria, 'Component'>, 'testTitleSuffix'>,
      ...(AddlArgs & TestCriteria)[],
    ]
  // allow empty list only if no required keys in AddlArgs
  | (HasRequiredKeys<AddlArgs> extends true ? never : [])

/**
 * Helper type to define args where the first arg may be of a different
 * type than the rest.
 */
type MaybeFirstArg<MaybeFirst, Rest extends unknown[]> =
  | [MaybeFirst, ...Rest]
  | [...Rest]

/**
 * Arguments accepted by a test suite function.
 *
 * Supports the following forms:
 * - [{@link OverallOptions}, {@link TestList}]
 * - [{@link TestList}]
 * - [] (no tests; a default render test will be ran (not an option if the suite
 *      has required test args))
 *
 * Use {@link resolveTestSuiteArgs} to extract.
 */
export type TestSuiteArgs<AddlTestArgs extends UnknownRecord = EmptyObject> =
  MaybeFirstArg<
    OverallOptions,
    HasRequiredKeys<AddlTestArgs> extends true
      ? [tests: TestList<AddlTestArgs>]
      : [tests?: TestList<AddlTestArgs>]
  >
/**
 * Helper type that normalizes {@link TestSuiteArgs} into a consistent shape
 * with both `overallOptions` and `tests` present (each possibly empty).
 */
type ExtractSuiteArgs<T extends TestSuiteArgs> = T extends [
  (infer First)?,
  (infer Second)?,
]
  ? First extends UnknownRecord
    ? { overallOptions: First; tests: Second extends TestList ? Second : [] }
    : { overallOptions: undefined; tests: First extends TestList ? First : [] }
  : { overallOptions: undefined; tests: [] }

/**
 * Normalizes the flexible {@link TestSuiteArgs} into {@link OverallOptions}
 * (which is optional and may be first) and the {@link TestList} (which may be
 * empty).
 */
export const resolveTestSuiteArgs = <T extends TestSuiteArgs>(
  args: T
): {
  overallOptions: ExtractSuiteArgs<T>['overallOptions']
  tests: ExtractSuiteArgs<T>['tests']
} => {
  const [first, second] = args
  if (!first) {
    return { overallOptions: {}, tests: [] }
  }
  if (Array.isArray(first)) {
    return { overallOptions: {}, tests: first }
  }
  return { overallOptions: first, tests: second ?? [] }
}

/**
 * Args for the core {@link componentTestSuite}.
 */
type CoreTestSuiteArgs = TestSuiteArgs<{
  /**
   * May be sync or async; it will be awaited.
   */
  afterRender?: () => Promisable<unknown>
}>
type CoreTestSuiteTestsList = ExtractSuiteArgs<CoreTestSuiteArgs>['tests']

/**
 * Defines and runs a `describe` block of render tests for a React function
 * component, named after the component itself.
 *
 * Behavior:
 * - Ensures at least one render test runs (a default test if none provided).
 * - The first test omits `Component` and uses the main passed component;
 *   subsequent tests must specify the `Component` and match its type, as well
 *   as a `testTitleSuffix` to identify what is being tested.
 * - `beforeRender` and `afterRender` are awaited if they return a `Promise`.
 * - The component is rendered via the provided `renderFunction`,
 *   optionally wrapped in `Wrapper`.
 *
 * @param Component The component under test (also used to name the suite).
 * @param options Suite-level options.
 * @param tests {@link TestList}. Per-test configurations. If omitted or empty,
 *   a single default render test runs.
 */
export const componentTestSuite = (
  Component: AnyFunctionComponent,
  {
    suiteFn = describe,
    insideSuite,
    testTitle,
    Wrapper = React.Fragment,
    renderFunction,
  }: ExtractSuiteArgs<CoreTestSuiteArgs>['overallOptions'] & {
    renderFunction: (ui: React.ReactElement) => void
    /**
     * The base title for each test; each test's `testTitleSuffix` will be
     * appended to this.
     */
    testTitle: string
  },
  ...testsArg: CoreTestSuiteTestsList
): void => {
  const componentName = getComponentName(Component)

  // always run at least one test (first one uses first arg Component)
  const tests: CoreTestSuiteTestsList = testsArg?.length ? testsArg : [{}]

  suiteFn(componentName, () => {
    insideSuite?.()

    for (const {
      testTitleSuffix,
      beforeRender,
      afterRender,
      ...maybeComponent
    } of tests) {
      // First test uses main Component passed in first arg, remaining tests
      // must specify a Component.
      const ThisTestComponent =
        'Component' in maybeComponent ? maybeComponent.Component : Component
      if (getComponentName(ThisTestComponent) !== componentName) {
        throw new Error(
          `all tests must be of same component type (${componentName})`
        )
      }

      test(
        testTitle + (testTitleSuffix ? ` - ${testTitleSuffix}` : ''),
        async () => {
          await beforeRender?.()
          await act(() =>
            expect(() =>
              renderFunction(<Wrapper>{ThisTestComponent}</Wrapper>)
            ).not.toThrow()
          )
          await afterRender?.()
        }
      )
    }
  })
}

/**
 * Helper to map custom {@link TestList} to values compatible with core
 * {@link componentTestSuite}.
 */
export const mapTestList = <TList extends TestList>(
  args: TList | undefined,
  callback: (test: TList[number]) => Partial<CoreTestSuiteTestsList[number]>
): CoreTestSuiteTestsList =>
  args?.map((t) => ({ ...t, ...callback(t) })) as CoreTestSuiteTestsList
