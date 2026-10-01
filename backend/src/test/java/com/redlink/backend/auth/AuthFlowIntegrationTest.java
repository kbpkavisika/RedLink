package com.redlink.backend.auth;

import com.jayway.jsonpath.JsonPath;
import com.redlink.backend.model.User;
import com.redlink.backend.model.enums.HospitalStatus;
import com.redlink.backend.model.enums.Role;
import com.redlink.backend.repository.DonorRepository;
import com.redlink.backend.repository.UserRepository;
import com.redlink.backend.support.IntegrationTest;
import com.redlink.backend.support.TestData;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The real app end to end: HTTP → security → controller → service → PostgreSQL, with real JWTs.
 * Each test is rolled back afterwards (see @IntegrationTest).
 */
@IntegrationTest
class AuthFlowIntegrationTest {

    private static final String PASSWORD = TestData.PASSWORD;

    @Autowired private MockMvc mvc;
    @Autowired private TestData testData;
    @Autowired private UserRepository userRepository;
    @Autowired private DonorRepository donorRepository;

    private String email(String name) {
        return testData.email(name);
    }

    private String donorJson(String email) {
        return """
                {"fullName":"Kamal Perera","email":"%s","phone":"0771234567","password":"%s",
                 "bloodGroup":"O+","dateOfBirth":"1995-04-12","city":"Colombo"}""".formatted(email, PASSWORD);
    }

    private String hospitalJson(String registrationNo, String staffEmail) {
        return """
                {"hospital":{"name":"Nawaloka Hospital","registrationNo":"%s","address":"23 Deshamanya Rd",
                             "city":"Colombo","phone":"0115577111"},
                 "staff":{"fullName":"Dilini Perera","email":"%s","phone":"0712345678","password":"%s"}}"""
                .formatted(registrationNo, staffEmail, PASSWORD);
    }

    private ResultActions postJson(String url, String json) throws Exception {
        return mvc.perform(post(url).contentType("application/json").content(json));
    }

    private String login(String email, String password) throws Exception {
        String body = postJson("/api/auth/login", """
                {"email":"%s","password":"%s"}""".formatted(email, password))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.token");
    }

    private User saveUser(String name, Role role, boolean enabled) {
        User user = testData.user(name, role);
        user.setEnabled(enabled);
        return userRepository.saveAndFlush(user);
    }

    // ---------- Donor registration ----------

