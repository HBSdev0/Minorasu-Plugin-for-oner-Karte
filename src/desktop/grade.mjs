// 成績計算ロジック（純粋関数群）

// デフォルトの成績評価しきい値
const DEFAULT_GRADE_THRESHOLDS = {
  assetEfficiency: [
    { score: 5, min: 120, max: Infinity },
    { score: 4, min: 100, max: 120 },
    { score: 3, min: 80, max: 100 },
    { score: 2, min: 60, max: 80 },
    { score: 1, min: -Infinity, max: 60 },
  ],
  roa: [
    { score: 5, min: 8, max: Infinity },
    { score: 4, min: 6, max: 8 },
    { score: 3, min: 4, max: 6 },
    { score: 2, min: 2, max: 4 },
    { score: 1, min: -Infinity, max: 2 },
  ],
  incomeTax: [
    { score: 5, min: -Infinity, max: 10 },
    { score: 4, min: 10, max: 20 },
    { score: 3, min: 20, max: 30 },
    { score: 2, min: 30, max: 40 },
    { score: 1, min: 40, max: Infinity },
  ],
  operatingCost: [
    { score: 5, min: -Infinity, max: 15 },
    { score: 4, min: 15, max: 20 },
    { score: 3, min: 20, max: 25 },
    { score: 2, min: 25, max: 30 },
    { score: 1, min: 30, max: Infinity },
  ],
  noi: [
    { score: 5, min: 8, max: Infinity },
    { score: 4, min: 6, max: 8 },
    { score: 3, min: 4, max: 6 },
    { score: 2, min: 2, max: 4 },
    { score: 1, min: -Infinity, max: 2 },
  ],
};

let gradeThresholds = deepClone(DEFAULT_GRADE_THRESHOLDS);

function deepClone(value) {
  if (Array.isArray(value)) {
    return value.map(v => deepClone(v));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value)) {
      out[key] = deepClone(value[key]);
    }
    return out;
  }
  // プリミティブ値（Number含む）はそのまま返す（Infinity/-Infinityも保持）
  return value;
}

export function resetGradeThresholds() {
  gradeThresholds = deepClone(DEFAULT_GRADE_THRESHOLDS);
}

export function getGradeThresholds() {
  return deepClone(gradeThresholds);
}

export function setGradeThresholds(newThresholds) {
  if (!newThresholds || typeof newThresholds !== 'object') return;
  gradeThresholds = deepClone(newThresholds);
}

// 設定から成績基準を更新（動的段階・評価方向・境界含有に対応）
export function updateGradeThresholdsFromConfig(config) {
  try {
    if (config && config.gradeSettings) {
      const settings = typeof config.gradeSettings === 'string' ? JSON.parse(config.gradeSettings) : config.gradeSettings;
      Object.keys(settings || {}).forEach(metric => {
        const mset = settings[metric];
        if (!mset || !Array.isArray(mset.levels)) return;
        const orientation = (mset.orientation === 'lower' || mset.orientation === 'higher') ? mset.orientation : 'higher';
        const includeLower = (typeof mset.includeLower === 'boolean') ? mset.includeLower : true;
        const includeUpper = (typeof mset.includeUpper === 'boolean') ? mset.includeUpper : false;

        function parseBound(value, isMin) {
          if (value === '' || value === null || value === undefined) {
            return isMin ? -Infinity : Infinity;
          }
          if (typeof value === 'number') {
            if (!isFinite(value)) return isMin ? -Infinity : Infinity;
            return value;
          }
          const str = String(value).trim();
          if (str === '') return isMin ? -Infinity : Infinity;
          if (str.toLowerCase() === 'infinity' || str === '+Infinity') return Infinity;
          if (str.toLowerCase() === '-infinity') return -Infinity;
          const num = Number(str);
          return isNaN(num) ? (isMin ? -Infinity : Infinity) : num;
        }

        let levels = mset.levels.map(l => {
          const min = parseBound(l.min, true);
          const max = parseBound(l.max, false);
          const minType = l.minType === 'gte' || l.minType === 'gt' ? l.minType : null;
          const maxType = l.maxType === 'lte' || l.maxType === 'lt' ? l.maxType : null;
          const levelIncludeLower = minType ? (minType === 'gte') : includeLower;
          const levelIncludeUpper = maxType ? (maxType === 'lte') : includeUpper;
          return {
            min,
            max,
            grade: l.grade,
            includeLower: levelIncludeLower,
            includeUpper: levelIncludeUpper,
          };
        }).filter(l => l.min !== undefined && l.max !== undefined);

        const num = levels.length;
        const thresholds = levels.map((l, idx) => {
          const parsedGrade = parseInt(l.grade, 10);
          const gradeFromLevel = Number.isFinite(parsedGrade) && parsedGrade > 0 ? parsedGrade : null;
          const score = gradeFromLevel != null
            ? gradeFromLevel
            : ((orientation === 'higher') ? (idx + 1) : (num - idx));
          return {
            score,
            min: l.min,
            max: l.max,
            includeLower: l.includeLower,
            includeUpper: l.includeUpper,
          };
        });

        gradeThresholds[metric] = thresholds;
      });
    } else if (config && config.gradeThresholds) {
      const savedThresholds = typeof config.gradeThresholds === 'string' ? JSON.parse(config.gradeThresholds) : config.gradeThresholds;
      Object.keys(savedThresholds || {}).forEach(metric => {
        if (!savedThresholds[metric]) return;
        const grades = ['grade5', 'grade4', 'grade3', 'grade2', 'grade1'];
        const scores = [5, 4, 3, 2, 1];
        const thresholds = grades.map((g, i) => {
          let min = parseFloat(savedThresholds[metric][g]?.min);
          let max = parseFloat(savedThresholds[metric][g]?.max);
          if (isNaN(min)) min = -Infinity;
          if (isNaN(max)) max = Infinity;
          return { score: scores[i], min, max, includeLower: true, includeUpper: false };
        });
        gradeThresholds[metric] = thresholds;
      });
    }
  } catch (error) {
    // 失敗時はデフォルトのまま
  }
}

export function getMaxGradeScore() {
  try {
    const scores = Object.keys(gradeThresholds).map(k => {
      const arr = Array.isArray(gradeThresholds[k]) ? gradeThresholds[k] : [];
      const localMax = arr.reduce((m, t) => Math.max(m, Number.isFinite(t.score) ? t.score : 0), 0);
      return localMax;
    });
    const max = Math.max(5, ...scores);
    return isFinite(max) && max > 0 ? max : 5;
  } catch (_) {
    return 5;
  }
}

export function calculateGrade(metric, value) {
  const thresholds = gradeThresholds[metric];
  if (!thresholds) return 1;

  const numValue = parseFloat(value);
  if (isNaN(numValue)) return 1;

  // 複数マッチ時はUIの上から（配列の先頭から）優先
  for (const threshold of thresholds) {
    const incL = (typeof threshold.includeLower === 'boolean') ? threshold.includeLower : true;
    const incU = (typeof threshold.includeUpper === 'boolean') ? threshold.includeUpper : false;
    const lowerOk = incL ? (numValue >= threshold.min) : (numValue > threshold.min);
    const upperOk = incU ? (numValue <= threshold.max) : (numValue < threshold.max);
    if (lowerOk && upperOk) {
      return Number(threshold.score) || 1;
    }
  }
  return 1;
}

export default {
  resetGradeThresholds,
  getGradeThresholds,
  setGradeThresholds,
  updateGradeThresholdsFromConfig,
  getMaxGradeScore,
  calculateGrade,
};


