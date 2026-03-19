/**
 * PharmacyPaymentScreen.tsx — Razorpay checkout for pharmacy payments
 * Project Preventia | Neo-Brutalist Wellness
 */
import React, { useState } from 'react';
import {
  ActivityIndicator, BackHandler, Pressable,
  SafeAreaView, StyleSheet, Text, View,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing } from '../../theme/theme';

interface Props {
  orderId:   string;
  amount:    number;   // paise
  currency:  string;
  onSuccess: (paymentId: string) => void;
  onCancel:  () => void;
}

const CHECKOUT_URL  = 'https://api.razorpay.com/v1/checkout/embedded';
const RAZORPAY_KEY  = process.env.REACT_NATIVE_RAZORPAY_KEY ?? 'rzp_test_STUB';

export const PharmacyPaymentScreen: React.FC<Props> = ({
  orderId, amount, currency, onSuccess, onCancel,
}) => {
  const [loading, setLoading] = useState(true);
  const isStub = orderId.startsWith('order_STUB_');

  useFocusEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onCancel(); return true; });
    return () => sub.remove();
  });

  const checkoutUrl = `${CHECKOUT_URL}?key_id=${RAZORPAY_KEY}&order_id=${orderId}` +
    `&amount=${amount}&currency=${currency}&description=${encodeURIComponent('Pharmacy Payment')}`;

  const handleNavChange = (state: WebViewNavigation) => {
    const url = state.url ?? '';
    if (url.includes('razorpay_payment_id')) {
      const match = url.match(/razorpay_payment_id=([^&]+)/);
      if (match?.[1]) onSuccess(match[1]);
    }
    if (url.includes('razorpay_error') || url.includes('payment_cancel')) onCancel();
  };

  if (isStub) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.header}>
          <Text style={s.headerTitle}>PHARMACY PAYMENT (STUB)</Text>
          <Pressable onPress={onCancel}><Text style={s.cancel}>CANCEL</Text></Pressable>
        </View>
        <View style={s.body}>
          <Text style={s.amount}>₹{(amount / 100).toLocaleString('en-IN')}</Text>
          <Text style={s.currency}>{currency}</Text>
          <Pressable style={s.simBtn} onPress={() => onSuccess('pay_STUB_' + Date.now())}>
            <Text style={s.simBtnText}>SIMULATE PAYMENT SUCCESS</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>PHARMACY PAYMENT</Text>
          <Text style={s.sub}>{currency} ₹{(amount / 100).toLocaleString('en-IN')}</Text>
        </View>
        <Pressable onPress={onCancel}><Text style={s.cancel}>CANCEL</Text></Pressable>
      </View>
      {loading && (
        <View style={s.loader}>
          <ActivityIndicator size="large" color={Colors.trustBlue} />
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
  header:     { backgroundColor: Colors.black, padding: Spacing.md, flexDirection: 'row',
                justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: Colors.black },
  headerTitle:{ color: Colors.white, fontFamily: 'JetBrainsMono-Regular', fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  sub:        { color: '#aaa', fontFamily: 'JetBrainsMono-Regular', fontSize: 11, marginTop: 2 },
  cancel:     { color: Colors.alertRed, fontFamily: 'JetBrainsMono-Regular', fontSize: 12, fontWeight: '700' },
  loader:     { position: 'absolute', top: 80, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  body:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, gap: Spacing.md },
  amount:     { fontFamily: 'PlayfairDisplay-Bold', fontSize: 36, color: Colors.black },
  currency:   { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: '#666' },
  simBtn:     { backgroundColor: Colors.black, borderWidth: 2, borderColor: Colors.black, padding: Spacing.md, alignItems: 'center', width: '100%' },
  simBtnText: { color: Colors.white, fontFamily: 'JetBrainsMono-Regular', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
});

export default PharmacyPaymentScreen;
