/**
 * ActionCard.stories.tsx
 * Project Dhanvanthri — Storybook stories for ActionCard
 *
 * NOTE: Storybook (@storybook/react-native) was not detected in
 * node_modules at generation time. These stories follow the
 * @storybook/react-native 6.x / 7.x CSF3 format and will work
 * once `@storybook/react-native` is installed:
 *
 *   npm install --save-dev @storybook/react-native
 *
 * They can also serve as visual reference / snapshot tests.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { Meta, StoryObj } from '@storybook/react-native';
import { ActionCard } from './ActionCard';

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta: Meta<typeof ActionCard> = {
  title: 'Dhanvanthri/ActionCard',
  component: ActionCard,
  decorators: [
    (Story) => (
      <View style={styles.storyWrapper}>
        <Story />
      </View>
    ),
  ],
  argTypes: {
    urgency: {
      control: { type: 'select' },
      options: ['normal', 'warning', 'critical'],
    },
    isSticky: {
      control: { type: 'boolean' },
    },
  },
};

export default meta;

type Story = StoryObj<typeof ActionCard>;

// ─── Stories ──────────────────────────────────────────────────────────────────

/**
 * NormalCard — Trust Blue background
 * Use case: upcoming scheduled appointment within 30 minutes.
 * Mirrors the blue sticky banner ("URGENT POST VISIT") visible in
 * "User Mobile view.jpeg".
 */
export const NormalCard: Story = {
  args: {
    title: 'Appointment in 30 mins',
    subtitle: 'Dr. Arjun Sharma · General Physician',
    value: 'TODAY  10:30 AM',
    urgency: 'normal',
    ctaLabel: 'Join Virtual Call',
    onPress: () => console.log('[Story] NormalCard CTA pressed'),
    isSticky: false,
  },
};

/**
 * WarningCard — Amber #FFC107 background, black text
 * Use case: medication refill required in 5 days.
 * Maps to alertYellow in the Dhanvanthri colour palette.
 */
export const WarningCard: Story = {
  args: {
    title: 'Refill Required',
    subtitle: 'Metformin 500mg · Prescription expires soon',
    value: '5 DAYS REMAINING',
    urgency: 'warning',
    ctaLabel: 'Request Refill Now',
    onPress: () => console.log('[Story] WarningCard CTA pressed'),
    isSticky: false,
  },
};

/**
 * CriticalCard — Red #D32F2F background, white text
 * Use case: patient missed a scheduled appointment that needs immediate rescheduling.
 * Maps to alertRed — highest urgency trigger in PRD §3.
 */
export const CriticalCard: Story = {
  args: {
    title: 'Missed Appointment',
    subtitle: 'Reschedule Now · Dr. Priya Menon · Cardiologist',
    value: 'MISSED  2H AGO',
    urgency: 'critical',
    ctaLabel: 'Reschedule Now',
    onPress: () => console.log('[Story] CriticalCard CTA pressed'),
    isSticky: false,
  },
};

/**
 * StickyNormal — Demonstrates isSticky=true positioning.
 * Replicates the absolute-top banner from "User Mobile view.jpeg".
 */
export const StickyNormal: Story = {
  args: {
    ...NormalCard.args,
    title: 'Appointment in 30 mins',
    ctaLabel: 'Join Virtual Call',
    isSticky: true,
  },
  decorators: [
    (Story) => (
      <View style={styles.stickyWrapper}>
        <Story />
      </View>
    ),
  ],
};

/**
 * NoValueNoSubtitle — Minimal card with only title + CTA.
 */
export const MinimalCard: Story = {
  args: {
    title: 'Blood Test Results Ready',
    urgency: 'normal',
    ctaLabel: 'View Results',
    onPress: () => console.log('[Story] MinimalCard CTA pressed'),
  },
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  storyWrapper: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  stickyWrapper: {
    flex: 1,
    height: 300,
    backgroundColor: '#f5f5f5',
  },
});
