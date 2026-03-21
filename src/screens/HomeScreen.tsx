import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Alert,
  Modal,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppColors } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { useSessionAnalyzer } from '../hooks/useSessionAnalyzer';
import { useMasteryScore } from '../hooks/useMasteryScore';
import { SessionSummaryCard } from '../components/SessionSummaryCard';
import { getAllModes } from '../ai/patternLibrary';
import { NegotiationMode, ModeConfig } from '../types/session';
import { PRACTICE_PERSONAS, OpponentPersona } from '../ai/personas';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type HomeScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Home'>;
};

// ─── Animated Mastery Gauge Component ───
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const MasteryGauge: React.FC<{
  displayScore: number;
  size?: number;
}> = ({ displayScore, size = 120 }) => {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // half circle
  
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [currentScore, setCurrentScore] = useState(0);

  useEffect(() => {
    const clampedTarget = Math.min(100, Math.max(0, displayScore));
    
    // Animate the value
    Animated.timing(animatedValue, {
      toValue: clampedTarget,
      duration: 1200,
      useNativeDriver: true,
    }).start();

    // Listen to value changes to update the text score
    const listener = animatedValue.addListener(({ value }: { value: number }) => {
      setCurrentScore(Math.round(value));
    });

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [displayScore, animatedValue]);

  // Interpolate the dashoffset for the SVG stroke
  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: 'clamp',
  });

  const renderTick = (angle: number, label: string) => {
    const radian = (angle * Math.PI) / 180;
    const tickOuter = radius + 15;
    const tickInner = radius + 5;
    const x1 = size / 2 + tickOuter * Math.cos(radian);
    const y1 = size / 2 + tickOuter * Math.sin(radian);
    const x2 = size / 2 + tickInner * Math.cos(radian);
    const y2 = size / 2 + tickInner * Math.sin(radian);
    
    const textRadius = radius + 28;
    const tx = size / 2 + textRadius * Math.cos(radian);
    const ty = size / 2 + textRadius * Math.sin(radian) + 4; // slight y offset adjustment

    return (
      <React.Fragment key={label}>
        <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.7)" strokeWidth={2} strokeLinecap="round" />
        <SvgText x={tx} y={ty} fill="rgba(255,255,255,0.9)" fontSize={12} fontWeight="600" textAnchor="middle" alignmentBaseline="middle">
          {label}
        </SvgText>
      </React.Fragment>
    );
  };

  const getStrokeColor = (score: number) => {
    if (score < 40) return '#FF1A1A'; // Vibrant Red
    if (score <= 70) return '#FFD700'; // Average (Gold/Yellow)
    return '#00E396'; // Vibrant Green
  };

  const dynamicColor = getStrokeColor(displayScore);

  return (
    <View style={{ width: size, height: size / 2 + 30, alignItems: 'center', justifyContent: 'flex-end', marginTop: 20 }}>
      <Svg width={size} height={size / 2 + strokeWidth + 20} style={{ position: 'absolute', top: -20, overflow: 'visible' }}>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={0}
          rotation={-180}
          origin={`${size / 2}, ${size / 2}`}
        />
        {/* Progress arc — fills as currentScore counts up */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={dynamicColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          rotation={-180}
          origin={`${size / 2}, ${size / 2}`}
        />
        
        {renderTick(-180, '0')}
        {renderTick(-90, '50')}
        {renderTick(0, '100')}
        
        {/* Thumb indicator */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={dynamicColor}
          strokeWidth={strokeWidth + 4}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`0 ${circumference}`}
          strokeDashoffset={animatedValue.interpolate({
            inputRange: [0, 100],
            outputRange: [circumference, 0],
            extrapolate: 'clamp',
          })}
          rotation={-180}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={{ alignItems: 'center', marginBottom: -10 }}>
        <Text style={styles.gaugeScore}>{currentScore}</Text>
        <Text style={styles.gaugeTotal}>/ 100</Text>
      </View>
    </View>
  );
};

// ─── Circular Progress Icon Component ───
const CircularProgressIcon: React.FC<{
  progress: number;
  icon: string;
  color: string;
  bgColor: string;
}> = ({ progress, icon, color, bgColor }) => {
  const size = 56;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * 2 * radius;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: size - strokeWidth * 2,
        height: size - strokeWidth * 2,
        borderRadius: (size - strokeWidth * 2) / 2,
        backgroundColor: bgColor,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute'
      }}>
        <Text style={{ fontSize: 24 }}>{icon}</Text>
      </View>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
        />
        {clampedProgress > 0 && (
          <Circle
            cx={size / 2 + radius * Math.cos((clampedProgress / 100) * 2 * Math.PI)}
            cy={size / 2 + radius * Math.sin((clampedProgress / 100) * 2 * Math.PI)}
            r={2.5}
            fill={color}
          />
        )}
      </Svg>
    </View>
  );
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { sessions, stats, isLoading, refreshSessions } = useSessionAnalyzer();
  const {
    displayScore,
    latestScore,
    refreshMastery,
  } = useMasteryScore(stats && stats.totalSessions > 0 ? Math.round(stats.avgFocusScore) : 0);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showPersonaSelector, setShowPersonaSelector] = useState(false);
  const allModes = getAllModes();

  // FAB Pulse Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
      ])
    ).start();
  }, [pulseAnim]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshSessions();
      refreshMastery();
    });
    return unsubscribe;
  }, [navigation, refreshSessions, refreshMastery]);

  const handleStartSession = (mode: NegotiationMode) => {
    setShowModeSelector(false);
    navigation.navigate('PreSessionForm', { mode });
  };

  const handleSessionPress = (sessionId: string) => {
    navigation.navigate('Insights', { sessionId });
  };

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    return `${minutes}min`;
  };

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Use dynamic mastery score from the hook (falls back to stats if no mastery data)
  const actualScore = latestScore > 0
    ? latestScore
    : (stats && stats.totalSessions > 0 ? Math.round(stats.avgFocusScore) : 0);
    
  // Default to 78 for demonstration purposes if no sessions exist yet
  const masteryScore = actualScore > 0 ? actualScore : 78;

  // Calculate progress for each mode based on sessions
  const liveSessionCount = sessions.filter(s => s.mode).length;
  const liveProgress = Math.min(liveSessionCount * 20, 100);
  const replayProgress = sessions.length > 0 ? Math.min(sessions.length * 15, 100) : 0;
  const practiceProgress = 0; // Coming soon

  // Focus areas
  const getFocusLabel = (score: number): string => {
    if (score >= 80) return 'Advanced';
    if (score >= 60) return 'Proficient';
    if (score >= 40) return 'Developing';
    return 'Foundational';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={AppColors.primaryLight} />

      <LinearGradient
        colors={['#FFF8F2', '#FFF0E6', '#FFE8D9']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refreshSessions}
              tintColor={AppColors.accentPrimary}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.avatarImage}
                resizeMode="cover"
              />
              <View style={styles.headerTextContainer}>
                <Text style={styles.greeting}>{getGreeting()},</Text>
                <Text style={styles.userName}>Latent Strategist</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <Text style={styles.notificationIcon}>🔔</Text>
            </TouchableOpacity>
          </View>

        {/* ─── Practice Persona Selector Modal ─── */}
        <Modal
          visible={showPersonaSelector}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowPersonaSelector(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Opponent</Text>
                <TouchableOpacity onPress={() => setShowPersonaSelector(false)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.modalSubtitle}>
                Choose an AI persona for your practice simulation
              </Text>
              
              <ScrollView style={styles.modesScroll} showsVerticalScrollIndicator={false}>
                {PRACTICE_PERSONAS.map((persona) => (
                  <TouchableOpacity
                    key={persona.id}
                    style={styles.modeCard}
                    onPress={() => {
                      setShowPersonaSelector(false);
                      // Navigate to PreSessionForm using a custom mode mapped for practice
                      navigation.navigate('PreSessionForm', { mode: NegotiationMode.CUSTOM_SCENARIO });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.modeIconCircle, { backgroundColor: persona.color + '20' }]}>
                      <Text style={styles.modeIcon}>{persona.icon}</Text>
                    </View>
                    <View style={styles.modeInfo}>
                      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4}}>
                        <Text style={styles.modeTitle}>{persona.name}</Text>
                        <View style={{backgroundColor: '#F0F0F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10}}>
                          <Text style={{fontSize: 10, fontWeight: '700', color: '#666'}}>{persona.difficulty}</Text>
                        </View>
                      </View>
                      <Text style={styles.modeDescription}>{persona.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ─── Mode Selector Modal ─── */}
          <LinearGradient
            colors={['#E8573E', '#F4845F', '#F9A88C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.masteryCard}
          >
            <Text style={styles.masteryLabel}>Negotiation Mastery Score</Text>

            <View style={styles.masteryContent}>
              <View style={[styles.masteryFocusColumn, { alignItems: 'flex-start' }]}>
                <Text style={styles.focusSkill}>Empathy</Text>
              </View>

              <MasteryGauge displayScore={displayScore > 0 ? displayScore : masteryScore} size={150} />

              <View style={[styles.masteryFocusColumn, { alignItems: 'flex-end' }]}>
                <Text style={styles.focusSkill}>Persuasion</Text>
              </View>
            </View>

            <View style={styles.masteryBadge}>
              <Text style={styles.masteryBadgeText}>
                {(stats?.totalSessions || 0) === 0 
                  ? '✓ 0 sessions completed · Start your first →'
                  : `📈 ${stats?.totalSessions || 0} session${(stats?.totalSessions || 0) !== 1 ? 's' : ''} completed`}
              </Text>
            </View>
          </LinearGradient>

          {/* ─── Gamification: Streaks & Goals ─── */}
          <View style={styles.statsRow}>
            {/* Daily Streak */}
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statEmoji}>🔥</Text>
                <Text style={styles.statTitle}>Daily streak</Text>
              </View>
              <Text style={styles.statValue}>{stats?.currentStreak || 0}</Text>
              <Text style={styles.statSubTextRed}>
                {(stats?.currentStreak || 0) > 0 ? "You're on fire!" : "Start today!"}
              </Text>
            </View>

            {/* Weekly Goal */}
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Text style={styles.statTitle}>Weekly goal</Text>
              </View>
              <Text style={styles.statValue}>{(stats?.weeklySessionsCount || 1)} / 3 sessions</Text>
              <View style={styles.goalProgressBg}>
                <View style={[
                  styles.goalProgressFill, 
                  { width: `${Math.min(((stats?.weeklySessionsCount || 1) / 3) * 100, 100)}%` }
                ]} />
              </View>
            </View>
          </View>

          {/* ─── Action Cards with Progress ─── */}
          <View style={styles.actionColumn}>
            {/* Live Tactical Mode */}
            <TouchableOpacity
              style={styles.actionItemLarge}
              onPress={() => setShowModeSelector(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.actionRow, { borderBottomWidth: 0 }]}>
                <View>
                  <CircularProgressIcon
                    progress={liveProgress}
                    icon="🎤"
                    color="#E8573E"
                    bgColor="#FFF0EB"
                  />
                  <View style={[styles.liveBadge, { position: 'absolute', bottom: -5, left: 10 }]}>
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                </View>
                <View style={styles.actionTextContent}>
                  <Text style={styles.actionLabelLarge}>Live Tactical Mode</Text>
                  <Text style={styles.actionSubLabelLarge}>Real-time negotiation intelligence</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Strategic Outcome Replay */}
            <TouchableOpacity
              style={styles.actionItemLarge}
              onPress={() => {
                if (sessions.length > 0) {
                  navigation.navigate('OutcomeReplay', { sessionId: sessions[0].id });
                } else {
                  Alert.alert('No Sessions', 'Complete a session first to view replays.');
                }
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.actionRow, { borderBottomWidth: 0 }]}>
                <CircularProgressIcon
                  progress={replayProgress}
                  icon="🧠"
                  color="#4CAF7D"
                  bgColor="#E8F5EC"
                />
                <View style={styles.actionTextContent}>
                  <Text style={styles.actionLabelLarge}>Strategic Outcome Replay™</Text>
                  <Text style={styles.actionSubLabelLarge}>Counterfactual behavior modeling</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Practice Simulation */}
            <TouchableOpacity
              style={styles.actionItemLarge}
              onPress={() => setShowPersonaSelector(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.actionRow, { borderBottomWidth: 0 }]}>
                <CircularProgressIcon
                  progress={practiceProgress}
                  icon="⚔️"
                  color="#F5A623"
                  bgColor="#FFF8E6"
                />
                <View style={styles.actionTextContent}>
                  <Text style={styles.actionLabelLarge}>Practice Simulation</Text>
                  <Text style={styles.actionSubLabelLarge}>Mock scenarios against AI</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* ─── Recent Sessions (Redesigned) ─── */}
          <View style={styles.sessionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent sessions</Text>
              {sessions.length > 0 && (
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>See all</Text>
                </TouchableOpacity>
              )}
            </View>

            {sessions.length === 0 ? (
              <View style={styles.recentSessionCard}>
                <View style={styles.rsCardHeader}>
                  <View style={{flex: 1}}>
                    <Text style={styles.rsCardTitle}>Session 1: Job Interview</Text>
                    <Text style={styles.rsCardSubtitle}>Today · 0 min · Practice Simulation</Text>
                  </View>
                  <Text style={{fontSize: 22}}>✅</Text>
                </View>

                <View style={styles.rsScoreSection}>
                  <Text style={styles.rsScoreLabel}>Score</Text>
                  <View style={styles.rsScoreBarContainer}>
                    <View style={styles.rsScoreBarBg}>
                      <LinearGradient
                        colors={['#E8573E', '#F4845F']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.rsScoreBarFill, { width: '83%' }]}
                      />
                    </View>
                    <View style={styles.rsScoreBarLabels}>
                      <Text style={styles.rsScoreBarLabel}>0</Text>
                      <Text style={styles.rsScoreBarLabel}>100</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.rsScoreValue}>83%</Text>

                <View style={styles.rsTagsRow}>
                  <View style={[styles.rsTag, {backgroundColor: '#E8F5EC'}]}>
                    <Text style={[styles.rsTagText, {color: '#2E7D32'}]}>Strong opening</Text>
                  </View>
                  <View style={[styles.rsTag, {backgroundColor: '#FFF3E0'}]}>
                    <Text style={[styles.rsTagText, {color: '#E65100'}]}>Pacing needs work</Text>
                  </View>
                  <View style={[styles.rsTag, {backgroundColor: '#E3F2FD'}]}>
                    <Text style={[styles.rsTagText, {color: '#1565C0'}]}>Good empathy</Text>
                  </View>
                </View>
              </View>
            ) : (
              sessions.slice(0, 3).map((session, index) => {
                const score = Math.round(session.cognitiveMetrics.focusScore);
                const tags = [];
                if (score >= 70) tags.push({ label: 'Strong opening', bg: '#E8F5EC', color: '#2E7D32' });
                if (session.cognitiveMetrics.avgSpeechRate < 120 || session.cognitiveMetrics.avgSpeechRate > 160) tags.push({ label: 'Pacing needs work', bg: '#FFF3E0', color: '#E65100' });
                if (score >= 50) tags.push({ label: 'Good empathy', bg: '#E3F2FD', color: '#1565C0' });

                return (
                  <TouchableOpacity
                    key={session.id}
                    style={styles.recentSessionCard}
                    onPress={() => handleSessionPress(session.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.rsCardHeader}>
                      <View style={{flex: 1}}>
                        <Text style={styles.rsCardTitle}>
                          Session {index + 1}: {session.mode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Text>
                        <Text style={styles.rsCardSubtitle}>
                          Today · {formatDuration(session.duration)} · {session.mode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Text>
                      </View>
                      <Text style={{fontSize: 22}}>{score >= 70 ? '✅' : '⭐'}</Text>
                    </View>

                    <View style={styles.rsScoreSection}>
                      <Text style={styles.rsScoreLabel}>Score</Text>
                      <View style={styles.rsScoreBarContainer}>
                        <View style={styles.rsScoreBarBg}>
                          <LinearGradient
                            colors={['#E8573E', '#F4845F']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.rsScoreBarFill, { width: `${score}%` }]}
                          />
                        </View>
                        <View style={styles.rsScoreBarLabels}>
                          <Text style={styles.rsScoreBarLabel}>0</Text>
                          <Text style={styles.rsScoreBarLabel}>100</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.rsScoreValue}>{score}%</Text>

                    <View style={styles.rsTagsRow}>
                      {tags.map((tag, i) => (
                        <View key={i} style={[styles.rsTag, {backgroundColor: tag.bg}]}>
                          <Text style={[styles.rsTagText, {color: tag.color}]}>{tag.label}</Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* ─── Quick Stats (Redesigned 2x2 Grid) ─── */}
          <View style={styles.quickStatsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick stats</Text>
              <View style={styles.qsTrackedBadge}>
                <Text style={styles.qsTrackedIcon}>⏱</Text>
                <Text style={styles.qsTrackedText}>{stats?.totalSessions || 1} session tracked</Text>
              </View>
            </View>

            <View style={styles.quickStatsGrid}>
              {/* Avg Focus */}
              <View style={styles.quickStatCard}>
                <View style={styles.qsCardHeader}>
                  <View style={[styles.qsIconCircle, {backgroundColor: '#FFF0EB'}]}>
                    <Text style={styles.qsIconEmoji}>🎯</Text>
                  </View>
                  <Text style={styles.qsCardLabel}>Avg focus</Text>
                </View>
                <Text style={styles.qsCardValue}>{stats?.avgFocusScore ? Math.round(stats.avgFocusScore) : 83}%</Text>
                <Text style={styles.qsCardTrend}>📈 First session baseline</Text>
              </View>

              {/* Patterns */}
              <View style={styles.quickStatCard}>
                <View style={styles.qsCardHeader}>
                  <View style={[styles.qsIconCircle, {backgroundColor: '#F3E8FF'}]}>
                    <Text style={styles.qsIconEmoji}>⚡</Text>
                  </View>
                  <Text style={styles.qsCardLabel}>Patterns</Text>
                </View>
                <Text style={styles.qsCardValue}>{stats?.totalPatterns || 2}</Text>
                <View style={styles.qsPatternTags}>
                  <View style={[styles.qsPatternPill, {backgroundColor: '#F3E8FF'}]}>
                    <Text style={[styles.qsPatternText, {color: '#7C3AED'}]}>Anchoring</Text>
                  </View>
                  <View style={[styles.qsPatternPill, {backgroundColor: '#F3E8FF'}]}>
                    <Text style={[styles.qsPatternText, {color: '#7C3AED'}]}>Empathy</Text>
                  </View>
                </View>
              </View>

              {/* Avg Duration */}
              <View style={styles.quickStatCard}>
                <View style={styles.qsCardHeader}>
                  <View style={[styles.qsIconCircle, {backgroundColor: '#E0F2FE'}]}>
                    <Text style={styles.qsIconEmoji}>⏱️</Text>
                  </View>
                  <Text style={styles.qsCardLabel}>Avg duration</Text>
                </View>
                <Text style={styles.qsCardValue}>{stats?.avgDuration ? formatDuration(stats.avgDuration) : '0 min'}</Text>
                <Text style={styles.qsCardSubtext}>Complete a session to track</Text>
              </View>

              {/* Best Score */}
              <View style={styles.quickStatCard}>
                <View style={styles.qsCardHeader}>
                  <View style={[styles.qsIconCircle, {backgroundColor: '#FFF0EB'}]}>
                    <Text style={styles.qsIconEmoji}>🏆</Text>
                  </View>
                  <Text style={styles.qsCardLabel}>Best score</Text>
                </View>
                <Text style={styles.qsCardValue}>{stats?.avgFocusScore ? Math.round(stats.avgFocusScore) : 83}%</Text>
                <Text style={styles.qsCardTrend}>📈 Personal best</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* ─── GO LIVE Floating Action Button ─── */}
        <Animated.View style={[styles.fab, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity
            onPress={() => setShowModeSelector(true)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#E8573E', '#D04530']}
              style={styles.fabGradient}
            >
              <Text style={styles.fabIcon}>🎤</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Bottom Navigation Bar */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIconActive}>🏠</Text>
            <Text style={styles.navLabelActive}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => {
              if (sessions.length > 0) {
                handleSessionPress(sessions[0].id);
              }
            }}
          >
            <Text style={styles.navIcon}>📊</Text>
            <Text style={styles.navLabel}>Insights</Text>
          </TouchableOpacity>

          <View style={styles.navSpacer} />

          <TouchableOpacity style={styles.navItem}>
            <Text style={styles.navIcon}>📁</Text>
            <Text style={styles.navLabel}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.navIcon}>👤</Text>
            <Text style={styles.navLabel}>Profile</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Mode Selector Modal */}
      <Modal
        visible={showModeSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModeSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Live Mode Category</Text>
            <Text style={styles.modalSubtitle}>Live mode is recommended for permitted business and negotiation environments. Avoid usage where recording is restricted.</Text>

            <ScrollView style={styles.modesScroll}>
              {allModes.map((modeConfig: ModeConfig) => (
                <TouchableOpacity
                  key={modeConfig.mode}
                  style={styles.modeCard}
                  onPress={() => handleStartSession(modeConfig.mode)}
                  activeOpacity={0.7}
                >
                  <View style={styles.modeIconCircle}>
                    <Text style={styles.modeIcon}>{modeConfig.icon}</Text>
                  </View>
                  <View style={styles.modeInfo}>
                    <Text style={styles.modeTitle}>{modeConfig.displayName}</Text>
                    <Text style={styles.modeDescription}>{modeConfig.description}</Text>
                  </View>
                  <Text style={styles.modeArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowModeSelector(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.primaryLight,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 100,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
    overflow: 'hidden',
  },
  headerTextContainer: {
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '400',
    marginBottom: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#2D2D3A',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232, 87, 62, 0.08)',
  },
  notificationIcon: {
    fontSize: 20,
  },

  // ─── Mastery Score Card ───
  masteryCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 28,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#E8573E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  masteryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  masteryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  masteryFocusColumn: {
    alignItems: 'center',
    flex: 1,
  },
  focusTitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    marginBottom: 2,
  },
  focusSkill: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  focusLevel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  gaugeScore: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  gaugeTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  masteryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 20,
  },
  masteryBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ─── Streaks & Goals ───
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  statTitle: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#333333',
    marginBottom: 4,
  },
  statSubTextRed: {
    fontSize: 12,
    color: '#E8573E',
    fontWeight: '600',
  },
  goalProgressBg: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: '#E8573E',
    borderRadius: 4,
  },

  // ─── Action Cards ───
  actionColumn: {
    flexDirection: 'column',
    gap: 16,
    marginBottom: 36,
  },
  actionItemLarge: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  actionCircleLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  actionIconLarge: {
    fontSize: 28,
  },
  liveBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: '#D04530',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  liveBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  actionTextContent: {
    flex: 1,
    marginLeft: 20,
  },
  actionLabelLarge: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D2D3A',
    marginBottom: 4,
  },
  actionSubLabelLarge: {
    fontSize: 14,
    color: '#8B949E',
  },

  // ─── Progress Bar ───
  progressBarBg: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Section
  sessionsSection: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.textPrimary,
  },
  seeAllText: {
    fontSize: 14,
    color: AppColors.accentPrimary,
    fontWeight: '600',
  },

  // ─── Recent Session Cards ───
  recentSessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  rsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  rsCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D2D3A',
    marginBottom: 4,
  },
  rsCardSubtitle: {
    fontSize: 12,
    color: '#8B949E',
    fontWeight: '500',
  },
  rsScoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rsScoreLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    marginRight: 12,
  },
  rsScoreBarContainer: {
    flex: 1,
  },
  rsScoreBarBg: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  rsScoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  rsScoreBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rsScoreBarLabel: {
    fontSize: 10,
    color: '#BBBBBB',
    fontWeight: '500',
  },
  rsScoreValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#E8573E',
    marginBottom: 12,
  },
  rsTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rsTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  rsTagText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Quick Stats (Redesigned)
  quickStatsSection: {
    marginBottom: 20,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
  },
  quickStatCard: {
    width: (SCREEN_WIDTH - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  qsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  qsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  qsIconEmoji: {
    fontSize: 18,
  },
  qsCardLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  qsCardValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2D2D3A',
    marginBottom: 6,
  },
  qsCardTrend: {
    fontSize: 12,
    color: '#4CAF7D',
    fontWeight: '600',
  },
  qsCardSubtext: {
    fontSize: 11,
    color: '#8B949E',
    fontWeight: '500',
  },
  qsPatternTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  qsPatternPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  qsPatternText: {
    fontSize: 11,
    fontWeight: '600',
  },
  qsTrackedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qsTrackedIcon: {
    fontSize: 14,
    marginRight: 4,
    color: '#E8573E',
  },
  qsTrackedText: {
    fontSize: 13,
    color: '#E8573E',
    fontWeight: '600',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 35, // Low enough to overlap nav
    alignSelf: 'center',
    zIndex: 10,
    elevation: 12,
    shadowColor: '#E8573E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    fontSize: 28,
  },

  // Bottom Nav
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 6,
  },
  navSpacer: {
    width: 60, // spacer for the FAB
  },
  navIcon: {
    fontSize: 22,
    marginBottom: 4,
    opacity: 0.4,
  },
  navIconActive: {
    fontSize: 22,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 10,
    color: AppColors.textMuted,
    fontWeight: '500',
  },
  navLabelActive: {
    fontSize: 10,
    color: AppColors.accentPrimary,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  closeButton: {
    fontSize: 20,
    color: '#999',
    fontWeight: 'bold',
    padding: 4,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: AppColors.textSecondary,
    marginBottom: 24,
  },
  modesScroll: {
    maxHeight: 400,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5EE',
    padding: 16,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(232, 87, 62, 0.08)',
  },
  modeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFF0EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  modeIcon: {
    fontSize: 22,
  },
  modeInfo: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textPrimary,
    marginBottom: 3,
  },
  modeDescription: {
    fontSize: 13,
    color: AppColors.textSecondary,
    lineHeight: 17,
  },
  modeArrow: {
    fontSize: 22,
    color: AppColors.textMuted,
    marginLeft: 8,
  },
  cancelButton: {
    marginTop: 14,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.textSecondary,
  },
});
