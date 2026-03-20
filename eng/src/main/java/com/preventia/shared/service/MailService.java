package com.preventia.shared.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class MailService {
    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    @Value("${app.mail.enabled:false}") private boolean mailEnabled;
    @Value("${app.mail.admin-address:admin@preventia.ai}") private String adminAddress;
    @Value("${app.mail.from-address:noreply@preventia.ai}") private String fromAddress;

    private final JavaMailSender mailSender;

    public MailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendAdminAlert(String subject, String body) {
        if (!mailEnabled) {
            log.info("[MailService] STUB — admin alert: {}", subject);
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(fromAddress);
            msg.setTo(adminAddress);
            msg.setSubject("[Preventia Alert] " + subject);
            msg.setText(body);
            mailSender.send(msg);
            log.info("[MailService] Admin alert sent: {}", subject);
        } catch (Exception e) {
            log.error("[MailService] Failed: {}", e.getMessage());
        }
    }

    public void sendUserNotification(String toEmail, String subject, String body) {
        if (!mailEnabled) {
            log.info("[MailService] STUB — email to {}: {}", toEmail, subject);
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(fromAddress);
            msg.setTo(toEmail);
            msg.setSubject(subject);
            msg.setText(body);
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("[MailService] Failed to {}: {}", toEmail, e.getMessage());
        }
    }
}
