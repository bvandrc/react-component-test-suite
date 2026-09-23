export type AnyFunctionComponent = React.FunctionComponentElement<unknown>

/** The component's name, used to title the suite written for it. */
export const getComponentName = (Component: AnyFunctionComponent): string => {
  const name =
    Component.type.name ||
    Component.type.displayName ||
    (Component as unknown as { displayName?: string }).displayName
  if (!name) {
    throw new Error(
      'Component has no name. May be a React.MemoExoticComponent-- if so, set displayName on the component.'
    )
  }
  return name
}
