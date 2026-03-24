package com.preventia.chat.repository;

import com.preventia.chat.domain.UrgentMessageAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;

@Repository
public interface UrgentMessageAlertRepository extends JpaRepository<UrgentMessageAlert, Long> {

    boolean existsByChannelIdAndMessageId(String channelId, String messageId);

    /**
     * Find urgent messages older than the given cutoff that haven't triggered an admin alert yet.
     */
    @Query("SELECT u FROM UrgentMessageAlert u WHERE u.sentAt < :cutoff AND u.alertSentAt IS NULL")
    List<UrgentMessageAlert> findUnalertedOlderThan(@Param("cutoff") OffsetDateTime cutoff);
}
