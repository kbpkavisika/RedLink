package com.redlink.backend.config;

import com.redlink.backend.model.enums.Urgency;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// notified = min(units × urgency multiplier, 25, matches), with the defaults from application.properties
class MatchingPropertiesTest {

    private final MatchingProperties defaults =
            new MatchingProperties(new MatchingProperties.Multiplier(2, 3, 5, 8), 25);

    // The table in README "Matching engine", with plenty of matches
    @ParameterizedTest(name = "{1} unit(s) at {0} → {2}")
    @CsvSource({
            "LOW, 1, 2", "LOW, 2, 4", "LOW, 4, 8",
            "MEDIUM, 1, 3", "MEDIUM, 2, 6", "MEDIUM, 4, 12",
            "HIGH, 1, 5", "HIGH, 2, 10", "HIGH, 4, 20",
            "CRITICAL, 1, 8", "CRITICAL, 2, 16", "CRITICAL, 4, 25", // 32, capped at 25
    })
    void matchesTheReadmeTable(Urgency urgency, int units, int expected) {
        assertThat(defaults.notifiedCount(units, urgency, 1000)).isEqualTo(expected);
    }

    @Test
    void neverMoreThanTheMatchesThereAre() {
        assertThat(defaults.notifiedCount(4, Urgency.CRITICAL, 7)).isEqualTo(7);
        assertThat(defaults.notifiedCount(2, Urgency.HIGH, 0)).isZero();
    }

    @Test
    void missingOrNonPositiveSettingsStopTheApp() {
        assertThatThrownBy(() -> new MatchingProperties(null, 25))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("redlink.matching.multiplier");
        assertThatThrownBy(() -> new MatchingProperties.Multiplier(2, 0, 5, 8))
                .hasMessageContaining("redlink.matching.multiplier.medium");
        assertThatThrownBy(() -> new MatchingProperties(new MatchingProperties.Multiplier(2, 3, 5, 8), 0))
                .hasMessageContaining("redlink.matching.max-notified");
    }
}
