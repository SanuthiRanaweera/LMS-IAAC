import { isPassingScore } from './gradeCalculator.js';
import { getRequiredModules } from '../config/academicModules.js';

/**
 * Calculates the overall diploma final status for a student.
 *
 * Rules:
 * - 'Pending': If one or more required modules do not have examination results (or score is null/undefined).
 * - 'Passed':  If ALL required modules have recorded results and EVERY module has a passing score (score >= 60).
 * - 'Failed':  If ALL required modules have recorded results but ONE OR MORE modules have failing scores (score < 60).
 *
 * @param {Array<{ moduleName: string, score: number|null, grade?: string }>} studentModules
 * @param {string[]|string} requiredModulesOrDiploma - Either an array of required module names or diploma title
 * @returns {'Pending' | 'Passed' | 'Failed'}
 */
export function calculateFinalStatus(studentModules, requiredModulesOrDiploma) {
  const requiredModules = Array.isArray(requiredModulesOrDiploma)
    ? requiredModulesOrDiploma
    : getRequiredModules(requiredModulesOrDiploma);

  if (!Array.isArray(requiredModules) || requiredModules.length === 0) {
    return 'Pending';
  }

  const modulesList = Array.isArray(studentModules) ? studentModules : [];

  let hasFailingModule = false;

  for (const reqModule of requiredModules) {
    const normalizedReq = reqModule.trim().toLowerCase();

    const record = modulesList.find(
      (m) => String(m?.moduleName || '').trim().toLowerCase() === normalizedReq
    );

    if (
      !record ||
      record.score === null ||
      record.score === undefined ||
      record.score === '' ||
      Number.isNaN(Number(record.score))
    ) {
      return 'Pending';
    }

    const numericScore = Number(record.score);
    if (!isPassingScore(numericScore)) {
      hasFailingModule = true;
    }
  }

  return hasFailingModule ? 'Failed' : 'Passed';
}

