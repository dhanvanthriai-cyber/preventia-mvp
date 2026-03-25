package com.preventia.shared.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.TrustManagerFactory;
import javax.net.ssl.X509TrustManager;
import java.io.InputStream;
import java.net.http.HttpClient;
import java.security.GeneralSecurityException;
import java.security.KeyStore;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Shared Daily.co REST client configuration.
 *
 * Outbound Daily API calls sometimes run behind local TLS interception
 * (for example Cisco Secure Access) and sometimes talk to Daily directly.
 * This client keeps the JVM default trust managers intact and adds the
 * bundled fallback certs needed for the direct Daily/Amazon chain.
 */
@Configuration
public class DailyApiConfig {

    private static final Logger log = LoggerFactory.getLogger(DailyApiConfig.class);
    private static final String DAILY_API_BASE = "https://api.daily.co/v1";
    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(10);
    private static final List<String> BUNDLED_CERT_PATHS = List.of(
            "certs/amazon-rsa-2048-m03.pem",
            "certs/amazon-root-ca-1.pem"
    );

    @Bean
    public RestClient dailyRestClient(@Value("${daily.api-key:STUB_KEY}") String apiKey) {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(CONNECT_TIMEOUT)
                .sslContext(buildSslContext())
                .build();

        log.info(
                "[DailyApiConfig] Daily RestClient initialized for {} using JVM default trust + {} bundled fallback certs.",
                DAILY_API_BASE,
                BUNDLED_CERT_PATHS.size()
        );

        return RestClient.builder()
                .baseUrl(DAILY_API_BASE)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .requestFactory(new JdkClientHttpRequestFactory(httpClient))
                .build();
    }

    private SSLContext buildSslContext() {
        try {
            X509TrustManager defaultTrustManager = trustManagerFromSystem();
            X509TrustManager bundledTrustManager = trustManagerFromBundledCerts();

            SSLContext sslContext = SSLContext.getInstance("TLS");
            sslContext.init(
                    null,
                    new TrustManager[]{new CompositeX509TrustManager(defaultTrustManager, bundledTrustManager)},
                    null
            );
            return sslContext;
        } catch (Exception e) {
            throw new IllegalStateException("Unable to initialize Daily.co SSL trust managers", e);
        }
    }

    private static X509TrustManager trustManagerFromSystem() throws GeneralSecurityException {
        TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        tmf.init((KeyStore) null);
        return extractX509TrustManager(tmf, "default JVM");
    }

    private X509TrustManager trustManagerFromBundledCerts() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(KeyStore.getDefaultType());
        keyStore.load(null, null);

        CertificateFactory certificateFactory = CertificateFactory.getInstance("X.509");
        int loaded = 0;

        for (String path : BUNDLED_CERT_PATHS) {
            try (InputStream inputStream = new ClassPathResource(path).getInputStream()) {
                X509Certificate certificate =
                        (X509Certificate) certificateFactory.generateCertificate(inputStream);
                keyStore.setCertificateEntry("daily-bundled-" + loaded, certificate);
                loaded++;
                log.info(
                        "[DailyApiConfig] Trusted bundled Daily fallback cert: {}",
                        certificate.getSubjectX500Principal()
                );
            }
        }

        if (loaded == 0) {
            throw new IllegalStateException("No bundled Daily fallback certs were loaded");
        }

        TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        tmf.init(keyStore);
        return extractX509TrustManager(tmf, "bundled Daily fallback");
    }

    private static X509TrustManager extractX509TrustManager(TrustManagerFactory tmf, String sourceName) {
        for (TrustManager trustManager : tmf.getTrustManagers()) {
            if (trustManager instanceof X509TrustManager x509TrustManager) {
                return x509TrustManager;
            }
        }
        throw new IllegalStateException("No X509TrustManager available from " + sourceName + " trust store");
    }

    private static final class CompositeX509TrustManager implements X509TrustManager {
        private final List<X509TrustManager> delegates;

        private CompositeX509TrustManager(X509TrustManager... delegates) {
            this.delegates = List.copyOf(Arrays.asList(delegates));
        }

        @Override
        public void checkClientTrusted(X509Certificate[] chain, String authType) throws CertificateException {
            CertificateException lastFailure = null;

            for (X509TrustManager delegate : delegates) {
                try {
                    delegate.checkClientTrusted(chain, authType);
                    return;
                } catch (CertificateException e) {
                    if (lastFailure != null) {
                        e.addSuppressed(lastFailure);
                    }
                    lastFailure = e;
                }
            }

            if (lastFailure == null) {
                throw new CertificateException("No trust manager accepted the client certificate chain");
            }
            throw lastFailure;
        }

        @Override
        public void checkServerTrusted(X509Certificate[] chain, String authType) throws CertificateException {
            CertificateException lastFailure = null;

            for (X509TrustManager delegate : delegates) {
                try {
                    delegate.checkServerTrusted(chain, authType);
                    return;
                } catch (CertificateException e) {
                    if (lastFailure != null) {
                        e.addSuppressed(lastFailure);
                    }
                    lastFailure = e;
                }
            }

            if (lastFailure == null) {
                throw new CertificateException("No trust manager accepted the server certificate chain");
            }
            throw lastFailure;
        }

        @Override
        public X509Certificate[] getAcceptedIssuers() {
            List<X509Certificate> acceptedIssuers = new ArrayList<>();
            for (X509TrustManager delegate : delegates) {
                acceptedIssuers.addAll(List.of(delegate.getAcceptedIssuers()));
            }
            return acceptedIssuers.toArray(X509Certificate[]::new);
        }
    }
}
