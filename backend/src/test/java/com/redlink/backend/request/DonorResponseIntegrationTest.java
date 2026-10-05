package com.redlink.backend.request;

import com.redlink.backend.model.BloodRequest;
import com.redlink.backend.model.Donor;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.BloodGroup;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.model.enums.RequestStatus;
import com.redlink.backend.model.enums.ResponseStatus;
import com.redlink.backend.repository.DonorResponseRepository;
import com.redlink.backend.support.IntegrationTest;
import com.redlink.backend.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// D6, D7, D9 and H7 through the whole app: reply once, withdraw an acceptance, the hospital sees the replies
@IntegrationTest
class DonorResponseIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private TestData testData;
    @Autowired private DonorResponseRepository donorResponseRepository;

    private final LocalDate today = LocalDate.now(ZoneOffset.UTC);
    private User staff;
    private BloodRequest request;
    private Donor donor;

    @BeforeEach
    void setUp() {
        staff = testData.staff(testData.hospital(HospitalStatus.APPROVED));
        request = testData.bloodRequest(staff, BloodGroup.A_POS, "Colombo");
        donor = testData.donor(BloodGroup.O_NEG, "Colombo", null);
    }

    private ResultActions respond(Donor who, BloodRequest to, String status) throws Exception {
        return mvc.perform(post("/api/requests/{id}/responses", to.getId())
                .header("Authorization", testData.bearer(who.getUser()))
                .contentType("application/json").content("{\"status\":\"" + status + "\"}"));
    }

    private ResultActions withdraw(Donor who, BloodRequest from, String status) throws Exception {
        return mvc.perform(patch("/api/requests/{id}/responses/me", from.getId())
                .header("Authorization", testData.bearer(who.getUser()))
                .contentType("application/json").content("{\"status\":\"" + status + "\"}"));
    }

    private ResponseStatus savedStatus(Donor who) {
        return donorResponseRepository.findByRequestIdAndDonorId(request.getId(), who.getId()).orElseThrow().getStatus();
    }

    private void close(BloodRequest closing) {
        closing.setStatus(RequestStatus.FULFILLED);
        closing.setClosedAt(Instant.now());
    }

    // ---------- D6, D7: reply once ----------

    @Test
    void acceptingReturnsTheRequestWithTheReplyAndHospitalDetails() throws Exception {
        respond(donor, request, "ACCEPTED")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.requestId").value(request.getId()))
                .andExpect(jsonPath("$.myResponse").value("ACCEPTED"))
                .andExpect(jsonPath("$.respondedAt").isNotEmpty())
                .andExpect(jsonPath("$.hospitalPhone").value("0115577111"))
                .andExpect(jsonPath("$.exactMatch").value(false));

        assertThat(savedStatus(donor)).isEqualTo(ResponseStatus.ACCEPTED);
    }

    @Test
    void decliningIsAlsoOnceAndFinal() throws Exception {
        respond(donor, request, "DECLINED").andExpect(status().isCreated())
                .andExpect(jsonPath("$.myResponse").value("DECLINED"));

        respond(donor, request, "ACCEPTED")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("You've already responded to this request."));
        assertThat(savedStatus(donor)).isEqualTo(ResponseStatus.DECLINED);
    }

    @Test
    void ineligibleDonorsCanDeclineButNotAccept() throws Exception {
        Donor recent = testData.donor(BloodGroup.O_NEG, "Colombo", today.minusDays(30));
        Donor alsoRecent = testData.donor(BloodGroup.O_NEG, "Colombo", today.minusDays(30));

        respond(recent, request, "ACCEPTED")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(startsWith("You can donate again from ")));
        respond(alsoRecent, request, "DECLINED").andExpect(status().isCreated());
    }

    @Test
    void aGroupThatCantGiveToTheRequestIsRefused() throws Exception {
        Donor bPos = testData.donor(BloodGroup.B_POS, "Colombo", null); // B+ can't give to A+

        respond(bPos, request, "ACCEPTED")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Your blood group (B+) can't be given to someone who needs A+."));
    }

    @Test
    void closedAndOverdueRequestsTakeNoReplies() throws Exception {
        BloodRequest overdue = testData.bloodRequest(staff, BloodGroup.A_POS, "Colombo");
        overdue.setNeededBy(Instant.now().minus(Duration.ofMinutes(5)));
        close(request);

        respond(donor, request, "ACCEPTED")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("This request is already closed."));
        respond(donor, overdue, "ACCEPTED").andExpect(status().isConflict());
    }

    @Test
    void replyMustBeAcceptedOrDeclined() throws Exception {
        respond(donor, request, "WITHDRAWN")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("status"));
        respond(donor, request, "MAYBE").andExpect(status().isBadRequest());
        mvc.perform(post("/api/requests/{id}/responses", Long.MAX_VALUE)
                        .header("Authorization", testData.bearer(donor.getUser()))
                        .contentType("application/json").content("{\"status\":\"ACCEPTED\"}"))
                .andExpect(status().isNotFound());
    }

    // ---------- D9: withdraw ----------

    @Test
    void anAcceptedDonorCanWithdrawOnce() throws Exception {
        respond(donor, request, "ACCEPTED");

        withdraw(donor, request, "WITHDRAWN")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.myResponse").value("WITHDRAWN"));
        assertThat(savedStatus(donor)).isEqualTo(ResponseStatus.WITHDRAWN);

        withdraw(donor, request, "WITHDRAWN")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Only accepted responses can be withdrawn."));
        respond(donor, request, "ACCEPTED")
                .andExpect(jsonPath("$.message").value("You've already responded to this request."));
    }

    @Test
    void onlyAcceptedResponsesCanBeWithdrawn() throws Exception {
        respond(donor, request, "DECLINED");

        withdraw(donor, request, "WITHDRAWN")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Only accepted responses can be withdrawn."));
    }

    @Test
    void withdrawingNeedsAnOpenRequestAndAReply() throws Exception {
        Donor neverReplied = testData.donor(BloodGroup.O_NEG, "Colombo", null);
        respond(donor, request, "ACCEPTED");

        withdraw(neverReplied, request, "WITHDRAWN")
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("You haven't responded to this request."));
        withdraw(donor, request, "ACCEPTED")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("status"));

        close(request);
        withdraw(donor, request, "WITHDRAWN")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("This request is already closed."));
        assertThat(savedStatus(donor)).isEqualTo(ResponseStatus.ACCEPTED);
    }

    // ---------- H7: the hospital sees the replies ----------

    @Test
    void staffSeeRepliesAcceptedFirstThenWithdrawnThenDeclined() throws Exception {
        Donor declines = testData.donor(BloodGroup.A_POS, "Kandy", null);
        Donor withdraws = testData.donor(BloodGroup.A_NEG, "Galle", null);
        respond(declines, request, "DECLINED");
        respond(withdraws, request, "ACCEPTED");
        withdraw(withdraws, request, "WITHDRAWN");
        respond(donor, request, "ACCEPTED");

        mvc.perform(get("/api/requests/{id}/responses", request.getId()).header("Authorization", testData.bearer(staff)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].donorId").value(donor.getId()))
                .andExpect(jsonPath("$[0].status").value("ACCEPTED"))
                .andExpect(jsonPath("$[0].phone").value("0771234567"))
                .andExpect(jsonPath("$[0].bloodGroup").value("O-"))
                .andExpect(jsonPath("$[1].donorId").value(withdraws.getId()))
                .andExpect(jsonPath("$[1].status").value("WITHDRAWN"))
                .andExpect(jsonPath("$[2].donorId").value(declines.getId()))
                .andExpect(jsonPath("$[2].status").value("DECLINED"));
    }

    @Test
    void otherHospitalsCantSeeTheReplies() throws Exception {
        User otherStaff = testData.staff(testData.hospital(HospitalStatus.APPROVED));

        mvc.perform(get("/api/requests/{id}/responses", request.getId()).header("Authorization", testData.bearer(otherStaff)))
                .andExpect(status().isNotFound());
    }

    @Test
    void onlyDonorsReplyAndOnlyStaffReadReplies() throws Exception {
        mvc.perform(post("/api/requests/{id}/responses", request.getId()).header("Authorization", testData.bearer(staff))
                        .contentType("application/json").content("{\"status\":\"ACCEPTED\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/requests/{id}/responses", request.getId()).header("Authorization", testData.bearer(donor.getUser())))
                .andExpect(status().isForbidden());
    }
}
