package com.redlink.backend.model.converter;

import com.redlink.backend.model.enums.BloodGroup;
import org.springframework.core.convert.converter.Converter;
import org.springframework.stereotype.Component;

/**
 * Reads a blood group from a URL, e.g. ?bloodGroup=O- or ?bloodGroup=O%2B, by its label (not "O_POS").
 * An unencoded "+" in a query string arrives as a space ("O "), so a space is read as "+".
 * Spring Boot registers Converter beans with Spring MVC automatically.
 */
@Component
public class BloodGroupParamConverter implements Converter<String, BloodGroup> {

    @Override
    public BloodGroup convert(String value) {
        return BloodGroup.fromLabel(value.stripLeading().replace(' ', '+'));
    }
}
