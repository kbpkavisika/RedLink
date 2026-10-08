package com.redlink.backend.config;

import com.redlink.backend.security.AccountStatusInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

// Spring MVC settings: the account check runs before every API controller
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AccountStatusInterceptor accountStatusInterceptor;

    public WebConfig(AccountStatusInterceptor accountStatusInterceptor) {
        this.accountStatusInterceptor = accountStatusInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(accountStatusInterceptor).addPathPatterns("/api/**");
    }
}
