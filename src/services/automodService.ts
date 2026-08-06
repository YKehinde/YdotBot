import { configService } from './configService.js';

export type ViolationType = 'spam' | 'caps' | 'links' | 'banned_word';

export interface Violation {
  type: ViolationType;
  severity: 'low' | 'medium' | 'high';
  reason: string;
}

const spamCache = new Map<string, number[]>();

function getSpamTimestamps(userId: string): number[] {
  return spamCache.get(userId) || [];
}

function recordSpamTimestamp(userId: string) {
  const now = Date.now();
  const timestamps = getSpamTimestamps(userId);
  timestamps.push(now);
  spamCache.set(userId, timestamps);

  setTimeout(() => {
    const updated = getSpamTimestamps(userId).filter((t) => now - t < 5000);
    if (updated.length === 0) {
      spamCache.delete(userId);
    } else {
      spamCache.set(userId, updated);
    }
  }, 5000);
}

function detectSpam(userId: string, threshold: number): boolean {
  recordSpamTimestamp(userId);
  const timestamps = getSpamTimestamps(userId);
  return timestamps.length >= threshold;
}

function detectExcessiveCaps(text: string, threshold: number): boolean {
  const letters = text.match(/[a-z]/gi) || [];
  if (letters.length < 5) return false;

  const caps = text.match(/[A-Z]/g) || [];
  const capsPercentage = (caps.length / letters.length) * 100;
  return capsPercentage >= threshold;
}

function detectInviteLinks(text: string): boolean {
  const invitePatterns = [
    /discord\.gg\/\w+/i,
    /discord\.com\/invite\/\w+/i,
    /twitch\.tv\/\w+/i,
    /youtu\.be\/\w+/i,
  ];

  return invitePatterns.some((pattern) => pattern.test(text));
}

function detectBannedWords(text: string, bannedWords: string[]): string | null {
  const lowerText = text.toLowerCase();

  for (const word of bannedWords) {
    if (lowerText.includes(word.toLowerCase())) {
      return word;
    }
  }

  return null;
}

export const automodService = {
  checkMessage(
    userId: string,
    guildId: string,
    text: string
  ): Violation[] {
    const violations: Violation[] = [];
    const config = configService.getConfig(guildId);

    if (!config.automodEnabled) {
      return violations;
    }

    const spamThreshold = config.spamThreshold || 5;
    const capsThreshold = config.capsThreshold || 70;
    const bannedWords = configService.getBannedWords(guildId);

    if (config.automodSpamEnabled && detectSpam(userId, spamThreshold)) {
      violations.push({
        type: 'spam',
        severity: 'high',
        reason: `Sending messages too fast (${spamThreshold}+ in 5s)`,
      });
    }

    if (config.automodCapsEnabled && detectExcessiveCaps(text, capsThreshold)) {
      violations.push({
        type: 'caps',
        severity: 'low',
        reason: `Excessive caps (>${capsThreshold}%)`,
      });
    }

    if (config.automodLinksEnabled && detectInviteLinks(text)) {
      violations.push({
        type: 'links',
        severity: 'medium',
        reason: 'Contains invite or external links',
      });
    }

    if (config.automodWordsEnabled && bannedWords.length > 0) {
      const foundWord = detectBannedWords(text, bannedWords);
      if (foundWord) {
        violations.push({
          type: 'banned_word',
          severity: 'high',
          reason: `Contains banned word: ${foundWord}`,
        });
      }
    }

    return violations;
  },
};
