import { describe, expect, it } from 'vitest';
import appSource from '../src/App.tsx?raw';

describe('settings UI structure', () => {
  it('keeps the addition maximum result control inside the operations section', () => {
    const settingsTitleIndex = appSource.indexOf('{tr.settings}');
    const operationsIndex = appSource.indexOf('{tr.operationsLegend}');
    const additionMaximumIndex = appSource.indexOf('{tr.additionMaxResultLabel}');
    const subtractionGroupsIndex = appSource.indexOf('{tr.subtractionDidacticGroupsLabel}');

    expect(settingsTitleIndex).toBeGreaterThanOrEqual(0);
    expect(operationsIndex).toBeGreaterThan(settingsTitleIndex);
    expect(additionMaximumIndex).toBeGreaterThan(operationsIndex);
    expect(additionMaximumIndex).toBeLessThan(subtractionGroupsIndex);
  });
});
