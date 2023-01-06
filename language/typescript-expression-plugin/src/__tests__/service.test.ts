import SampleExpression from '@player-tools/static-xlrs/static_xlrs/expression/xlr/manifest';
import { ExpressionLanguageService } from '../service';

describe('language-service', () => {
  let service: ExpressionLanguageService;

  beforeEach(() => {
    service = new ExpressionLanguageService({ plugins: [SampleExpression] });
  });

  it('should auto-complete expressions', () => {
    const completions = service.getCompletionsAtPosition(
      {
        text: 't',
      } as any,
      {
        line: 0,
        character: 1,
      }
    );

    expect(completions.entries).toHaveLength(2);
    expect(completions.entries.map((e) => e.name)).toStrictEqual([
      'trim',
      'titleCase',
    ]);
  });
});
