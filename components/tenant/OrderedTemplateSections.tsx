import { Children, isValidElement, type CSSProperties, type ReactNode } from 'react';

/** Keep keyboard/reading order in sync with the teacher's section order. */
export function OrderedTemplateSections({ children }: { children: ReactNode }) {
  return Children.toArray(children).sort((a, b) => {
    const order = (child: ReactNode) => isValidElement<{ style?: CSSProperties }>(child) ? Number(child.props.style?.order ?? 0) : 0;
    return order(a) - order(b);
  });
}
