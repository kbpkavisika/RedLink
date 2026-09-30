package com.redlink.backend.model.enums;

import com.redlink.backend.model.converter.BloodGroupConverter;
import org.junit.jupiter.api.Test;

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
}
