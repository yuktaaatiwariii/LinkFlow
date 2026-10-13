import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinkFlowTheme } from '@/constants/theme';
import { linksService, LinkItem } from '@/services/links.service';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';

interface CreateLinkModalProps {
  visible: boolean;
  onClose: () => void;
  onLinkCreated: (newLink: LinkItem) => void;
}

export function CreateLinkModal({
  visible,
  onClose,
  onLinkCreated,
}: CreateLinkModalProps) {
  const [originalUrl, setOriginalUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<LinkItem | null>(null);
  const [copied, setCopied] = useState(false);

  const resetState = () => {
    setOriginalUrl('');
    setExpiresAt('');
    setErrorMessage(null);
    setCreatedLink(null);
    setCopied(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleCopy = async () => {
    if (createdLink) {
      await Clipboard.setStringAsync(createdLink.shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const validateUrl = (url: string): string | null => {
    const trimmed = url.trim();
    if (!trimmed) {
      return 'Target URL is required';
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return 'URL must start with http:// or https:// (e.g., https://example.com)';
    }
    if (trimmed.startsWith('javascript:') || trimmed.startsWith('ftp:')) {
      return 'Unsupported protocol. Only http and https are allowed.';
    }
    return null;
  };

  const validateDate = (dateStr: string): string | null => {
    if (!dateStr.trim()) return null;
    const parsed = new Date(dateStr.trim());
    if (isNaN(parsed.getTime())) {
      return 'Invalid date format. Use ISO-8601 (e.g., 2028-01-01T00:00:00.000Z)';
    }
    if (parsed.getTime() <= Date.now()) {
      return 'Expiration date must be strictly in the future.';
    }
    return null;
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    const urlError = validateUrl(originalUrl);
    if (urlError) {
      setErrorMessage(urlError);
      return;
    }

    const dateError = validateDate(expiresAt);
    if (dateError) {
      setErrorMessage(dateError);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        originalUrl: originalUrl.trim(),
        expiresAt: expiresAt.trim() ? new Date(expiresAt.trim()).toISOString() : undefined,
      };

      const link = await linksService.createLink(payload);
      setCreatedLink(link);
      onLinkCreated(link);
    } catch (err: any) {
      if (err.messages && Array.isArray(err.messages)) {
        setErrorMessage(err.messages.join('. '));
      } else {
        setErrorMessage(err.message || 'Failed to create link');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Card elevated style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.modalTitle}>
                {createdLink ? 'Link Ready!' : 'Shorten a Long URL'}
              </Text>
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            {createdLink ? (
              <View style={styles.successContainer}>
                <Text style={styles.successSub}>
                  Your shortened link is live and ready to share:
                </Text>

                <View style={styles.resultBox}>
                  <Text style={styles.resultLabel}>Short Link</Text>
                  <Text style={styles.resultValue} selectable>
                    {createdLink.shortUrl}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Code: </Text>
                  <Text style={styles.metaVal}>{createdLink.shortCode}</Text>
                </View>

                <View style={styles.buttonStack}>
                  <Button
                    title={copied ? '✓ Copied to Clipboard!' : 'Copy Short URL'}
                    onPress={handleCopy}
                    variant="secondary"
                    size="md"
                  />
                  <Button
                    title="Shorten Another Link"
                    onPress={resetState}
                    variant="outline"
                    size="md"
                  />
                </View>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.subtitle}>
                  Generate a compact, reliable Base62 short URL in seconds.
                </Text>

                {errorMessage ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorBannerText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <Input
                  label="Destination URL *"
                  placeholder="https://example.com/very/long/destination"
                  value={originalUrl}
                  onChangeText={setOriginalUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />

                <Input
                  label="Optional Expiration (ISO-8601 UTC)"
                  placeholder="2028-01-01T00:00:00.000Z"
                  value={expiresAt}
                  onChangeText={setExpiresAt}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.helpText}>
                  Leaving expiration blank makes your shortened link permanent.
                </Text>

                <View style={styles.modalActions}>
                  <Button
                    title="Cancel"
                    onPress={handleClose}
                    variant="ghost"
                    size="md"
                  />
                  <Button
                    title="Create Short Link"
                    onPress={handleSubmit}
                    loading={loading}
                    variant="primary"
                    size="md"
                  />
                </View>
              </ScrollView>
            )}
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
    maxWidth: 520,
  },
  card: {
    backgroundColor: LinkFlowTheme.card,
    borderColor: LinkFlowTheme.border,
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: LinkFlowTheme.text,
  },
  closeButton: {
    padding: 6,
  },
  closeText: {
    color: LinkFlowTheme.textSecondary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    color: LinkFlowTheme.textSecondary,
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: LinkFlowTheme.error,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#FCA5A5',
    fontSize: 13,
  },
  helpText: {
    color: LinkFlowTheme.textMuted,
    fontSize: 12,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  successContainer: {
    paddingVertical: 12,
  },
  successSub: {
    color: LinkFlowTheme.textSecondary,
    fontSize: 14,
    marginBottom: 16,
  },
  resultBox: {
    backgroundColor: LinkFlowTheme.background,
    borderWidth: 1,
    borderColor: LinkFlowTheme.accent,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  resultLabel: {
    color: LinkFlowTheme.accent,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultValue: {
    color: LinkFlowTheme.text,
    fontSize: 16,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  metaLabel: {
    color: LinkFlowTheme.textMuted,
    fontSize: 13,
  },
  metaVal: {
    color: LinkFlowTheme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  buttonStack: {
    gap: 10,
  },
});
