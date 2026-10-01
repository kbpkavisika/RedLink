package com.redlink.backend.support;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * The whole app against the redLink_test database: real security, services and PostgreSQL.
 * Gives the test a MockMvc and TestData to inject. Each test runs in a transaction that is
 * rolled back afterwards, so tests never see each other's rows.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(TestData.class)
public @interface IntegrationTest {
}
