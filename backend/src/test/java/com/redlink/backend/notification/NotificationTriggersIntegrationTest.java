package com.redlink.backend.notification;

import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.Donor;
import com.redlink.backend.model.Hospital;
import com.redlink.backend.model.Notification;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.model.enums.ResponseStatus;
import com.redlink.backend.repository.NotificationRepository;
import com.redlink.backend.repository.UserRepository;
import com.redlink.backend.support.IntegrationTest;
import com.redlink.backend.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Who is told about what (NotificationService), checked through the real endpoints
@IntegrationTest
class NotificationTriggersIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private TestData testData;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private UserRepository userRepository;

    private Hospital hospital;
    private User staff;
    private User colleague;
    private BloodRequest request;
    private String ref;

    @BeforeEach
    void setUp() {
        hospital = testData.hospital(HospitalStatus.APPROVED);
        staff = testData.staff(hospital);
        colleague = testData.staff(hospital);
        request = testData.bloodRequest(staff, BloodGroup.A_POS, "Colombo");
        ref = "RQ-" + request.getId();
    }

    private List<String> messagesFor(User user) {
        return notificationRepository.findByUserIdOrderByCreatedAtDescIdDesc(user.getId()).stream()
                .map(Notification::getMessage)
                .toList();
    }

    private ResultActions reply(Donor donor, String status) throws Exception {
        return mvc.perform(post("/api/requests/{id}/responses", request.getId())
                .header("Authorization", testData.bearer(donor.getUser()))
                .contentType("application/json").content("{\"status\":\"" + status + "\"}"));
    }

    private ResultActions close(String body) throws Exception {
        return mvc.perform(patch("/api/requests/{id}/status", request.getId())
                .header("Authorization", testData.bearer(staff))
                .contentType("application/json").content(body));
    }

    @Test
    void everyEnabledStaffMemberHearsWhenADonorAccepts() throws Exception {
        User disabled = testData.staff(hospital);
        disabled.setEnabled(false);
        userRepository.flush();
        Donor kamal = testData.donor(BloodGroup.O_POS, "Colombo", null);

        reply(kamal, "ACCEPTED").andExpect(status().isCreated());

        String expected = "%s (O+) can donate for #%s. Call 0771234567 to confirm."
                .formatted(kamal.getUser().getFullName(), ref);
        assertThat(messagesFor(staff)).containsExactly(expected);
        assertThat(messagesFor(colleague)).containsExactly(expected);
        assertThat(messagesFor(disabled)).isEmpty();
        assertThat(notificationRepository.findByUserIdOrderByCreatedAtDescIdDesc(staff.getId()).getFirst()
                .getRequest().getId()).isEqualTo(request.getId());
    }

    @Test
    void declinesAreNotReported() throws Exception {
        reply(testData.donor(BloodGroup.O_POS, "Colombo", null), "DECLINED").andExpect(status().isCreated());

        assertThat(messagesFor(staff)).isEmpty();
    }

    @Test
    void staffHearWhenADonorWithdraws() throws Exception {
        Donor kamal = testData.donor(BloodGroup.O_POS, "Colombo", null);
        reply(kamal, "ACCEPTED");

        mvc.perform(patch("/api/requests/{id}/responses/me", request.getId())
                        .header("Authorization", testData.bearer(kamal.getUser()))
                        .contentType("application/json").content("{\"status\":\"WITHDRAWN\"}"))
                .andExpect(status().isOk());

        assertThat(messagesFor(staff).getFirst())
                .isEqualTo("%s can no longer donate for #%s.".formatted(kamal.getUser().getFullName(), ref));
    }

    @Test
    void fulfillingThanksDonorsAndTellsTheOthersItsNoLongerNeeded() throws Exception {
        Donor gave = testData.donor(BloodGroup.O_POS, "Colombo", null);
        Donor didntCome = testData.donor(BloodGroup.A_POS, "Colombo", null);
        Donor declined = testData.donor(BloodGroup.O_NEG, "Colombo", null);
        testData.response(request, gave, ResponseStatus.ACCEPTED);
        testData.response(request, didntCome, ResponseStatus.ACCEPTED);
        testData.response(request, declined, ResponseStatus.DECLINED);

        close("{\"status\":\"FULFILLED\",\"donorIds\":[" + gave.getId() + "]}").andExpect(status().isOk());

        String nextDate = LocalDate.now(ZoneOffset.UTC).plusDays(90)
                .format(DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH));
        assertThat(messagesFor(gave.getUser())).containsExactly(
                "Thank you for donating at %s (#%s). You can donate again from %s."
                        .formatted(hospital.getName(), ref, nextDate));
        assertThat(messagesFor(didntCome.getUser())).containsExactly(
                "#%s at %s has been fulfilled. It's no longer needed, thank you for offering to help."
                        .formatted(ref, hospital.getName()));
        assertThat(messagesFor(declined.getUser())).isEmpty();
    }

    @Test
    void cancellingTellsDonorsWhoHadAccepted() throws Exception {
        Donor accepted = testData.donor(BloodGroup.O_POS, "Colombo", null);
        testData.response(request, accepted, ResponseStatus.ACCEPTED);

        close("{\"status\":\"CANCELLED\"}").andExpect(status().isOk());

        assertThat(messagesFor(accepted.getUser())).containsExactly(
                "#%s at %s was cancelled. It's no longer needed, thank you for offering to help."
                        .formatted(ref, hospital.getName()));
    }

    @Test
    void hospitalStaffHearTheAdminsDecision() throws Exception {
        Hospital approved = testData.hospital(HospitalStatus.PENDING);
        Hospital rejected = testData.hospital(HospitalStatus.PENDING);
        User approvedStaff = testData.staff(approved);
        User rejectedStaff = testData.staff(rejected);
        String admin = testData.bearer(testData.admin());

        mvc.perform(patch("/api/admin/hospitals/{id}/status", approved.getId()).header("Authorization", admin)
                        .contentType("application/json").content("{\"status\":\"APPROVED\"}"))
                .andExpect(status().isOk());
        mvc.perform(patch("/api/admin/hospitals/{id}/status", rejected.getId()).header("Authorization", admin)
                        .contentType("application/json")
                        .content("{\"status\":\"REJECTED\",\"reason\":\"Registration number could not be verified.\"}"))
                .andExpect(status().isOk());

        assertThat(messagesFor(approvedStaff)).containsExactly(
                approved.getName() + " was approved. You can now post blood requests.");
        assertThat(messagesFor(rejectedStaff)).containsExactly(
                rejected.getName() + " wasn't approved: Registration number could not be verified.");
    }
}
