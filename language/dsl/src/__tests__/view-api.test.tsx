import React from 'react';
import { render } from 'react-json-reconciler';
import { binding as b } from '../string-templates';
import { Info } from './helpers/asset-library';

describe('View', () => {
  it('Does not convert ref property to template', async () => {
    const validationBinding = b`some.binding`;
    const element = (
      await render(
        <Info
          id="custom-id"
          validation={[
            {
              type: 'expression',
              ref: validationBinding,
              message: 'some validation message',
            },
          ]}
        >
          <Info.Title>Cool Title</Info.Title>
        </Info>
      )
    ).jsonValue;

    expect(element).toStrictEqual({
      id: 'custom-id',
      title: {
        asset: {
          id: 'custom-id-title',
          type: 'text',
          value: 'Cool Title',
        },
      },
      type: 'info',
      validation: [
        {
          message: 'some validation message',
          ref: 'some.binding',
          type: 'expression',
        },
      ],
    });
  });
});
