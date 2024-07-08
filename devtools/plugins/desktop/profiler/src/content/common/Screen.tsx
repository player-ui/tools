import React from "react";
import { StackedView } from "@devtools-ui/plugin";

export const Screen = ({
  main,
  header,
  footer,
  id,
}: {
  id: string;
  main: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}) => (
  <StackedView id={id}>
    {header && <StackedView.Header>{header}</StackedView.Header>}
    <StackedView.Main>{main}</StackedView.Main>
    {footer && <StackedView.Footer>{footer}</StackedView.Footer>}
  </StackedView>
);
