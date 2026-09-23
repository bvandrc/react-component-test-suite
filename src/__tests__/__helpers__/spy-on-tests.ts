import type { SuiteAPI, TestAPI } from 'vitest'

interface SpyTestCall {
  name: string
  fn: () => void
  children?: SpyTestCall[]
}

/**
 * Spy on global describe/it/test and capture the structure.
 * Also executes the `it`/`test` functions automatically.
 */
export function spyOnVitestCallers() {
  const originalDescribe = describe
  const originalIt = it
  const originalTest = test

  const currentDescribeStack: SpyTestCall[] = []

  beforeEach(() => {
    describe = ((name: string, fn: () => void) => {
      const describeCall: SpyTestCall = { name, fn, children: [] }
      if (currentDescribeStack.length > 0) {
        // nested describe
        const parent = currentDescribeStack.at(-1)
        parent?.children?.push(describeCall)
      }
      currentDescribeStack.push(describeCall)
      // evaluate the body of the describe
      fn()
      currentDescribeStack.pop()
    }) as SuiteAPI

    const runTest = ((name: string, fn: () => void) => {
      const itCall: SpyTestCall = { name, fn }
      // attach to current describe if exists
      if (currentDescribeStack.length > 0) {
        const parent = currentDescribeStack.at(-1)
        parent?.children?.push(itCall)
      }
      // execute the test function immediately
      fn()
    }) as TestAPI

    it = runTest
    test = runTest
  })

  afterEach(() => {
    // restore globals
    describe = originalDescribe
    it = originalIt
    test = originalTest
  })
}
