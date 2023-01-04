import { ExpressionLanguageService } from '../service';

describe('language-service', () => {
  let service: ExpressionLanguageService;

  beforeEach(() => {
    service = new ExpressionLanguageService();
  });

  it('should auto-complete expressions', () => {
    service.setExpressions(
      new Map([
        [
          'test',
          {
            name: 'test',
            description: 'test expression',
            args: [],
          },
        ],
      ])
    );

    const completions = service.getCompletionsAtPosition(
      {
        text: 't',
      } as any,
      {
        line: 0,
        character: 1,
      }
    );

    expect(completions.entries).toHaveLength(1);
    expect(completions.entries[0].name).toBe('test');
  });
});
