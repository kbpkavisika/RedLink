package com.redlink.backend.model.converter;

import com.redlink.backend.model.enums.BloodGroup;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Stores BloodGroup as its label ("A+") instead of the Java name ("A_POS"). */
@Converter(autoApply = true)
public class BloodGroupConverter implements AttributeConverter<BloodGroup, String> {

    @Override
    public String convertToDatabaseColumn(BloodGroup group) {
        return group == null ? null : group.getLabel();
    }

    @Override
    public BloodGroup convertToEntityAttribute(String label) {
        return label == null ? null : BloodGroup.fromLabel(label);
    }
}
