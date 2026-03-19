import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppColors } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { useSessionAnalyzer } from '../hooks/useSessionAnalyzer';
import { SessionSummaryCard } from '../components/SessionSummaryCard';
import { getAllModes } from '../ai/patternLibrary';
import { NegotiationMode, ModeConfig } from '../types/session';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type HomeScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Home'>;
};

// ─── Mini Mastery Gauge Component ───
const MasteryGauge: React.FC<{ score: number; size?: number }> = ({ score, size = 120 }) => {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // half circle
  const clampedScore = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference * (1 - clampedScore / 100);

  return (
    <View style={{ width: size, height: size / 2 + 20, alignItems: 'center', justifyContent: 'flex-end' }}>
      <Svg width={size} height={size / 2 + strokeWidth} style={{ position: 'absolute', top: 0 }}>
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
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#F5A623"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          rotation={-180}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <Text style={styles.gaugeScore}>{clampedScore}</Text>
    </View>
  );
};

// ─── Progress Bar Component ───
const ProgressBar: React.FC<{ progress: number; colors: string[] }> = ({ progress, colors }) => (
  <View style={styles.progressBarBg}>
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.progressBarFill, { width: `${Math.min(Math.max(progress, 5), 100)}%` }]}
    />
  </View>
);

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { sessions, stats, isLoading, refreshSessions } = useSessionAnalyzer();
  const [showModeSelector, setShowModeSelector] = useState(false);
  const allModes = getAllModes();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshSessions();
    });
    return unsubscribe;
  }, [navigation, refreshSessions]);

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

  // Calculate mastery score from stats
  const masteryScore = stats && stats.totalSessions > 0
    ? Math.round(stats.avgFocusScore)
    : 0;

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
              <LinearGradient
                colors={['#E8573E', '#F4845F']}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>L</Text>
              </LinearGradient>
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

          {/* ─── Mastery Score Hero Card ─── */}
          <LinearGradient
            colors={['#E8573E', '#F4845F', '#F9A88C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.masteryCard}
          >
            <Text style={styles.masteryLabel}>Negotiation Mastery Score</Text>

            <View style={styles.masteryContent}>
              <View style={styles.masteryFocusColumn}>
                <Text style={styles.focusTitle}>Key Focus:</Text>
                <Text style={styles.focusSkill}>Empathy</Text>
                <Text style={styles.focusLevel}>({getFocusLabel(masteryScore)})</Text>
              </View>

              <MasteryGauge score={masteryScore} size={130} />

              <View style={styles.masteryFocusColumn}>
                <Text style={styles.focusTitle}>Persuasion</Text>
                <Text style={styles.focusLevel}>({getFocusLabel(Math.max(0, masteryScore - 10))})</Text>
              </View>
            </View>

            {stats && stats.totalSessions > 0 ? (
              <View style={styles.masteryBadge}>
                <Text style={styles.masteryBadgeText}>
                  📈 {stats.totalSessions} session{stats.totalSessions !== 1 ? 's' : ''} completed
                </Text>
              </View>
            ) : (
              <View style={styles.masteryBadge}>
                <Text style={styles.masteryBadgeText}>✨ Ready to start</Text>
              </View>
            )}
          </LinearGradient>

          {/* ─── Action Cards with Progress ─── */}
          <View style={styles.actionColumn}>
            {/* Live Tactical Mode */}
            <TouchableOpacity
              style={styles.actionItemLarge}
              onPress={() => setShowModeSelector(true)}
              activeOpacity={0.8}
            >
              <View style={styles.actionRow}>
                <LinearGradient
                  colors={['#E8573E', '#F4845F']}
                  style={styles.actionCircleLarge}
                >
                  <Text style={styles.actionIconLarge}>🎤</Text>
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                </LinearGradient>
                <View style={styles.actionTextContent}>
                  <Text style={styles.actionLabelLarge}>Live Tactical Mode</Text>
                  <Text style={styles.actionSubLabelLarge}>Real-time negotiation intelligence</Text>
                </View>
              </View>
              <ProgressBar progress={liveProgress} colors={['#E8573E', '#F4845F']} />
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
              <View style={styles.actionRow}>
                <LinearGradient
                  colors={['#4CAF7D', '#6FCF97']}
                  style={styles.actionCircleLarge}
                >
                  <Text style={styles.actionIconLarge}>🧠</Text>
                </LinearGradient>
                <View style={styles.actionTextContent}>
                  <Text style={styles.actionLabelLarge}>Strategic Outcome Replay™</Text>
                  <Text style={styles.actionSubLabelLarge}>Counterfactual behavior modeling</Text>
                </View>
              </View>
              <ProgressBar progress={replayProgress} colors={['#4CAF7D', '#6FCF97']} />
            </TouchableOpacity>

            {/* Practice Simulation */}
            <TouchableOpacity
              style={styles.actionItemLarge}
              onPress={() => Alert.alert('Coming Soon', 'Practice Simulation Engine is under construction.')}
              activeOpacity={0.8}
            >
              <View style={styles.actionRow}>
                <LinearGradient
                  colors={['#F5A623', '#F7C26B']}
                  style={styles.actionCircleLarge}
                >
                  <Text style={styles.actionIconLarge}>⚔️</Text>
                </LinearGradient>
                <View style={styles.actionTextContent}>
                  <Text style={styles.actionLabelLarge}>Practice Simulation</Text>
                  <Text style={styles.actionSubLabelLarge}>Mock scenarios against AI</Text>
                </View>
              </View>
              <ProgressBar progress={practiceProgress} colors={['#F5A623', '#F7C26B']} />
            </TouchableOpacity>
          </View>

          {/* ─── Recent Sessions Carousel ─── */}
          <View style={styles.sessionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Sessions</Text>
              {sessions.length > 0 && (
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              )}
            </View>

            {sessions.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <Text style={styles.emptyIcon}>📊</Text>
                </View>
                <Text style={styles.emptyText}>No sessions yet</Text>
                <Text style={styles.emptySubtext}>
                  Start your first session to see insights here
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => setShowModeSelector(true)}
                >
                  <LinearGradient
                    colors={['#E8573E', '#F4845F']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.emptyButtonGradient}
                  >
                    <Text style={styles.emptyButtonText}>Start Session</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sessionCarousel}
              >
                {sessions.map((session, index) => (
                  <TouchableOpacity
                    key={session.id}
                    style={styles.sessionCarouselCard}
                    onPress={() => handleSessionPress(session.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sessionCardHeader}>
                      <Text style={styles.sessionCardTitle}>
                        Session {index + 1}: {session.mode.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                      <Text style={styles.sessionCardBadge}>
                        {session.cognitiveMetrics.focusScore >= 70 ? '✅' : '⭐'}
                      </Text>
                    </View>
                    <Text style={styles.sessionCardScenario} numberOfLines={1}>
                      {formatDuration(session.duration)} session
                    </Text>
                    <Text style={styles.sessionCardScore}>
                      Score: {Math.round(session.cognitiveMetrics.focusScore)}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Quick Stats */}
          {stats && stats.totalSessions > 0 && (
            <View style={styles.quickStatsSection}>
              <Text style={styles.sectionTitle}>Quick Stats</Text>
              <View style={styles.quickStatsGrid}>
                <View style={styles.quickStatCard}>
                  <View style={[styles.quickStatIcon, { backgroundColor: '#FFF0EB' }]}>
                    <Text style={styles.quickStatEmoji}>🎯</Text>
                  </View>
                  <Text style={styles.quickStatValue}>
                    {Math.round(stats.avgFocusScore)}%
                  </Text>
                  <Text style={styles.quickStatLabel}>Avg Focus</Text>
                </View>
                <View style={styles.quickStatCard}>
                  <View style={[styles.quickStatIcon, { backgroundColor: '#E8F5EC' }]}>
                    <Text style={styles.quickStatEmoji}>📈</Text>
                  </View>
                  <Text style={styles.quickStatValue}>
                    {stats.totalPatterns}
                  </Text>
                  <Text style={styles.quickStatLabel}>Patterns</Text>
                </View>
                <View style={styles.quickStatCard}>
                  <View style={[styles.quickStatIcon, { backgroundColor: '#FFF5E6' }]}>
                    <Text style={styles.quickStatEmoji}>⏱️</Text>
                  </View>
                  <Text style={styles.quickStatValue}>
                    {formatDuration(stats.avgDuration)}
                  </Text>
                  <Text style={styles.quickStatLabel}>Avg Duration</Text>
                </View>
                <View style={styles.quickStatCard}>
                  <View style={[styles.quickStatIcon, { backgroundColor: '#FCE7F3' }]}>
                    <Text style={styles.quickStatEmoji}>🔒</Text>
                  </View>
                  <Text style={styles.quickStatValue}>100%</Text>
                  <Text style={styles.quickStatLabel}>Private</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ─── GO LIVE Floating Action Button ─── */}
        <TouchableOpacity
          style={styles.fab}
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

          {/* GO LIVE center button */}
          <TouchableOpacity
            style={styles.navItemCenter}
            onPress={() => setShowModeSelector(true)}
          >
            <Text style={styles.goLiveLabel}>GO LIVE</Text>
          </TouchableOpacity>

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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
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
  masteryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  masteryBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
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

  // ─── Session Carousel ───
  sessionCarousel: {
    paddingRight: 24,
    gap: 12,
  },
  sessionCarouselCard: {
    width: SCREEN_WIDTH * 0.45,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  sessionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sessionCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: AppColors.textPrimary,
    flex: 1,
    lineHeight: 18,
  },
  sessionCardBadge: {
    fontSize: 16,
    marginLeft: 6,
  },
  sessionCardScenario: {
    fontSize: 12,
    color: AppColors.textSecondary,
    marginBottom: 8,
  },
  sessionCardScore: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E8573E',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 36,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF0EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 14,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Quick Stats
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
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  quickStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickStatEmoji: {
    fontSize: 22,
  },
  quickStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: AppColors.textPrimary,
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    color: AppColors.textSecondary,
    fontWeight: '500',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 72,
    alignSelf: 'center',
    zIndex: 10,
    elevation: 12,
    shadowColor: '#E8573E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    fontSize: 26,
  },

  // Bottom Nav
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    paddingBottom: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: 'center',
    justifyContent: 'space-around',
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
  navItemCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    paddingVertical: 6,
  },
  goLiveLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#E8573E',
    letterSpacing: 0.5,
    marginTop: 26,
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
