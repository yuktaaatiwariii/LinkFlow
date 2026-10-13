import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinkFlowTheme } from '@/constants/theme';
import { useAuth } from '@/context/auth.context';
import { linksService, LinkItem, PaginatedLinks } from '@/services/links.service';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CreateLinkModal } from '@/components/create-link-modal';
import { LinkCard } from '@/components/link-card';
import { LinkDetailsModal } from '@/components/link-details-modal';

export default function HomeScreen() {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'links' | 'analytics' | 'settings'>('overview');
  const [linksData, setLinksData] = useState<PaginatedLinks | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedLink, setSelectedLink] = useState<LinkItem | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  // Pagination state for "links" tab
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLinks = async (page: number = 1) => {
    setError(null);
    try {
      const data = await linksService.getMyLinks(page, 10);
      setLinksData(data);
      setCurrentPage(page);
    } catch (err: any) {
      setError(err.message || 'Failed to load links');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchLinks(1);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    void fetchLinks(currentPage);
  };

  const handleLinkCreated = (newLink: LinkItem) => {
    void fetchLinks(1);
  };

  const handleViewDetails = (link: LinkItem) => {
    setSelectedLink(link);
    setDetailsModalVisible(true);
  };

  const totalLinks = linksData?.meta.total ?? 0;
  const recentLinks = linksData?.data ?? [];

  return (
    <View style={styles.mainContainer}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandIconText}>⚡</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>LinkFlow</Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user?.email}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <Button
            title="+ Shorten URL"
            onPress={() => setCreateModalVisible(true)}
            variant="secondary"
            size="sm"
          />
          <Button
            title="Sign Out"
            onPress={() => void logout()}
            variant="ghost"
            size="sm"
          />
        </View>
      </View>

      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navScroll}>
          <Pressable
            onPress={() => setActiveTab('overview')}
            style={[styles.navItem, activeTab === 'overview' && styles.navItemActive]}>
            <Text style={[styles.navText, activeTab === 'overview' && styles.navTextActive]}>
              Overview
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('links')}
            style={[styles.navItem, activeTab === 'links' && styles.navItemActive]}>
            <Text style={[styles.navText, activeTab === 'links' && styles.navTextActive]}>
              My Links ({totalLinks})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('analytics')}
            style={[styles.navItem, activeTab === 'analytics' && styles.navItemActive]}>
            <Text style={[styles.navText, activeTab === 'analytics' && styles.navTextActive]}>
              Analytics
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('settings')}
            style={[styles.navItem, activeTab === 'settings' && styles.navItemActive]}>
            <Text style={[styles.navText, activeTab === 'settings' && styles.navTextActive]}>
              Settings
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      {/* Main Content Area */}
      <ScrollView
        contentContainerStyle={styles.contentBody}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={LinkFlowTheme.accent}
          />
        }>
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={LinkFlowTheme.accent} />
            <Text style={styles.loadingText}>Fetching your links...</Text>
          </View>
        ) : error ? (
          <Card elevated style={styles.errorCard}>
            <Text style={styles.errorTitle}>Could not load links</Text>
            <Text style={styles.errorDesc}>{error}</Text>
            <Button
              title="Try Again"
              onPress={() => void fetchLinks(currentPage)}
              variant="outline"
              size="sm"
            />
          </Card>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' ? (
              <View>
                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                  <Card elevated style={styles.statCard}>
                    <Text style={styles.statLabel}>Total Links</Text>
                    <Text style={styles.statNumber}>{totalLinks}</Text>
                    <Text style={styles.statSub}>Shortened & active</Text>
                  </Card>

                  <Card elevated style={styles.statCard}>
                    <Text style={styles.statLabel}>Total Clicks</Text>
                    <Text style={styles.statNumber}>
                      {recentLinks.reduce((acc, curr) => acc + curr.clickCount, 0)}
                    </Text>
                    <Text style={styles.statSub}>Phase 2 baseline</Text>
                  </Card>

                  <Card elevated style={styles.statCard}>
                    <Text style={styles.statLabel}>Expiring Soon</Text>
                    <Text style={styles.statNumber}>
                      {recentLinks.filter((l) => l.expiresAt !== null).length}
                    </Text>
                    <Text style={styles.statSub}>With expiry limits</Text>
                  </Card>
                </View>

                {/* Recent Links Section */}
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Recent Links</Text>
                  {totalLinks > 0 ? (
                    <Pressable onPress={() => setActiveTab('links')}>
                      <Text style={styles.seeAllText}>View All ({totalLinks}) →</Text>
                    </Pressable>
                  ) : null}
                </View>

                {recentLinks.length === 0 ? (
                  <Card elevated style={styles.emptyCard}>
                    <Text style={styles.emptyIcon}>🔗</Text>
                    <Text style={styles.emptyTitle}>No shortened links yet</Text>
                    <Text style={styles.emptyDesc}>
                      Create your first short link in seconds. Validate URLs and set optional expiration dates.
                    </Text>
                    <Button
                      title="Create First Link"
                      onPress={() => setCreateModalVisible(true)}
                      variant="primary"
                      size="md"
                    />
                  </Card>
                ) : (
                  recentLinks.slice(0, 5).map((link) => (
                    <LinkCard
                      key={link.id}
                      link={link}
                      onViewDetails={handleViewDetails}
                    />
                  ))
                )}
              </View>
            ) : null}

            {/* MY LINKS TAB */}
            {activeTab === 'links' ? (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>My Links ({totalLinks})</Text>
                  <Button
                    title="+ New Link"
                    onPress={() => setCreateModalVisible(true)}
                    variant="secondary"
                    size="sm"
                  />
                </View>

                {recentLinks.length === 0 ? (
                  <Card elevated style={styles.emptyCard}>
                    <Text style={styles.emptyIcon}>🔗</Text>
                    <Text style={styles.emptyTitle}>Your link list is empty</Text>
                    <Text style={styles.emptyDesc}>
                      Hit the button below to shorten your first URL!
                    </Text>
                    <Button
                      title="Shorten URL"
                      onPress={() => setCreateModalVisible(true)}
                      variant="primary"
                      size="md"
                    />
                  </Card>
                ) : (
                  <>
                    {recentLinks.map((link) => (
                      <LinkCard
                        key={link.id}
                        link={link}
                        onViewDetails={handleViewDetails}
                      />
                    ))}

                    {/* Pagination Bar */}
                    {linksData && linksData.meta.totalPages > 1 ? (
                      <View style={styles.paginationRow}>
                        <Button
                          title="Previous"
                          onPress={() => void fetchLinks(currentPage - 1)}
                          disabled={currentPage <= 1}
                          variant="outline"
                          size="sm"
                        />
                        <Text style={styles.paginationText}>
                          Page {currentPage} of {linksData.meta.totalPages}
                        </Text>
                        <Button
                          title="Next"
                          onPress={() => void fetchLinks(currentPage + 1)}
                          disabled={currentPage >= linksData.meta.totalPages}
                          variant="outline"
                          size="sm"
                        />
                      </View>
                    ) : null}
                  </>
                )}
              </View>
            ) : null}

            {/* ANALYTICS TAB (Deferred) */}
            {activeTab === 'analytics' ? (
              <Card elevated style={styles.deferredCard}>
                <View style={styles.deferredBadge}>
                  <Text style={styles.deferredBadgeText}>COMING IN PHASE 3 & 4</Text>
                </View>
                <Text style={styles.deferredTitle}>Real-time Analytics Engine</Text>
                <Text style={styles.deferredDesc}>
                  Deep link metrics, geographical click heatmaps, referrer traffic breakdowns, and BullMQ background ingestion pipelines are scheduled for Phase 3 and Phase 4.
                </Text>
              </Card>
            ) : null}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' ? (
              <Card elevated style={styles.settingsCard}>
                <Text style={styles.settingsSectionTitle}>Account & Session</Text>
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Logged-in Account</Text>
                  <Text style={styles.settingVal}>{user?.email}</Text>
                </View>
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>User ID</Text>
                  <Text style={styles.settingVal}>{user?.id}</Text>
                </View>
                <View style={styles.settingItem}>
                  <Text style={styles.settingLabel}>Account Created</Text>
                  <Text style={styles.settingVal}>
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                  </Text>
                </View>
                <View style={styles.signOutBtnWrapper}>
                  <Button
                    title="Sign Out of LinkFlow"
                    onPress={() => void logout()}
                    variant="danger"
                    size="md"
                  />
                </View>
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Modals */}
      <CreateLinkModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
        onLinkCreated={handleLinkCreated}
      />

      <LinkDetailsModal
        visible={detailsModalVisible}
        link={selectedLink}
        onClose={() => setDetailsModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: LinkFlowTheme.background,
  },
  topHeader: {
    backgroundColor: LinkFlowTheme.card,
    borderBottomWidth: 1,
    borderBottomColor: LinkFlowTheme.border,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: LinkFlowTheme.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIconText: {
    fontSize: 20,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: LinkFlowTheme.text,
    letterSpacing: 0.3,
  },
  userEmail: {
    fontSize: 12,
    color: LinkFlowTheme.textMuted,
    maxWidth: 160,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBar: {
    backgroundColor: LinkFlowTheme.background,
    borderBottomWidth: 1,
    borderBottomColor: LinkFlowTheme.border,
    paddingVertical: 4,
  },
  navScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  navItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: LinkFlowTheme.cardElevated,
    borderBottomWidth: 2,
    borderBottomColor: LinkFlowTheme.accent,
  },
  navText: {
    color: LinkFlowTheme.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  navTextActive: {
    color: LinkFlowTheme.text,
    fontWeight: '700',
  },
  contentBody: {
    padding: 20,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
  },
  centerContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: LinkFlowTheme.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  errorCard: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: LinkFlowTheme.error,
  },
  errorTitle: {
    color: '#F87171',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  errorDesc: {
    color: LinkFlowTheme.textSecondary,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    padding: 18,
  },
  statLabel: {
    color: LinkFlowTheme.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  statNumber: {
    color: LinkFlowTheme.text,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  statSub: {
    color: LinkFlowTheme.accent,
    fontSize: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: LinkFlowTheme.text,
    fontSize: 18,
    fontWeight: '700',
  },
  seeAllText: {
    color: LinkFlowTheme.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    color: LinkFlowTheme.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyDesc: {
    color: LinkFlowTheme.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 360,
    marginBottom: 20,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
    marginBottom: 24,
  },
  paginationText: {
    color: LinkFlowTheme.textSecondary,
    fontSize: 13,
  },
  deferredCard: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deferredBadge: {
    backgroundColor: LinkFlowTheme.secondary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 14,
  },
  deferredBadgeText: {
    color: LinkFlowTheme.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  deferredTitle: {
    color: LinkFlowTheme.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },
  deferredDesc: {
    color: LinkFlowTheme.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 500,
  },
  settingsCard: {
    padding: 24,
  },
  settingsSectionTitle: {
    color: LinkFlowTheme.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  settingItem: {
    borderBottomWidth: 1,
    borderBottomColor: LinkFlowTheme.border,
    paddingVertical: 14,
  },
  settingLabel: {
    color: LinkFlowTheme.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  settingVal: {
    color: LinkFlowTheme.text,
    fontSize: 15,
    fontWeight: '600',
  },
  signOutBtnWrapper: {
    marginTop: 24,
  },
});
