package com.redlink.backend.model.enums;

import com.redlink.backend.model.converter.BloodGroupConverter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BloodGroupTest {

    private final BloodGroupConverter converter = new BloodGroupConverter();

    @Test
    void everyGroupRoundTripsThroughItsLabel() {
        for (BloodGroup group : BloodGroup.values()) {
            String label = converter.convertToDatabaseColumn(group);
            assertThat(converter.convertToEntityAttribute(label)).isEqualTo(group);
        }
    }

    @Test
    void storesLabelNotJavaName() {
        assertThat(converter.convertToDatabaseColumn(BloodGroup.AB_NEG)).isEqualTo("AB-");
    }

    @Test
    void acceptsLowercaseAndDisplayMinusSign() {
        assertThat(BloodGroup.fromLabel("o+")).isEqualTo(BloodGroup.O_POS);
        assertThat(BloodGroup.fromLabel("AB−")).isEqualTo(BloodGroup.AB_NEG);
    }

    @Test
    void rejectsUnknownGroup() {
        assertThatThrownBy(() -> BloodGroup.fromLabel("C+"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void nullStaysNull() {
        assertThat(converter.convertToDatabaseColumn(null)).isNull();
        assertThat(converter.convertToEntityAttribute(null)).isNull();
    }

    // The red cell compatibility table from the README, written out by hand so it checks the antigen logic
    @ParameterizedTest(name = "{0} receives from {1}")
    @CsvSource(delimiter = '|', value = {
            "O-  | O-",
            "O+  | O+ O-",
            "A-  | A- O-",
            "A+  | A+ A- O+ O-",
            "B-  | B- O-",
            "B+  | B+ B- O+ O-",
            "AB- | AB- A- B- O-",
            "AB+ | AB+ AB- A+ A- B+ B- O+ O-",
    })
    void compatibleDonorsMatchTheTable(String recipient, String donors) {
        Set<BloodGroup> expected = Arrays.stream(donors.split(" "))
                .map(BloodGroup::fromLabel)
                .collect(Collectors.toSet());

        assertThat(BloodGroup.fromLabel(recipient).compatibleDonors())
                .containsExactlyInAnyOrderElementsOf(expected);
    }

    @Test
    void canDonateToAgreesWithCompatibleDonors() {
        for (BloodGroup recipient : BloodGroup.values()) {
            for (BloodGroup donor : BloodGroup.values()) {
                assertThat(donor.canDonateTo(recipient))
                        .as("%s → %s", donor.getLabel(), recipient.getLabel())
                        .isEqualTo(recipient.compatibleDonors().contains(donor));
            }
        }
    }

    @Test
    void universalDonorAndRecipient() {
        assertThat(BloodGroup.O_NEG.compatibleDonors()).containsExactly(BloodGroup.O_NEG);
        assertThat(BloodGroup.AB_POS.compatibleDonors()).containsExactlyInAnyOrder(BloodGroup.values());
        for (BloodGroup recipient : BloodGroup.values()) {
            assertThat(BloodGroup.O_NEG.canDonateTo(recipient)).isTrue();
        }
    }

    @Test
    void rhPositiveNeverGivesToRhNegative() {
        assertThat(BloodGroup.O_POS.canDonateTo(BloodGroup.AB_NEG)).isFalse();
        assertThat(BloodGroup.A_POS.canDonateTo(BloodGroup.A_NEG)).isFalse();
    }
}
