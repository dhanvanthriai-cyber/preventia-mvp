/**
 * ConsultationScreen.test.tsx
 * Project Preventia — Smoke tests for the Virtual Consultation Room
 *
 * Jest + React Native Testing Library
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ConsultationScreen } from './ConsultationScreen';

// ─── Mocks ────────────────────────────────────────────────────────────────────

/**
 * Mock @daily-co/daily-js so the test environment
 * doesn't need a native Daily.co module.
 */
jest.mock('@daily-co/daily-js', () => {
  const createCallObject = jest.fn(() => ({
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
    destroy: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    participants: jest.fn(() => ({})),
    setLocalAudio: jest.fn(),
    setLocalVideo: jest.fn(),
  }));

  return {
    __esModule: true,
    default: {
      createCallObject,
      getCallInstance: jest.fn(() => null),
    },
    DailyMediaView: ({ testID }: { testID?: string }) => {
      const { View } = require('react-native');
      return <View testID={testID ?? 'daily-media-view'} />;
    },
  };
});

/**
 * Mock useDailySession so ConsultationScreen renders predictably.
 */
jest.mock('./useDailySession', () => ({
  useDailySession: jest.fn(() => ({
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
    participantCount: 0,
    isJoined: false,
    error: null,
  })),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_PROPS = {
  roomUrl: 'https://preventia.daily.co/test-room',
  token: 'test-token-abc123',
  appointmentId: 42,
  onSessionEnd: jest.fn(),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ConsultationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    // Should mount without throwing
    expect(() => render(<ConsultationScreen {...DEFAULT_PROPS} />)).not.toThrow();
  });

  it('shows the "JOIN CALL" button when not joined', () => {
    render(<ConsultationScreen {...DEFAULT_PROPS} />);

    // Pre-join state: join button must be visible
    const joinButton = screen.getByTestId('join-call-button');
    expect(joinButton).toBeTruthy();

    // Button label text
    expect(screen.getByText('JOIN CALL')).toBeTruthy();
  });

  it('does NOT show session-active banner when not joined', () => {
    render(<ConsultationScreen {...DEFAULT_PROPS} />);

    // Session Active banner should be absent before joining
    const banner = screen.queryByTestId('session-active-banner');
    expect(banner).toBeNull();
  });

  it('renders the video container', () => {
    render(<ConsultationScreen {...DEFAULT_PROPS} />);
    expect(screen.getByTestId('video-container')).toBeTruthy();
  });

  it('renders the control bar', () => {
    render(<ConsultationScreen {...DEFAULT_PROPS} />);
    expect(screen.getByTestId('control-bar')).toBeTruthy();
  });

  it('renders the participant badge', () => {
    render(<ConsultationScreen {...DEFAULT_PROPS} />);
    expect(screen.getByTestId('participant-badge')).toBeTruthy();
  });

  it('renders mute and camera buttons', () => {
    render(<ConsultationScreen {...DEFAULT_PROPS} />);
    expect(screen.getByTestId('mute-button')).toBeTruthy();
    expect(screen.getByTestId('camera-button')).toBeTruthy();
  });

  it('renders end-call button', () => {
    render(<ConsultationScreen {...DEFAULT_PROPS} />);
    expect(screen.getByTestId('end-call-button')).toBeTruthy();
  });
});

describe('ConsultationScreen — joined state', () => {
  beforeEach(() => {
    // Override useDailySession to simulate joined state
    const { useDailySession } = require('./useDailySession');
    (useDailySession as jest.Mock).mockReturnValue({
      join: jest.fn(),
      leave: jest.fn(),
      participantCount: 2,
      isJoined: true,
      error: null,
    });
  });

  it('shows "Session Active" banner when joined', () => {
    render(<ConsultationScreen {...DEFAULT_PROPS} />);
    expect(screen.getByTestId('session-active-banner')).toBeTruthy();
    expect(screen.getByText('● SESSION ACTIVE')).toBeTruthy();
  });

  it('does NOT show "JOIN CALL" button when already joined', () => {
    render(<ConsultationScreen {...DEFAULT_PROPS} />);
    const joinButton = screen.queryByTestId('join-call-button');
    expect(joinButton).toBeNull();
  });
});
