import React, { useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import { Buttons, Colors, Radii, Spacing, Surfaces, Typography } from '../../theme/theme';

interface Props {
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  appointmentId: number;
  onSuccess: (paymentId: string) => void;
  onCancel: () => void;
}

const CHECKOUT_URL = 'https://api.razorpay.com/v1/checkout/embedded';
const RAZORPAY_KEY = process.env.REACT_NATIVE_RAZORPAY_KEY ?? 'rzp_test_STUB';

export const PaymentScreen: React.FC<Props> = ({
  orderId,
  amount,
  currency,
  description,
  onSuccess,
  onCancel,
}) => {
  const [loading, setLoading] = useState(true);
  const isStub = orderId.startsWith('order_STUB_');

  useFocusEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancel();
      return true;
    });
    return () => sub.remove();
  });

  const checkoutUrl = `${CHECKOUT_URL}?key_id=${RAZORPAY_KEY}&order_id=${orderId}` +
    `&amount=${amount}&currency=${currency}&description=${encodeURIComponent(description)}`;

  const handleNavChange = (state: WebViewNavigation) => {
    const url = state.url ?? '';
    if (url.includes('razorpay_payment_id')) {
      const match = url.match(/razorpay_payment_id=([^&]+)/);
      if (match?.[1]) onSuccess(match[1]);
    }
    if (url.includes('razorpay_error') || url.includes('payment_cancel')) {
      onCancel();
    }
  };

  if (isStub) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.card}>
          <Text style={s.eyebrow}>Payment preview</Text>
          <Text style={s.amount}>₹{(amount / 100).toLocaleString('en-IN')}</Text>
          <Text style={s.description}>{description}</Text>
          <View style={s.noteBox}>
            <Text style={s.noteTitle}>Stub mode</Text>
            <Text style={s.noteText}>
              Add Razorpay credentials to enable the live checkout experience.
            </Text>
          </View>
          <Pressable style={s.primaryBtn} onPress={() => onSuccess(`pay_STUB_${Date.now()}`)}>
            <Text style={s.primaryBtnText}>Simulate payment success</Text>
          </Pressable>
          <Pressable style={s.secondaryBtn} onPress={onCancel}>
            <Text style={s.secondaryBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.webHeader}>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>Payment</Text>
          <Text style={s.headerTitle}>
            {currency} ₹{(amount / 100).toLocaleString('en-IN')}
          </Text>
          <Text style={s.headerCopy}>{description}</Text>
        </View>
        <Pressable style={s.secondaryBtnSmall} onPress={onCancel}>
          <Text style={s.secondaryBtnText}>Cancel</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={s.loaderOverlay}>
          <ActivityIndicator size="large" color={Colors.sage} />
          <Text style={s.loaderText}>Loading secure payment…</Text>
        </View>
      ) : null}

      <WebView
        source={{ uri: checkoutUrl }}
        style={{ flex: 1, backgroundColor: Colors.background }}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavChange}
        javaScriptEnabled
        domStorageEnabled
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root: {
    ...Surfaces.screen,
  },
  card: {
    ...Surfaces.card,
    borderRadius: Radii.xl,
    margin: Spacing.lg,
    gap: Spacing.md,
    justifyContent: 'center',
    flex: 1,
  },
  webHeader: {
    ...Surfaces.card,
    borderRadius: Radii.xl,
    margin: Spacing.lg,
    marginBottom: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  eyebrow: {
    ...Typography.label,
    color: Colors.sageDeep,
  },
  headerTitle: {
    ...Typography.heading,
    marginTop: 4,
  },
  headerCopy: {
    ...Typography.bodySmall,
    marginTop: 4,
  },
  amount: {
    ...Typography.display,
    fontSize: 36,
    lineHeight: 42,
  },
  description: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  noteBox: {
    ...Surfaces.cardMuted,
    borderRadius: Radii.lg,
    backgroundColor: Colors.goldTint,
  },
  noteTitle: {
    ...Typography.subheading,
    fontSize: 16,
    lineHeight: 22,
  },
  noteText: {
    ...Typography.bodySmall,
    marginTop: 4,
  },
  primaryBtn: {
    ...Buttons.primary,
  },
  primaryBtnText: {
    ...Typography.button,
  },
  secondaryBtn: {
    ...Buttons.secondary,
  },
  secondaryBtnSmall: {
    ...Buttons.secondary,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
  },
  secondaryBtnText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text,
  },
  loaderOverlay: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    gap: Spacing.sm,
  },
  loaderText: {
    ...Typography.bodySmall,
  },
});

export default PaymentScreen;
