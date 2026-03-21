/**
 * useMasteryScore — Provides animated mastery score data for the HomeScreen
 *
 * Returns:
 *  - animatedScore     (Animated.Value: 0→latestScore for count-up)
 *  - animatedProgress  (Animated.Value: 0→latestScore for progress bar / gauge)
 *  - fadeAnim          (Animated.Value: opacity for weekly insight fade-in)
 *  - displayScore      (number: current integer value for display)
 *  - weeklyChangeText  (string: "+12% this week" / "-5% this week" / "No change this week")
 *  - weeklyChangeColor (string: green / red / white)
 *  - motivationalMessage (string: emoji + microcopy based on trend)
 *  - latestScore       (number: raw latest score)
 *  - trend             ('positive' | 'negative' | 'neutral')
 *  - refreshMastery()  (async function to re-fetch data and replay animation)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { MasteryScoreService } from '../services/MasteryScoreService';
import { WeeklyAnalysis } from '../types/session';

export interface UseMasteryScoreReturn {
  animatedScore: Animated.Value;
  animatedProgress: Animated.Value;
  fadeAnim: Animated.Value;
  displayScore: number;
  weeklyChangeText: string;
  weeklyChangeColor: string;
  motivationalMessage: string;
  latestScore: number;
  trend: 'positive' | 'negative' | 'neutral';
  refreshMastery: () => Promise<void>;
}

const ANIMATION_DURATION = 1200;
const FADE_DELAY = 600;

function getWeeklyChangeText(analysis: WeeklyAnalysis): string {
  if (analysis.previousWeekAvg === 0 && analysis.currentWeekAvg === 0) {
    return 'No change this week';
  }
  if (analysis.previousWeekAvg === 0 && analysis.currentWeekAvg > 0) {
    return 'First week tracked!';
  }
  if (analysis.improvementPercent > 0) {
    return `+${analysis.improvementPercent}% this week`;
  }
  if (analysis.improvementPercent < 0) {
    return `${analysis.improvementPercent}% this week`;
  }
  return 'No change this week';
}

function getWeeklyChangeColor(trend: 'positive' | 'negative' | 'neutral'): string {
  switch (trend) {
    case 'positive': return '#4CAF7D';
    case 'negative': return '#FF6B6B';
    case 'neutral': return 'rgba(255,255,255,0.8)';
  }
}

function getMotivationalMessage(trend: 'positive' | 'negative' | 'neutral'): string {
  switch (trend) {
    case 'positive': return "You're improving 🚀";
    case 'negative': return 'Keep practicing 💪';
    case 'neutral': return 'Stay consistent 🔁';
  }
}

export const useMasteryScore = (fallbackScore: number = 0): UseMasteryScoreReturn => {
  const animatedScore = useRef(new Animated.Value(0)).current;
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [displayScore, setDisplayScore] = useState(0);
  const [latestScore, setLatestScore] = useState(0);
  const [weeklyChangeText, setWeeklyChangeText] = useState('No change this week');
  const [weeklyChangeColor, setWeeklyChangeColor] = useState('rgba(255,255,255,0.8)');
  const [motivationalMessage, setMotivationalMessage] = useState('Stay consistent 🔁');
  const [trend, setTrend] = useState<'positive' | 'negative' | 'neutral'>('neutral');

  const runAnimations = useCallback((targetScore: number) => {
    // Reset
    animatedScore.setValue(0);
    animatedProgress.setValue(0);
    fadeAnim.setValue(0);

    // Listen to animated value to update display score (integer count-up)
    const listenerId = animatedScore.addListener(({ value }) => {
      setDisplayScore(Math.round(value));
    });

    // Score count-up
    Animated.timing(animatedScore, {
      toValue: targetScore,
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      animatedScore.removeListener(listenerId);
      setDisplayScore(Math.round(targetScore));
    });

    // Progress bar / gauge fill
    Animated.timing(animatedProgress, {
      toValue: targetScore,
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Weekly insight fade-in after delay
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      delay: FADE_DELAY,
      useNativeDriver: true,
    }).start();
  }, [animatedScore, animatedProgress, fadeAnim]);

  const refreshMastery = useCallback(async () => {
    try {
      // Seed mastery scores from existing sessions if none exist yet
      await MasteryScoreService.seedFromSessions();
      
      const analysis = await MasteryScoreService.getWeeklyAnalysis();

      setLatestScore(analysis.latestScore);
      setTrend(analysis.trend);
      setWeeklyChangeText(getWeeklyChangeText(analysis));
      setWeeklyChangeColor(getWeeklyChangeColor(analysis.trend));
      setMotivationalMessage(getMotivationalMessage(analysis.trend));

      // Trigger animations - use latestScore if > 0, otherwise fallback
      const targetScore = analysis.latestScore > 0 ? analysis.latestScore : fallbackScore;
      runAnimations(targetScore);
    } catch (error) {
      console.error('[useMasteryScore] Error refreshing:', error);
    }
  }, [runAnimations, fallbackScore]);

  useEffect(() => {
    refreshMastery();
  }, [refreshMastery]);

  return {
    animatedScore,
    animatedProgress,
    fadeAnim,
    displayScore,
    weeklyChangeText,
    weeklyChangeColor,
    motivationalMessage,
    latestScore,
    trend,
    refreshMastery,
  };
};
