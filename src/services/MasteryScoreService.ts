/**
 * 🔒 PRIVACY NOTICE
 * All mastery score data is stored locally on device using AsyncStorage.
 * No cloud sync. No external storage. No data leaves this device.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MasteryScoreEntry, WeeklyAnalysis } from '../types/session';

const MASTERY_SCORES_KEY = '@latent:mastery_scores';

/**
 * Returns the Monday 00:00:00 of the week containing the given timestamp
 */
function getWeekStart(timestamp: number): number {
  const date = new Date(timestamp);
  const day = date.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(date);
  monday.setDate(date.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

/**
 * MasteryScoreService — Tracks session mastery scores and computes weekly trends
 */
export class MasteryScoreService {
  /**
   * Save a new mastery score entry
   */
  static async saveScore(score: number, timestamp: number): Promise<void> {
    try {
      const entries = await this.getAllScores();
      entries.push({ score: Math.round(score), timestamp });
      await AsyncStorage.setItem(MASTERY_SCORES_KEY, JSON.stringify(entries));
      console.log('[MasteryScore] Score saved:', Math.round(score));
    } catch (error) {
      console.error('[MasteryScore] Error saving score:', error);
    }
  }

  /**
   * Get all stored scores
   */
  static async getAllScores(): Promise<MasteryScoreEntry[]> {
    try {
      const data = await AsyncStorage.getItem(MASTERY_SCORES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[MasteryScore] Error getting scores:', error);
      return [];
    }
  }

  /**
   * Get the most recent score
   */
  static async getLatestScore(): Promise<number> {
    const entries = await this.getAllScores();
    if (entries.length === 0) { return 0; }
    // Sort by timestamp descending, return newest
    entries.sort((a, b) => b.timestamp - a.timestamp);
    return entries[0].score;
  }

  /**
   * Compute weekly analysis:
   *  - currentWeekAvg = average of scores in the current Mon–Sun window
   *  - previousWeekAvg = average of scores in the 7 days before that
   *  - improvementPercent = ((current - previous) / previous) * 100
   *  - trend = 'positive' | 'negative' | 'neutral'
   */
  static async getWeeklyAnalysis(): Promise<WeeklyAnalysis> {
    const entries = await this.getAllScores();

    const now = Date.now();
    const currentWeekStart = getWeekStart(now);
    const previousWeekStart = currentWeekStart - 7 * 24 * 60 * 60 * 1000;

    const currentWeekScores: number[] = [];
    const previousWeekScores: number[] = [];

    for (const entry of entries) {
      if (entry.timestamp >= currentWeekStart) {
        currentWeekScores.push(entry.score);
      } else if (entry.timestamp >= previousWeekStart && entry.timestamp < currentWeekStart) {
        previousWeekScores.push(entry.score);
      }
    }

    const avg = (arr: number[]): number =>
      arr.length === 0 ? 0 : Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);

    const currentWeekAvg = avg(currentWeekScores);
    const previousWeekAvg = avg(previousWeekScores);

    let improvementPercent = 0;
    let trend: 'positive' | 'negative' | 'neutral' = 'neutral';

    if (previousWeekAvg > 0 && currentWeekAvg > 0) {
      improvementPercent = Math.round(
        ((currentWeekAvg - previousWeekAvg) / previousWeekAvg) * 100
      );
      if (improvementPercent > 0) { trend = 'positive'; }
      else if (improvementPercent < 0) { trend = 'negative'; }
      else { trend = 'neutral'; }
    } else if (currentWeekAvg > 0 && previousWeekAvg === 0) {
      // First week with data — treat as positive
      trend = 'positive';
      improvementPercent = 100;
    }

    const latestScore = await this.getLatestScore();

    return {
      currentWeekAvg,
      previousWeekAvg,
      improvementPercent,
      trend,
      latestScore,
    };
  }

  /**
   * Seed mastery scores from existing sessions if no mastery data exists yet.
   * This handles the case where sessions were completed before the mastery service was added.
   */
  static async seedFromSessions(): Promise<void> {
    try {
      const entries = await this.getAllScores();
      if (entries.length > 0) {
        return; // Already has mastery data, no need to seed
      }

      const { LocalStorageService } = require('./LocalStorageService');
      const sessions = await LocalStorageService.getAllSessions();

      if (!sessions || sessions.length === 0) {
        return;
      }

      for (const session of sessions) {
        if (session.cognitiveMetrics && session.cognitiveMetrics.focusScore > 0) {
          await this.saveScore(session.cognitiveMetrics.focusScore, session.timestamp);
        }
      }

      console.log('[MasteryScore] Seeded', sessions.length, 'scores from existing sessions');
    } catch (error) {
      console.error('[MasteryScore] Error seeding from sessions:', error);
    }
  }

  /**
   * Clear all mastery scores (used by clearAllData)
   */
  static async clearScores(): Promise<void> {
    try {
      await AsyncStorage.removeItem(MASTERY_SCORES_KEY);
      console.log('[MasteryScore] All scores cleared');
    } catch (error) {
      console.error('[MasteryScore] Error clearing scores:', error);
    }
  }
}
