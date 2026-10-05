package com.redlink.backend.request;

import com.redlink.backend.config.RequestExpiryScheduler;
import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.Donor;
import com.redlink.backend.model.Notification;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.model.enums.RequestStatus;
import com.redlink.backend.model.enums.ResponseStatus;
import com.redlink.backend.repository.BloodRequestRepository;
import com.redlink.backend.repository.NotificationRepository;
import com.redlink.backend.service.RequestExpiryService;
import com.redlink.backend.support.IntegrationTest;
import com.redlink.backend.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// H10: OPEN requests past their needed-by time become EXPIRED (final), and donors who accepted are told
@IntegrationTest
class RequestExpiryIntegrationTest {

    @Autowired private RequestExpiryService requestExpiryService;
    @Autowired private BloodRequestRepository bloodRequestRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private TestData testData;
    @Autowired private MockMvc mvc;
    @Autowired private ApplicationContext context;

    private User staff;

    @BeforeEach
    void setUp() {
        staff = testData.staff(testData.hospital(HospitalStatus.APPROVED));
    }

    private BloodRequest neededIn(Duration duration) {
        BloodRequest request = testData.bloodRequest(staff, BloodGroup.O_POS, "Colombo");
        request.setNeededBy(Instant.now().plus(duration));
        return bloodRequestRepository.saveAndFlush(request);
    }

    private RequestStatus statusOf(BloodRequest request) {
        return bloodRequestRepository.findById(request.getId()).orElseThrow().getStatus();
    }

    @Test
    void overdueOpenRequestsExpireAndTheRestAreLeftAlone() {
        BloodRequest overdue = neededIn(Duration.ofMinutes(-1));
        BloodRequest stillTime = neededIn(Duration.ofHours(2));
        BloodRequest cancelledEarlier = neededIn(Duration.ofHours(-3));
        cancelledEarlier.setStatus(RequestStatus.CANCELLED);
        cancelledEarlier.setClosedAt(Instant.now().minus(Duration.ofHours(4)));
        bloodRequestRepository.flush();

        assertThat(requestExpiryService.expireOverdue()).isGreaterThanOrEqualTo(1);

        BloodRequest expired = bloodRequestRepository.findById(overdue.getId()).orElseThrow();
        assertThat(expired.getStatus()).isEqualTo(RequestStatus.EXPIRED);
        assertThat(expired.getClosedAt()).isNotNull();
        assertThat(statusOf(stillTime)).isEqualTo(RequestStatus.OPEN);
        assertThat(statusOf(cancelledEarlier)).isEqualTo(RequestStatus.CANCELLED);
    }

    @Test
    void donorsWhoAcceptedAreToldOthersAreNot() {
        BloodRequest overdue = neededIn(Duration.ofMinutes(-1));
        Donor accepted = testData.donor(BloodGroup.O_POS, "Colombo", null);
        Donor declined = testData.donor(BloodGroup.O_POS, "Colombo", null);
        testData.response(overdue, accepted, ResponseStatus.ACCEPTED);
        testData.response(overdue, declined, ResponseStatus.DECLINED);

        requestExpiryService.expireOverdue();

        assertThat(notificationRepository.findByUserIdOrderByCreatedAtDescIdDesc(accepted.getUser().getId()))
                .extracting(Notification::getMessage)
                .containsExactly("#RQ-%d at %s has expired. It's no longer needed, thank you for offering to help."
                        .formatted(overdue.getId(), staff.getHospital().getName()));
        assertThat(notificationRepository.findByUserIdOrderByCreatedAtDescIdDesc(declined.getUser().getId())).isEmpty();
    }

    @Test
    void runningAgainChangesNothing() {
        neededIn(Duration.ofMinutes(-1));
        requestExpiryService.expireOverdue();

        assertThat(requestExpiryService.expireOverdue()).isZero();
    }

    @Test
    void anExpiredRequestIsFinal() throws Exception {
        BloodRequest overdue = neededIn(Duration.ofMinutes(-1));
        Donor donor = testData.donor(BloodGroup.O_POS, "Colombo", null);
        requestExpiryService.expireOverdue();

        mvc.perform(patch("/api/requests/{id}/status", overdue.getId())
                        .header("Authorization", testData.bearer(staff))
                        .contentType("application/json").content("{\"status\":\"CANCELLED\"}"))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/requests/{id}/responses", overdue.getId())
                        .header("Authorization", testData.bearer(donor.getUser()))
                        .contentType("application/json").content("{\"status\":\"ACCEPTED\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void theBackgroundJobIsOffInTests() {
        assertThat(context.getBeanNamesForType(RequestExpiryScheduler.class)).isEmpty();
    }
}