    @Test
    void registerDonorSignsInAndTidiesInput() throws Exception {
        String messy = """
                {"fullName":"  Kamal Perera ","email":"  %s ","phone":"077 123-4567",
                 "password":"%s","bloodGroup":"AB-","dateOfBirth":"1995-04-12","city":" Colombo "}"""
                .formatted(email("kamal").toUpperCase(), PASSWORD);

        String body = postJson("/api/auth/register/donor", messy)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.role").value("DONOR"))
                .andExpect(jsonPath("$.user.email").value(email("kamal")))
                .andExpect(jsonPath("$.user.fullName").value("Kamal Perera"))
                .andExpect(jsonPath("$.user.hospitalStatus").doesNotExist())
                .andReturn().getResponse().getContentAsString();

        User saved = userRepository.findByEmail(email("kamal")).orElseThrow();
        assertThat(saved.getPhone()).isEqualTo("0771234567");
        assertThat(saved.getPasswordHash()).startsWith("{bcrypt}").doesNotContain(PASSWORD);
        assertThat(donorRepository.findAll()).anySatisfy(donor -> {
            assertThat(donor.getUser().getId()).isEqualTo(saved.getId());
            assertThat(donor.getBloodGroup().getLabel()).isEqualTo("AB-");
            assertThat(donor.getCity()).isEqualTo("Colombo");
        });

        // the token from registration works straight away
        String token = JsonPath.read(body, "$.token");
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email("kamal")));
    }

    @Test
    void roleInRegistrationBodyIsIgnored() throws Exception {
        String sneaky = donorJson(email("sneaky")).replace("\"city\"", "\"role\":\"ADMIN\",\"city\"");

        postJson("/api/auth/register/donor", sneaky)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.role").value("DONOR"));
    }

    @Test
    void sameEmailInAnotherCaseIs409OnTheEmailField() throws Exception {
        postJson("/api/auth/register/donor", donorJson(email("kamal"))).andExpect(status().isCreated());

        postJson("/api/auth/register/donor", donorJson(email("kamal").toUpperCase()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(
                        "An account with this email already exists. Sign in instead, or use another email."))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("email"));
    }

    @Test
    void invalidDonorFieldsAreAllReported() throws Exception {
        postJson("/api/auth/register/donor", """
                {"fullName":"","email":"not-an-email","phone":"12345","password":"short",
                 "bloodGroup":"A+","dateOfBirth":"2030-01-01","city":""}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[*].field").value(containsInAnyOrder(
                        "fullName", "email", "phone", "password", "dateOfBirth", "city")));
    }

    @Test
    void underageDonorIsRejectedOnTheDateOfBirthField() throws Exception {
        String teen = donorJson(email("teen")).replace("1995-04-12", "2015-01-01");

        postJson("/api/auth/register/donor", teen)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Donors must be between 18 and 60 years old."))
                .andExpect(jsonPath("$.fieldErrors[0].field").value("dateOfBirth"));
    }

    // ---------- Hospital registration ----------

    @Test
    void registerHospitalCreatesPendingHospitalAndItsFirstStaffUser() throws Exception {
        String registrationNo = testData.unique("reg");

        postJson("/api/auth/register/hospital", hospitalJson(registrationNo, email("dilini")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.role").value("HOSPITAL_STAFF"))
                .andExpect(jsonPath("$.user.hospitalStatus").value("PENDING"))
                .andExpect(jsonPath("$.user.hospitalId").isNumber())
                .andExpect(jsonPath("$.user.hospitalName").value("Nawaloka Hospital"))
                .andExpect(jsonPath("$.user.hospitalRejectionReason").doesNotExist());

        User staff = userRepository.findByEmail(email("dilini")).orElseThrow();
        assertThat(staff.getHospital().getRegistrationNo()).isEqualTo(registrationNo.toUpperCase());
        assertThat(staff.getHospital().getStatus()).isEqualTo(HospitalStatus.PENDING);
    }

    @Test
    void staffOfARejectedHospitalSeeTheReasonInMe() throws Exception {
        User staff = testData.staff(testData.hospital(HospitalStatus.REJECTED));

        mvc.perform(get("/api/auth/me").header("Authorization", testData.bearer(staff)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hospitalStatus").value("REJECTED"))
                .andExpect(jsonPath("$.hospitalRejectionReason").value("Registration number could not be verified."));
    }

    @Test
    void duplicateRegistrationNumberIs409AndCreatesNoUser() throws Exception {
        String registrationNo = testData.unique("REG");
        postJson("/api/auth/register/hospital", hospitalJson(registrationNo, email("first")))
                .andExpect(status().isCreated());

        postJson("/api/auth/register/hospital", hospitalJson(registrationNo.toLowerCase(), email("second")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("hospital.registrationNo"));

        assertThat(userRepository.existsByEmail(email("second"))).isFalse();
    }

    @Test
    void invalidNestedHospitalFieldsUseSectionNames() throws Exception {
        postJson("/api/auth/register/hospital", """
                {"hospital":{"name":"","registrationNo":"R1","address":"a","city":"c","phone":"1"},
                 "staff":{"fullName":"s","email":"bad","phone":"0712345678","password":"%s"}}""".formatted(PASSWORD))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[*].field").value(containsInAnyOrder(
                        "hospital.name", "hospital.phone", "staff.email")));
    }

    // ---------- Login and /me ----------

    @Test
    void loginReturnsAWorkingTokenAndTheUser() throws Exception {
        saveUser("admin",Role.ADMIN, true);

        String body = postJson("/api/auth/login", """
                {"email":"  %s ","password":"%s"}""".formatted(email("admin").toUpperCase(), PASSWORD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.role").value("ADMIN"))
                .andExpect(jsonPath("$.user.email").value(email("admin")))
                .andReturn().getResponse().getContentAsString();

        String token = JsonPath.read(body, "$.token");
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }

    @Test
    void tokenLasts12HoursOr7DaysWithRememberMe() throws Exception {
        saveUser("kamal",Role.DONOR, true);
        String login = """
                {"email":"%s","password":"%s","rememberMe":%s}""";

        String normal = postJson("/api/auth/login", login.formatted(email("kamal"), PASSWORD, "false"))
                .andReturn().getResponse().getContentAsString();
        String remembered = postJson("/api/auth/login", login.formatted(email("kamal"), PASSWORD, "true"))
                .andReturn().getResponse().getContentAsString();

        Duration normalLife = Duration.between(Instant.now(), Instant.parse(JsonPath.read(normal, "$.expiresAt")));
        Duration rememberedLife = Duration.between(Instant.now(), Instant.parse(JsonPath.read(remembered, "$.expiresAt")));
        assertThat(normalLife).isBetween(Duration.ofHours(11), Duration.ofHours(12));
        assertThat(rememberedLife).isBetween(Duration.ofDays(7).minusHours(1), Duration.ofDays(7));
    }

    @Test
    void wrongPasswordAndUnknownEmailGetTheSameAnswer() throws Exception {
        saveUser("kamal",Role.DONOR, true);

        for (String email : new String[]{email("kamal"), email("nobody")}) {
            postJson("/api/auth/login", """
                    {"email":"%s","password":"wrong-password"}""".formatted(email))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value("Email or password is incorrect."));
        }
    }

    @Test
    void disabledAccountIsOnlyRevealedWithTheRightPassword() throws Exception {
        saveUser("blocked",Role.DONOR, false);
        String login = """
                {"email":"%s","password":"%s"}""";

        postJson("/api/auth/login", login.formatted(email("blocked"), "wrong-password"))
                .andExpect(status().isUnauthorized());
        postJson("/api/auth/login", login.formatted(email("blocked"), PASSWORD))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("This account is disabled. Contact admin@redlink.lk for help."));
    }

    @Test
    void missingLoginFieldIsA400() throws Exception {
        postJson("/api/auth/login", """
                {"email":"someone@test.redlink.lk"}""")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("password"));
    }

    // ---------- Change password ----------

    @Test
    void changePasswordFlow() throws Exception {
        User user = saveUser("admin",Role.ADMIN, true);
        user.setMustChangePassword(true);
        String token = login(email("admin"), PASSWORD);
        String change = """
                {"currentPassword":"%s","newPassword":"%s"}""";

        mvc.perform(patch("/api/auth/me/password").header("Authorization", "Bearer " + token)
                        .contentType("application/json").content(change.formatted("wrong-password", "Brand-New-Pass2")))
                .andExpect(status().isBadRequest()) // not 401: that would sign the user out
                .andExpect(jsonPath("$.fieldErrors[0].field").value("currentPassword"));

        mvc.perform(patch("/api/auth/me/password").header("Authorization", "Bearer " + token)
                        .contentType("application/json").content(change.formatted(PASSWORD, PASSWORD)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("newPassword"));

        mvc.perform(patch("/api/auth/me/password").header("Authorization", "Bearer " + token)
                        .contentType("application/json").content(change.formatted(PASSWORD, "Brand-New-Pass2")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mustChangePassword").value(false));

        postJson("/api/auth/login", """
                {"email":"%s","password":"%s"}""".formatted(email("admin"), PASSWORD))
                .andExpect(status().isUnauthorized());
        login(email("admin"), "Brand-New-Pass2");
    }

    // ---------- Security rules with real tokens ----------

    @Test
    void rolesDecideWhatATokenCanReach() throws Exception {
        saveUser("admin",Role.ADMIN, true);
        saveUser("donor",Role.DONOR, true);

        mvc.perform(get("/api/donors").header("Authorization", "Bearer " + login(email("admin"), PASSWORD)))
                .andExpect(status().isOk());
        mvc.perform(get("/api/donors").header("Authorization", "Bearer " + login(email("donor"), PASSWORD)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You don't have access to this."));
    }

    @Test
    void protectedEndpointsNeedAValidToken() throws Exception {
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());

        saveUser("donor",Role.DONOR, true);
        String token = login(email("donor"), PASSWORD);
        String tampered = token.substring(0, token.length() - 4) + "AAAA";
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + tampered))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void disablingAnAccountStopsItsExistingToken() throws Exception {
        User user = saveUser("donor",Role.DONOR, true);
        String token = login(email("donor"), PASSWORD);

        user.setEnabled(false);
        userRepository.flush();

        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }
}
