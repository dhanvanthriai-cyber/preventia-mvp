/**
 * PaymentScreen.tsx — Razorpay embedded checkout (Sponsor flow)
 * Project Dhanvanthri | Neo-Brutalist Wellness
 *
 * Opens Razorpay checkout in a WebView. Intercepts navigation to detect
 * payment success (URL contains razorpay_payment_id) or failure.
 *
 * STUB mode: when orderId starts with "order_STUB_", renders a mock success
 * UI so the flow can be tested without live Razorpay credentials.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator, BackHandler, Platform, Pressable,
  SafeAreaView, StyleSheet, Text, View,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../../theme/theme';

interface Props {
  orderId:       string;
  amount:        number;   // paise
  currency:      string;
  description:   string;
  appointmentId: number;
  onSuccess:     (paymentId: string) => void;
  onCancel:      () => void;
}

const CHECKOUT_URL = 'https://api.razorpay.com/v1/checkout/embedded';
const RAZORPAY_KEY = process.env.REACT_NATIVE_RAZORPAY_KEY ?? 'rzp_test_STUB';

export const PaymentScreen: React.FC<Props> = ({
  orderId, amount, currency, description, onSuccess, onCancel,
}) => {
  const [loading, setLoading] = useState(true);
  const isStub = orderId.startsWith('order_STUB_');

  // Android back-button → cancel
  useFocusEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancel(); return true;
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

  // ── STUB mode — simulated payment UI ─────────────────────────────────────
  if (isStub) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <Text style={s.headerTitle}>PAYMENT (STUB MODE)</Text>
          <Pressable onPress={onCancel}><Text style={s.cancelBtn}>CANCEL</Text></Pressable>
        </View>
        <View style={s.stubBody}>
          <Text style={s.stubAmount}>₹{(amount / 100).toLocaleString('en-IN')}</Text>
          <Text style={s.stubDesc}>{description}</Text>
          <Text style={s.stubNote}>
            Razorpay credentials not configured.{'\n'}
            Add RAZORPAY_API_KEY to .env to enable live payments.
          </Text>
          <Pressable style={s.stubSuccessBtn} onPress={() => onSuccess('pay_STUB_' + Date.now())}>
            <Text style={s.stubSuccessBtnText}>SIMULATE PAYMENT SUCCESS</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Live Razorpay WebView ─────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>PAYMENT</Text>
          <Text style={s.headerSub}>
            {currency} ₹{(amount / 100).toLocaleString('en-IN')} · {description}
          </Text>
        </View>
        <Pressable onPress={onCancel}><Text style={s.cancelBtn}>CANCEL</Text></Pressable>
      </View>

      {loading && (
        <View style={s.loaderOverlay}>
          <ActivityIndicator size="large" color={Colors.trustBlue} />
          <Text style={s.loaderText}>LOADING PAYMENT…</Text>
        </View>
      )}

      <WebView
        source={{ uri: checkoutUrl }}
        style={{ flex: 1 }}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={handleNavChange}
        javaScriptEnabled
        domStorageEnabled
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: Colors.white },
  header:     {
    backgroundColor: Colors.black, padding: Spacing.md,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 3, borderBottomColor: Colors.black,
  },
  headerTitle:  { color: Colors.white, fontFamily: 'JetBrainsMono-Regular', fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  headerSub:    { color: '#aaa', fontFamily: 'JetBrainsMono-Regular', fontSize: 11, marginTop: 2 },
  cancelBtn:    { color: Colors.alertRed, fontFamily: 'JetBrainsMono-Regular', fontSize: 12, fontWeight: '700' },
  loaderOverlay:{ position: 'absolute', top: 80, left: 0, right: 0, alignItems: 'center', zIndex: 10, gap: 8 },
  loaderText:   { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: '#666' },
  // Stub mode styles
  stubBody:     { flex: 1, padding: Spacing.lg, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  stubAmount:   { fontFamily: 'PlayfairDisplay-Bold', fontSize: 36, color: Colors.black },
  stubDesc:     { fontFamily: 'JetBrainsMono-Regular', fontSize: 13, color: '#555', textAlign: 'center' },
  stubNote:     { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: '#888', textAlign: 'center',
                  borderWidth: 2, borderColor: '#FFC107', padding: Spacing.md, backgroundColor: '#FFF3CD' },
  stubSuccessBtn:     { backgroundColor: Colors.black, borderWidth: 2, borderColor: Colors.black,
                        padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md, width: '100%' },
  stubSuccessBtnText: { color: Colors.white, fontFamily: 'JetBrainsMono-Regular', fontSize: 13, fontWeight: '700', letterSpacing: 2 },
});

export default PaymentScreen;
