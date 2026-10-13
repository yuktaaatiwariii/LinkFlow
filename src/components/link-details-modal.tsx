import React, { useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinkFlowTheme } from '@/constants/theme';
import { LinkItem } from '@/services/links.service';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface LinkDetailsModalProps {
  visible: boolean;
  link: LinkItem | null;
  onClose: () => void;
}

export function LinkDetailsModal({
  visible,
  link,
  onClose,
}: LinkDetailsModalProps) {
  const [copied, setCopied] = useState(false);

  if (!link) return null;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(link.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenOriginal = async () => {
    try {
      await Linking.openURL(link.originalUrl);
    } catch {
      // Ignore
    }
  };

  const isExpired = link.expiresAt ? new Date(link.expiresAt).getTime() < Date.now() : false;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Card elevated style={styles.card}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.title}>Link Details</Text>
                <Text style={styles.subtitle}>ID: {link.id}</Text>
              </View>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Short URL</Text>
                <View style={styles.urlBox}>
                  <Text style={styles.shortUrlText} selectable>
                    {link.shortUrl}
                  </Text>
                  <Button
                    title={copied ? '✓' : 'Copy'}
                    onPress={handleCopy}
                    variant="secondary"
                    size="sm"
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Original Destination</Text>
                <View style={styles.urlBox}>
                  <Text style={styles.originalUrlText} selectable>
                    {link.originalUrl}
                  </Text>
                  <Button
                    title="Open"
                    onPress={handleOpenOriginal}
                    variant="outline"
                    size="sm"
                  />
                </View>
              </View>

              <View style={styles.grid}>
                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Short Code</Text>
                  <Text style={styles.gridVal}>{link.shortCode}</Text>
                </View>

                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Total Clicks</Text>
                  <Text style={styles.gridVal}>{link.clickCount}</Text>
                </View>

                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Created At</Text>
                  <Text style={styles.gridVal}>
                    {new Date(link.createdAt).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.gridItem}>
                  <Text style={styles.gridLabel}>Expiration</Text>
                  <Text
                    style={[
                      styles.gridVal,
                      isExpired ? styles.expiredText : null,
                    ]}>
                    {link.expiresAt
                      ? `${new Date(link.expiresAt).toLocaleString()}${
                          isExpired ? ' (Expired)' : ''
                        }`
                      : 'Never (Permanent)'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoBanner}>
                <Text style={styles.infoTitle}>⚡ Phase 3 Notice</Text>
                <Text style={styles.infoDesc}>
                  Live traffic redirection and per-click geolocation analytics pipelines will be connected in Phase 3.
                </Text>
              </View>

              <View style={styles.actionRow}>
                <Button title="Close" onPress={onClose} variant="primary" size="md" />
              </View>
            </ScrollView>
          </Card>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 5, 14, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 560,
  },
  card: {
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: LinkFlowTheme.text,
  },
  subtitle: {
    fontSize: 12,
    color: LinkFlowTheme.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    color: LinkFlowTheme.textSecondary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    color: LinkFlowTheme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  urlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: LinkFlowTheme.background,
    borderWidth: 1,
    borderColor: LinkFlowTheme.border,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  shortUrlText: {
    color: LinkFlowTheme.accent,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  originalUrlText: {
    color: LinkFlowTheme.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 12,
  },
  gridItem: {
    width: '48%',
    backgroundColor: LinkFlowTheme.background,
    borderWidth: 1,
    borderColor: LinkFlowTheme.border,
    borderRadius: 10,
    padding: 12,
  },
  gridLabel: {
    color: LinkFlowTheme.textMuted,
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  gridVal: {
    color: LinkFlowTheme.text,
    fontSize: 13,
    fontWeight: '600',
  },
  expiredText: {
    color: LinkFlowTheme.error,
  },
  infoBanner: {
    backgroundColor: 'rgba(81, 43, 129, 0.25)',
    borderWidth: 1,
    borderColor: LinkFlowTheme.secondary,
    borderRadius: 10,
    padding: 12,
    marginVertical: 14,
  },
  infoTitle: {
    color: LinkFlowTheme.accent,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  infoDesc: {
    color: LinkFlowTheme.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  actionRow: {
    marginTop: 8,
  },
});
