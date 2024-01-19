import { binding as b, expression as e } from '..';

describe('string template binding', () => {
  it('returns string versions', () => {
    expect(b`foo.bar.baz`.toValue()).toBe('foo.bar.baz');
    expect(b`foo.bar.${b`foo.bar`}`.toValue()).toBe('foo.bar.{{foo.bar}}');
  });

  it('returns string ref versions', () => {
    expect(b`foo.bar.baz`.toRefString()).toBe('{{foo.bar.baz}}');
    expect(b`foo.bar.${b`foo.bar`}`.toRefString()).toBe(
      '{{foo.bar.{{foo.bar}}}}'
    );
  });

  it('works with nested expressions', () => {
    expect(b`foo.bar.${e`test()`}`.toValue()).toBe('foo.bar.`test()`');
    expect(b`foo.bar.${e`test()`}`.toRefString()).toBe('{{foo.bar.`test()`}}');

    const expr = e`test() == 'foo'`;
    expect(b`${expr}.${expr}`.toValue()).toBe(
      "`test() == 'foo'`.`test() == 'foo'`"
    );
  });

  it('works when in a string', () => {
    expect(`This is a ${b`foo.bar`} reference.`).toBe(
      'This is a {{foo.bar}} reference.'
    );
  });

  it('works when template is just a string', () => {
    const segments = ['foo', 'bar', '_index_', 'baz'];
    expect(b`${segments.join('.')}`.toValue()).toBe('foo.bar._index_.baz');
  });

  it('should provide unique identifiers for each _index_ provided for the binding in the template', () => {
    const segments = ['some', '_index_', 'data', '_index_', 'foo', '_index_'];
    expect(b`${segments.join('.')}`.toValue()).toBe(
      'some._index_.data._index1_.foo._index2_'
    );

    expect(b`${segments.join('.')}`.toRefString()).toBe(
      '{{some._index_.data._index1_.foo._index2_}}'
    );
  });

  it('should not place index identifiers if an expression literal is called', () => {
    const expressionWithBindings =
      'conditional({{foo.bar._index_.field1._index_.innerField}} == true, {{foo.bar._index_.field1}} = true)';

    expect(e`${expressionWithBindings}`.toValue()).toBe(expressionWithBindings);
  });

  it('should place index identifiers in binding templates nested in an expression', () => {
    const segments = ['some', '_index_', 'data', '_index_', 'foo', '_index_'];

    const expressionNestedBindings = e`test(${b`${segments.join(
      '.'
    )}`})`.toValue();

    expect(expressionNestedBindings).toBe(
      'test({{some._index_.data._index1_.foo._index2_}})'
    );
  });

  it('should reset index identifiers in multiple binding templates nested in an expression', () => {
    const segments = [
      'some',
      '_index_',
      'data',
      '_index_',
      'foo',
      '_index_',
      'bar',
    ];

    const expressionNestedBindings = e`test(${b`${segments.join(
      '.'
    )}`} == true, ${b`some._index_.data`} = ${b`some._index_.other._index_.data`})`.toValue();

    expect(expressionNestedBindings).toBe(
      'test({{some._index_.data._index1_.foo._index2_.bar}} == true, {{some._index_.data}} = {{some._index_.other._index1_.data}})'
    );
  });
});
