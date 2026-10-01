package com.redlink.backend.model.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.EnumSet;
import java.util.Set;

/**
 * Java names can't contain "+" or "-", so the constants are A_POS, A_NEG, ...
 * Everywhere outside Java (database, JSON, frontend) the label is used: "A+", "A-", ...
 */
public enum BloodGroup {
    //       label  A antigen  B antigen  Rh(D)
    A_POS("A+", true, false, true),
    A_NEG("A-", true, false, false),
    B_POS("B+", false, true, true),
    B_NEG("B-", false, true, false),
    AB_POS("AB+", true, true, true),
    AB_NEG("AB-", true, true, false),
    O_POS("O+", false, false, true),
    O_NEG("O-", false, false, false);

    private final String label;
    private final boolean hasA;
    private final boolean hasB;
    private final boolean rhPositive;

    BloodGroup(String label, boolean hasA, boolean hasB, boolean rhPositive) {
        this.label = label;
        this.hasA = hasA;
        this.hasB = hasB;
        this.rhPositive = rhPositive;
    }

    /**
     * Red cell compatibility: a donor can give to a recipient when the donor's cells carry
     * no antigen (A, B or Rh) that the recipient lacks. So O- gives to everyone and AB+ receives from everyone.
     */
    public boolean canDonateTo(BloodGroup recipient) {
        return (!hasA || recipient.hasA)
                && (!hasB || recipient.hasB)
                && (!rhPositive || recipient.rhPositive);
    }

    // The donor groups this recipient can receive from, e.g. A+ → {A+, A-, O+, O-}
    public Set<BloodGroup> compatibleDonors() {
        Set<BloodGroup> donors = EnumSet.noneOf(BloodGroup.class);
        for (BloodGroup donor : values()) {
            if (donor.canDonateTo(this)) {
                donors.add(donor);
            }
        }
        return donors;
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
