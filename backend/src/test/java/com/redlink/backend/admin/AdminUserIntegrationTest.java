package com.redlink.backend.admin;

import com.redlink.backend.model.Hospital;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.model.enums.Role;
import com.redlink.backend.repository.UserRepository;
import com.redlink.backend.support.IntegrationTest;
import com.redlink.backend.support.TestData;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// A5 and decisions 3 and 5 through the whole app: search users, add staff, set a temporary password
@IntegrationTest
class AdminUserIntegrationTest {

    private static final String TEMPORARY = "Temp-Pass-2026";

    @Autowired private MockMvc mvc;
    @Autowired private TestData testData;
    @Autowired private UserRepository userRepository;

    private User admin;
    private Hospital approved;

    @BeforeEach
    void setUp() {
        admin = testData.admin();
        approved = testData.hospital(HospitalStatus.APPROVED);
    }

    private ResultActions addStaff(String json) throws Exception {
        return mvc.perform(post("/api/admin/users").header("Authorization", testData.bearer(admin))
                .contentType("application/json").content(json));
    }

    private String staffJson(Long hospitalId, String email) {
        return """
                {"hospitalId":%d,"fullName":" Nuwan Silva ","email":" %s ","phone":"071 234-5678",
                 "temporaryPassword":"%s"}""".formatted(hospitalId, email, TEMPORARY);
    }

    private ResultActions login(String email, String password) throws Exception {
        return mvc.perform(post("/api/auth/login").contentType("application/json").content("""
                {"email":"%s","password":"%s"}""".formatted(email, password)));
    }

    // ---------- A5: list and search ----------

    @Test
    void searchMatchesPartOfTheNameOrEmailIgnoringCase() throws Exception {
        User kamal = testData.user("kamal", Role.DONOR); // full name "Test kamal"
        User other = testData.user("nimali", Role.DONOR);

        mvc.perform(get("/api/admin/users").param("q", "  KAMAL ").header("Authorization", testData.bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id").value(hasItem(kamal.getId().intValue())))
                .andExpect(jsonPath("$[*].id").value(not(hasItem(other.getId().intValue()))));

        // by email: the run-unique part of TestData's emails
        mvc.perform(get("/api/admin/users").param("q", other.getEmail().toUpperCase()).header("Authorization", testData.bearer(admin)))
                .andExpect(jsonPath("$[*].id").value(containsInAnyOrder(other.getId().intValue())));
    }

    @Test
    void roleFilterAndHospitalNameForStaff() throws Exception {
        User staff = testData.staff(approved);

        mvc.perform(get("/api/admin/users").param("role", "HOSPITAL_STAFF").header("Authorization", testData.bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].role").value(everyItem(is("HOSPITAL_STAFF"))))
                .andExpect(jsonPath("$[?(@.id == %d)].hospitalName".formatted(staff.getId())).value(approved.getName()))
                .andExpect(jsonPath("$[*].passwordHash").doesNotExist());
    }

    @Test
    void percentAndUnderscoreAreMatchedLiterally() throws Exception {
        testData.user("kamal", Role.DONOR);

        mvc.perform(get("/api/admin/users").param("q", "%").header("Authorization", testData.bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].email").value(not(hasItem(testData.email("kamal")))));
    }

    @Test
    void unknownRoleFilterIs400() throws Exception {
        mvc.perform(get("/api/admin/users").param("role", "SUPERUSER").header("Authorization", testData.bearer(admin)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("role"));
    }

    // ---------- Decision 3: add staff ----------

    @Test
    void addedStaffSignInWithTheTemporaryPasswordAndMustChangeIt() throws Exception {
        String email = testData.email("nuwan");

        addStaff(staffJson(approved.getId(), email.toUpperCase()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("HOSPITAL_STAFF"))
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.fullName").value("Nuwan Silva"))
                .andExpect(jsonPath("$.phone").value("0712345678"))
                .andExpect(jsonPath("$.hospitalId").value(approved.getId()))
                .andExpect(jsonPath("$.mustChangePassword").value(true))
                .andExpect(jsonPath("$.createdAt").isNotEmpty());

        login(email, TEMPORARY)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.mustChangePassword").value(true))
                .andExpect(jsonPath("$.user.hospitalStatus").value("APPROVED"));
    }

    @Test
    void staffCanOnlyBeAddedToAnApprovedHospital() throws Exception {
        Hospital pending = testData.hospital(HospitalStatus.PENDING);

        addStaff(staffJson(pending.getId(), testData.email("nuwan")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("hospitalId"));
        addStaff(staffJson(Long.MAX_VALUE, testData.email("nuwan")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("hospitalId"));

        assertThat(userRepository.existsByEmail(testData.email("nuwan"))).isFalse();
    }

    @Test
    void existingEmailIs409OnTheEmailField() throws Exception {
        User donor = testData.user("kamal", Role.DONOR);

        addStaff(staffJson(approved.getId(), donor.getEmail()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("email"));
    }

    @Test
    void invalidStaffFieldsAreAllReported() throws Exception {
        addStaff("""
                {"fullName":"","email":"nope","phone":"123","temporaryPassword":"short"}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[*].field").value(containsInAnyOrder(
                        "hospitalId", "fullName", "email", "phone", "temporaryPassword")));
    }

    // ---------- Admins can't change anyone's password ----------

    @Test
    void adminsCantChangeAnotherUsersPassword() throws Exception {
        User donor = testData.user("kamal", Role.DONOR);

        mvc.perform(patch("/api/admin/users/{id}/password", donor.getId())
                        .header("Authorization", testData.bearer(admin))
                        .contentType("application/json").content("""
                                {"temporaryPassword":"%s"}""".formatted(TEMPORARY)))
                .andExpect(status().isNotFound());

        // The donor's own password still works, and they aren't forced to change it
        login(donor.getEmail(), TestData.PASSWORD)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.mustChangePassword").value(false));
    }

    @Test
    void userListNeverIncludesPasswords() throws Exception {
        testData.user("kamal", Role.DONOR);

        mvc.perform(get("/api/admin/users").header("Authorization", testData.bearer(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].password").doesNotExist())
                .andExpect(jsonPath("$[*].passwordHash").doesNotExist());
    }
    @Test
    void onlyAdminsManageUsers() throws Exception {
        User staff = testData.staff(approved);

        mvc.perform(get("/api/admin/users").header("Authorization", testData.bearer(staff)))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/users").header("Authorization", testData.bearer(staff))
                        .contentType("application/json").content(staffJson(approved.getId(), testData.email("sneaky"))))
                .andExpect(status().isForbidden());

        assertThat(userRepository.existsByEmail(testData.email("sneaky"))).isFalse();
    }
}
