package com.redlink.backend.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Java names can't contain "+" or "-", so the constants are A_POS, A_NEG, ...
 * Everywhere outside Java (database, JSON, frontend) the label is used: "A+", "A-", ...
 */
public enum BloodGroup {
    A_POS("A+"),
    A_NEG("A-"),
    B_POS("B+"),
    B_NEG("B-"),
    AB_POS("AB+"),
    AB_NEG("AB-"),
    O_POS("O+"),
    O_NEG("O-");

    private final String label;

    BloodGroup(String label) {
        this.label = label;
    }

    @JsonValue
    public String getLabel() {
        return label;
    }

    /** Accepts "A+", "a+" and the display minus sign "A−" (U+2212). */
    @JsonCreator
    public static BloodGroup fromLabel(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().toUpperCase().replace('−', '-');
        for (BloodGroup group : values()) {
            if (group.label.equals(normalized)) {
                return group;
            }
        }
        throw new IllegalArgumentException("Unknown blood group: " + value);
    }
}
