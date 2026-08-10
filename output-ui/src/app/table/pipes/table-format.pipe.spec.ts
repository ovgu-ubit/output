import { TableEuroPipe } from './table-format.pipe';

describe('TableEuroPipe', () => {
  const pipe = new TableEuroPipe();

  it('formats whole amounts without decimal places', () => {
    expect(pipe.transform(1234)).toBe('1.234 €');
  });

  it('formats decimal amounts with exactly two decimal places', () => {
    expect(pipe.transform(1234.5)).toBe('1.234,50 €');
    expect(pipe.transform(1234.567)).toBe('1.234,57 €');
  });

  it('returns an empty string for missing values', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });
});
