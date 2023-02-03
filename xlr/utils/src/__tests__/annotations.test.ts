import { setupTestEnv } from '../test-helpers';
import { decorateNode } from '../annotations';

describe('Annotations', () => {
  it('JSDoc comments to strings', () => {
    const sc = `
    /**
   * An asset is the smallest unit of user interaction in a player view
   * @example Example usage of interface Asset
   * @see Asset for implementation details
   * @default default value
   */
  export interface Asset<T extends string = string> {
    id: string;
    [key: string]: unknown;
  }
  `;

    const { sf } = setupTestEnv(sc);
    expect(decorateNode(sf.statements[0])).toMatchSnapshot();
  });

  it('JSDoc @metatag', () => {
    const sc = `
    /**
   * An asset is the smallest unit of user interaction in a player view
   * @metatag category:views
   * @metatag screenshot:/path/image.png
   */
  export interface Asset<T extends string = string> {
    id: string;
    [key: string]: unknown;
  }
  `;

    const { sf } = setupTestEnv(sc);
    expect(decorateNode(sf.statements[0])).toMatchSnapshot();
  });
});
