package com.redlink.backend.exception;

import com.redlink.backend.model.enums.BloodGroup;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.*;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Checks every error case of GlobalExceptionHandler through a controller that only exists in tests,
 * so the handler is proven before real endpoints with request bodies rely on it.
 */
@WebMvcTest(controllers = GlobalExceptionHandlerTest.TestController.class)
@Import(GlobalExceptionHandlerTest.TestController.class)
class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mvc;

    record SampleRequest(@NotBlank String name, @NotNull @Positive Integer units, BloodGroup bloodGroup) {
    }

    @RestController
    @RequestMapping("/test")
    static class TestController {

        @PostMapping("/validate")
        SampleRequest validate(@Valid @RequestBody SampleRequest body) {
            return body;
        }

        @GetMapping("/conflict")
        void conflict() {
            throw new ConflictException("You've already responded to this request.");
        }

        @GetMapping("/forbidden")
        void forbidden() {
            throw new ForbiddenException("Posting unlocks after an admin approves your hospital.");
        }

        @GetMapping("/bad-request")
        void badRequest() {
            throw new BadRequestException("Rejecting a hospital requires a reason.");
        }

        @GetMapping("/integrity")
        void integrity() {
            throw new DataIntegrityViolationException("duplicate key value violates unique constraint \"uq_users_email\"");
        }

        @GetMapping("/boom")
        void boom() {
            throw new IllegalStateException("secret internal detail: SELECT * FROM users");
        }

        @GetMapping("/search")
        String search(@RequestParam String city) {
            return city;
        }
    }

    @Test
    void validBodyPasses() throws Exception {
        mvc.perform(post("/test/validate").contentType("application/json")
                        .content("{\"name\":\"Kamal\",\"units\":2,\"bloodGroup\":\"A+\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bloodGroup").value("A+"));
    }

    @Test
    void invalidFieldsAreListed() throws Exception {
        mvc.perform(post("/test/validate").contentType("application/json")
                        .content("{\"name\":\"  \",\"units\":0}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Some fields are invalid."))
                .andExpect(jsonPath("$.fieldErrors.length()").value(2))
                .andExpect(jsonPath("$.fieldErrors[*].field").value(containsInAnyOrder("name", "units")));
    }

    @Test
    void brokenJsonIs400() throws Exception {
        mvc.perform(post("/test/validate").contentType("application/json").content("{\"name\":"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("isn't valid JSON")));
    }

    @Test
    void unknownBloodGroupIs400() throws Exception {
        mvc.perform(post("/test/validate").contentType("application/json")
                        .content("{\"name\":\"Kamal\",\"units\":1,\"bloodGroup\":\"C+\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void wrongContentTypeIs415() throws Exception {
        mvc.perform(post("/test/validate").contentType("text/plain").content("hello"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.status").value(415));
    }

    @Test
    void conflictIs409WithOurMessage() throws Exception {
        mvc.perform(get("/test/conflict"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("You've already responded to this request."));
    }

    @Test
    void forbiddenIs403() throws Exception {
        mvc.perform(get("/test/forbidden"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Forbidden"));
    }

    @Test
    void badRequestIs400() throws Exception {
        mvc.perform(get("/test/bad-request"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Rejecting a hospital requires a reason."));
    }

    @Test
    void databaseConstraintIs409WithoutSqlDetails() throws Exception {
        mvc.perform(get("/test/integrity"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("This conflicts with existing data."))
                .andExpect(content().string(not(containsString("uq_users_email"))));
    }

    @Test
    void unexpectedErrorIs500AndHidesInternals() throws Exception {
        mvc.perform(get("/test/boom"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value(containsString("Please try again")))
                .andExpect(jsonPath("$.ref").exists())
                .andExpect(content().string(not(containsString("secret"))))
                .andExpect(content().string(not(containsString("IllegalStateException"))));
    }

    @Test
    void missingParameterIs400() throws Exception {
        mvc.perform(get("/test/search"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors[0].field").value("city"));
    }

    @Test
    void unknownUrlIs404() throws Exception {
        mvc.perform(get("/test/does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("There is no endpoint at this address."));
    }
}
