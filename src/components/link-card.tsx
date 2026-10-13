import React, { useState } from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinkFlowTheme } from '@/constants/theme';
import { LinkItem } from '@/services/links.service';
import { Card } from './ui/card';

interface LinkCardProps {
  link: LinkItem;
  onViewDetails?: (link: LinkItem) => void;
}

export function LinkCard({ link, onViewDetails }: LinkCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(link.shortUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenOriginal = async () => {
    try {
      await Linking.openURL(link.originalUrl);
    } catch {
      // Ignore if URL cannot be opened
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card elevated style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.codeBadge}>
          <Text style={styles.codeText}>{link.shortCode}</Text>
        </View>

        <View style={styles.actionButtons}>
          <Pressable
            onPress={handleCopy}
            style={({ pressed }) => [
              styles.iconBtn,
              copied && styles.iconBtnCopied,
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.iconBtnText, copied && styles.copiedText]}>
              {copied ? '✓ Copied' : 'Copy'}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleOpenOriginal}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
            <Text style={styles.iconBtnText}>Open</Text>
          </Pressable>

          {onViewDetails ? (
            <Pressable
              onPress={() => onViewDetails(link)}
              style={({ pressed }) => [
                styles.iconBtn,
                styles.detailsBtn,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.detailsBtnText}>Details</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Text style={styles.shortUrlText} selectable>
        {link.shortUrl}
      </Text>

      <Text
        style={styles.originalUrlText}
        numberOfLines={1}
        ellipsizeMode="middle">
        {link.originalUrl}
      </Text>

      <View style={styles.divider} />

      <View style={styles.footerRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Created</Text>
          <Text style={styles.statVal}>{formatDate(link.createdAt)}</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Expires</Text>
          <Text style={styles.statVal}>{formatDate(link.expiresAt)}</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Clicks</Text>
          <Text style={styles.statVal}>{link.clickCount}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    padding: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  codeBadge: {
    backgroundColor: LinkFlowTheme.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codeText: {
    color: LinkFlowTheme.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    backgroundColor: LinkFlowTheme.cardElevated,
    borderColor: LinkFlowTheme.border,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  iconBtnCopied: {
    borderColor: LinkFlowTheme.accent,
    backgroundColor: 'rgba(201, 169, 244, 0.1)',
  },
  iconBtnText: {
    color: LinkFlowTheme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  copiedText: {
    color: LinkFlowTheme.accent,
  },
  detailsBtn: {
    borderColor: LinkFlowTheme.secondary,
  },
  detailsBtnText: {
    color: LinkFlowTheme.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
  shortUrlText: {
    color: LinkFlowTheme.accent,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  originalUrlText: {
    color: LinkFlowTheme.textMuted,
    fontSize: 13,
    marginBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: LinkFlowTheme.border,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'flex-start',
  },
  statLabel: {
    color: LinkFlowTheme.textMuted,
    fontSize: 11,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  statVal: {
    color: LinkFlowTheme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
});
