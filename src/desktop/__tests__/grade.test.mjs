import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetGradeThresholds,
  getGradeThresholds,
  setGradeThresholds,
  updateGradeThresholdsFromConfig,
  getMaxGradeScore,
  calculateGrade,
} from '../../desktop/grade.mjs';

describe('grade calculation', () => {
  beforeEach(() => {
    resetGradeThresholds();
  });

  it('returns scores based on default thresholds (higher-is-better)', () => {
    expect(calculateGrade('roa', 9)).toBe(5);
    expect(calculateGrade('roa', 7)).toBe(4);
    expect(calculateGrade('roa', 5)).toBe(3);
    expect(calculateGrade('roa', 3)).toBe(2);
    expect(calculateGrade('roa', 1)).toBe(1);
  });

  it('returns scores based on default thresholds (lower-is-better)', () => {
    expect(calculateGrade('operatingCost', 10)).toBe(5);
    expect(calculateGrade('operatingCost', 17)).toBe(4);
    expect(calculateGrade('operatingCost', 22)).toBe(3);
    expect(calculateGrade('operatingCost', 27)).toBe(2);
    expect(calculateGrade('operatingCost', 35)).toBe(1);
  });

  it('handles boundary inclusivity defaults (includeLower=true, includeUpper=false) with UI order priority', () => {
    // UI順を優先するため、同値境界で上段が採用される
    expect(calculateGrade('roa', 8)).toBe(5); // 5段階の下端は含む（先頭優先）
    expect(calculateGrade('roa', 6)).toBe(4);
    expect(calculateGrade('roa', 4)).toBe(3);
    expect(calculateGrade('roa', 2)).toBe(2);
  });

  it('getMaxGradeScore returns at least 5 by default', () => {
    expect(getMaxGradeScore()).toBeGreaterThanOrEqual(5);
  });

  it('can override thresholds via legacy config (gradeThresholds)', () => {
    const config = {
      gradeThresholds: JSON.stringify({
        roa: {
          grade5: { min: 50, max: 999 },
          grade4: { min: 40, max: 50 },
          grade3: { min: 30, max: 40 },
          grade2: { min: 20, max: 30 },
          grade1: { min: -999, max: 20 },
        },
      }),
    };
    updateGradeThresholdsFromConfig(config);
    expect(calculateGrade('roa', 45)).toBe(4);
    expect(calculateGrade('roa', 10)).toBe(1);
  });

  it('can override thresholds via gradeSettings (levels with orientation and inclusivity)', () => {
    const config = {
      gradeSettings: {
        incomeTax: {
          orientation: 'lower',
          includeLower: true,
          includeUpper: true,
          levels: [
            { grade: 5, min: -Infinity, max: 5 },
            { grade: 4, min: 5, max: 10 },
            { grade: 3, min: 10, max: 20 },
            { grade: 2, min: 20, max: 30 },
            { grade: 1, min: 30, max: Infinity },
          ],
        },
      },
    };
    updateGradeThresholdsFromConfig(config);
    expect(calculateGrade('incomeTax', 5)).toBe(5); // 上端含む
    expect(calculateGrade('incomeTax', 10)).toBe(4);
    expect(calculateGrade('incomeTax', 30)).toBe(2);
  });

  it('setGradeThresholds replaces all thresholds', () => {
    const custom = {
      roa: [
        { score: 2, min: -Infinity, max: 0, includeLower: true, includeUpper: true },
        { score: 5, min: 0, max: Infinity, includeLower: true, includeUpper: true },
      ],
    };
    setGradeThresholds(custom);
    const t = getGradeThresholds();
    expect(t.roa).toBeDefined();
    expect(calculateGrade('roa', -1)).toBe(2);
    // UIの上から順（配列先頭）を優先するため、0 は先頭範囲に含まれて 2
    expect(calculateGrade('roa', 0)).toBe(2);
    expect(getMaxGradeScore()).toBeGreaterThanOrEqual(5);
  });

  it('prefers UI order when multiple levels overlap', () => {
    const config = {
      gradeSettings: {
        roa: {
          orientation: 'higher',
          includeLower: true,
          includeUpper: true,
          levels: [
            { grade: 5, min: 0, max: 100 },
            { grade: 3, min: 50, max: 150 },
            { grade: 1, min: -Infinity, max: 10 },
          ],
        },
      },
    };
    updateGradeThresholdsFromConfig(config);
    // 75 は 5(0-100) と 3(50-150) の両方に該当 → 先頭の5が採用
    expect(calculateGrade('roa', 75)).toBe(5);
    // 5 は 5(0-100) と 1(-Inf-10) の両方に該当 → 先頭の5が採用
    expect(calculateGrade('roa', 5)).toBe(5);
    // 140 は 3(50-150) のみ → 3
    expect(calculateGrade('roa', 140)).toBe(3);

    // 並びを入れ替えると優先順位も変わる
    const reversed = {
      gradeSettings: {
        roa: {
          orientation: 'higher',
          includeLower: true,
          includeUpper: true,
          levels: [
            { grade: 3, min: 50, max: 150 },
            { grade: 5, min: 0, max: 100 },
          ],
        },
      },
    };
    updateGradeThresholdsFromConfig(reversed);
    // 75 は両方に該当するが、先頭が3に変わったので3が採用
    expect(calculateGrade('roa', 75)).toBe(3);
  });
});


