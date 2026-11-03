import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { isIOS } from '@/lib/native';

interface VoicePlugin {
  requestAccess(): Promise<{ granted: boolean; reason?: string }>;
  start(options: { hints: string[] }): Promise<{ onDevice: boolean }>;
  stop(): Promise<void>;
  interpret(options: { text: string; context: string }): Promise<{
    available: boolean;
    text?: string;
  }>;
  addListener(
    event: 'partial' | 'utterance',
    fn: (data: { text: string }) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    event: 'error',
    fn: (data: { message: string }) => void
  ): Promise<PluginListenerHandle>;
}

// Implemented in ios/App/App/ChairBuddyViewController.swift.
export const Voice = registerPlugin<VoicePlugin>('Voice');

export const voiceSupported = isIOS;

/**
 * Instructions for Apple Intelligence: rewrite a messy phrase into the plain
 * command phrasing the rule parser understands. Used only when the rules
 * can't make sense of what was heard.
 */
export function interpretInstructions(teamA: string, teamB: string): string {
  return [
    'You convert a basketball scoretable official\'s spoken words into short commands.',
    `The two teams are "${teamA}" and "${teamB}".`,
    'Reply with one command per line and nothing else. Use only these forms:',
    '- foul <team> number <n> at <mm:ss>',
    '- technical foul <team> number <n> at <mm:ss>   (also unsportsmanlike / disqualifying)',
    '- coach technical <team>',
    '- double foul <team> number <n> <team> number <n>',
    '- timeout <team>',
    '- warning <team>   (or: time delay warning <team>, flop warning <team>)',
    '- arrow <team>',
    '- score <team> <points> <team> <points>',
    '- protest <team> <reason>',
    'Leave out "at <mm:ss>" when no time was said. If nothing matches, reply NONE.'
  ].join('\n');
}
