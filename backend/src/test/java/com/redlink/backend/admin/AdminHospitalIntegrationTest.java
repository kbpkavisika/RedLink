package com.redlink.backend.admin;

import com.redlink.backend.model.Hospital;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.repository.HospitalRepository;
import com.redlink.backend.support.IntegrationTest;
import com.redlink.backend.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// A1–A4 through the whole app: the admin's queue, hospital details, approve and reject
@IntegrationTest
class AdminHospitalIntegrationTest {

    @Autowired private MockMvc mvc;
    @Autowired private TestData testData;
    @Autowired private HospitalRepository hospitalRepository;

    private User admin;
    private Hospital pending;
    private User pendingStaff;

    @BeforeEach
    void setUp() {
        admin = testData.admin();
        pending = testData.hospital(HospitalStatus.PENDING);
        pendingStaff = testData.staff(pending);
    }

    private ResultActions decide(Long hospitalId, String json) throws Exception {
        return mvc.perform(patch("/api/admin/hospitals/{id}/status", hospitalId)
                .header("Authorization", testData.bearer(admin))
                .contentType("application/json").content(json));
    }

    // ---------- A1: the queue ----------

    @Test
    void pendingQueueListsPendingHospitalsOnly() throws Exception {
        Hospital approved = testData.hospital(HospitalStatus.APPROVED);

        mvc.perform(get("/api/admin/hospitals").param("status", "PENDING").header("Authorization", testData.bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id").value(hasItem(pending.getId().intValue())))
                .andExpect(jsonPath("$[*].id").value(not(hasItem(approved.getId().intValue()))))
                .andExpect(jsonPath("$[*].status").value(not(hasItem("APPROVED"))));
    }

    @Test
    void withoutAStatusEveryHospitalIsListed() throws Exception {
        Hospital rejected = testData.hospital(HospitalStatus.REJECTED);

        mvc.perform(get("/api/admin/hospitals").header("Authorization", testData.bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id").value(hasItem(pending.getId().intValue())))
                .andExpect(jsonPath("$[*].id").value(hasItem(rejected.getId().intValue())));
    }

    @Test
    void unknownStatusFilterIs400() throws Exception {
        mvc.perform(get("/api/admin/hospitals").param("status", "MAYBE").header("Authorization", testData.bearer(admin)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("status"));
    }

    // ---------- A2: details ----------

    @Test
    void detailShowsTheHospitalAndItsStaff() throws Exception {
        mvc.perform(get("/api/admin/hospitals/{id}", pending.getId()).header("Authorization", testData.bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.registrationNo").value(pending.getRegistrationNo()))
                .andExpect(jsonPath("$.address").value("1 Test Rd"))
                .andExpect(jsonPath("$.phone").value("0115577111"))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.reviewedBy").doesNotExist())
                .andExpect(jsonPath("$.staff[0].email").value(pendingStaff.getEmail()));
    }

    @Test
    void unknownHospitalIs404() throws Exception {
        mvc.perform(get("/api/admin/hospitals/{id}", Long.MAX_VALUE).header("Authorization", testData.bearer(admin)))
                .andExpect(status().isNotFound());
    }

    // ---------- A3: approve ----------

    @Test
    void approvingRecordsWhoAndWhenAndUnblocksTheStaff() throws Exception {
        decide(pending.getId(), """
                {"status":"APPROVED","reason":"ignored when approving"}""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.reviewedBy").value(admin.getFullName()))
                .andExpect(jsonPath("$.reviewedAt").isNotEmpty())
                .andExpect(jsonPath("$.rejectionReason").doesNotExist());

        Hospital saved = hospitalRepository.findById(pending.getId()).orElseThrow();
        assertThat(saved.getApprovedBy().getId()).isEqualTo(admin.getId());
        assertThat(saved.getApprovedAt()).isNotNull();

        // The staff member's next /me shows the approval, which unlocks posting in the frontend
        mvc.perform(get("/api/auth/me").header("Authorization", testData.bearer(pendingStaff)))
                .andExpect(jsonPath("$.hospitalStatus").value("APPROVED"));
    }

    // ---------- A4: reject ----------

    @Test
    void rejectingNeedsAReason() throws Exception {
        decide(pending.getId(), """
                {"status":"REJECTED","reason":"   "}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Rejecting a hospital requires a reason."))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("reason"));

        assertThat(hospitalRepository.findById(pending.getId()).orElseThrow().getStatus())
                .isEqualTo(HospitalStatus.PENDING);
    }

    @Test
    void rejectingStoresTheReasonForTheStaff() throws Exception {
        decide(pending.getId(), """
                {"status":"REJECTED","reason":"  Registration number not found in the MoH register. "}""")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.rejectionReason").value("Registration number not found in the MoH register."));

        mvc.perform(get("/api/auth/me").header("Authorization", testData.bearer(pendingStaff)))
                .andExpect(jsonPath("$.hospitalRejectionReason").value("Registration number not found in the MoH register."));
    }

    @Test
    void reasonLongerThan500CharactersIs400() throws Exception {
        decide(pending.getId(), """
                {"status":"REJECTED","reason":"%s"}""".formatted("x".repeat(501)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("reason"));
    }

    // ---------- Rules ----------

    @Test
    void aDecisionIsFinal() throws Exception {
        decide(pending.getId(), """
                {"status":"APPROVED"}""").andExpect(status().isOk());

        decide(pending.getId(), """
                {"status":"REJECTED","reason":"Changed my mind"}""")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("This hospital has already been approved. A decision can't be changed."));
    }

    @Test
    void pendingIsNotADecision() throws Exception {
        decide(pending.getId(), """
                {"status":"PENDING"}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("status"));
    }

    @Test
    void missingStatusIs400() throws Exception {
        decide(pending.getId(), "{}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("status"));
    }

    @Test
    void onlyAdminsCanReviewHospitals() throws Exception {
        User approvedStaff = testData.staff(testData.hospital(HospitalStatus.APPROVED));

        mvc.perform(get("/api/admin/hospitals").header("Authorization", testData.bearer(approvedStaff)))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/admin/hospitals/{id}/status", pending.getId())
                        .header("Authorization", testData.bearer(pendingStaff))
                        .contentType("application/json").content("""
                                {"status":"APPROVED"}"""))
                .andExpect(status().isForbidden());

        assertThat(hospitalRepository.findById(pending.getId()).orElseThrow().getStatus())
                .isEqualTo(HospitalStatus.PENDING);
    }
}
