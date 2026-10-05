package com.redlink.backend.notification;

import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.Notification;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.model.enums.Role;
import com.redlink.backend.repository.NotificationRepository;
import com.redlink.backend.support.IntegrationTest;
import com.redlink.backend.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// S4: GET /api/notifications, mark one read, mark all read; always only your own
@IntegrationTest
class NotificationFeedIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private TestData testData;
    @Autowired private NotificationRepository notificationRepository;

    private User donor;
    private User someoneElse;

    @BeforeEach
    void setUp() {
        donor = testData.user("kamal", Role.DONOR);
        someoneElse = testData.user("nimali", Role.DONOR);
    }

    private Notification notify(User user, String message, BloodRequest request) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setMessage(message);
        notification.setRequest(request);
        return notificationRepository.saveAndFlush(notification);
    }

    private ResultActions as(User user, MockHttpServletRequestBuilder request) throws Exception {
        return mvc.perform(request.header("Authorization", testData.bearer(user)));
    }

    @Test
    void feedIsYourOwnNewestFirstWithTheUnreadCount() throws Exception {
        User staff = testData.staff(testData.hospital(HospitalStatus.APPROVED));
        BloodRequest request = testData.bloodRequest(staff, BloodGroup.A_POS, "Colombo");
        notify(donor, "first", null);
        Notification second = notify(donor, "second", request);
        notify(someoneElse, "not yours", null);

        as(donor, get("/api/notifications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount").value(2))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].id").value(second.getId()))
                .andExpect(jsonPath("$.items[0].message").value("second"))
                .andExpect(jsonPath("$.items[0].read").value(false))
                .andExpect(jsonPath("$.items[0].createdAt").isNotEmpty())
                .andExpect(jsonPath("$.items[0].requestId").value(request.getId()))
                .andExpect(jsonPath("$.items[0].reference").value("RQ-" + request.getId()))
                .andExpect(jsonPath("$.items[1].message").value("first"))
                .andExpect(jsonPath("$.items[1].requestId").doesNotExist());
    }

    @Test
    void markingOneReadLowersTheCount() throws Exception {
        Notification first = notify(donor, "first", null);
        notify(donor, "second", null);

        as(donor, patch("/api/notifications/{id}/read", first.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true));
        as(donor, patch("/api/notifications/{id}/read", first.getId())).andExpect(status().isOk()); // again is fine

        as(donor, get("/api/notifications")).andExpect(jsonPath("$.unreadCount").value(1));
    }

    @Test
    void someoneElsesNotificationIsNotFound() throws Exception {
        Notification theirs = notify(someoneElse, "not yours", null);

        as(donor, patch("/api/notifications/{id}/read", theirs.getId())).andExpect(status().isNotFound());
        as(donor, patch("/api/notifications/{id}/read", Long.MAX_VALUE)).andExpect(status().isNotFound());
        assertThat(notificationRepository.findById(theirs.getId()).orElseThrow().isRead()).isFalse();
    }

    @Test
    void markAllReadOnlyTouchesYourOwn() throws Exception {
        notify(donor, "first", null);
        notify(donor, "second", null);
        Notification theirs = notify(someoneElse, "not yours", null);

        as(donor, patch("/api/notifications/read-all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.updated").value(2));

        as(donor, get("/api/notifications"))
                .andExpect(jsonPath("$.unreadCount").value(0))
                .andExpect(jsonPath("$.items[0].read").value(true));
        assertThat(notificationRepository.findById(theirs.getId()).orElseThrow().isRead()).isFalse();
    }

    @Test
    void everyRoleHasNotificationsButNeedsToSignIn() throws Exception {
        as(testData.admin(), get("/api/notifications")).andExpect(status().isOk());
        as(testData.staff(testData.hospital(HospitalStatus.PENDING)), get("/api/notifications"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/notifications")).andExpect(status().isUnauthorized());
    }
}
