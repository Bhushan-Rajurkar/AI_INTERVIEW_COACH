package com.brr.ai_coach_interview.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

        String msg = authException.getMessage() != null ? authException.getMessage().replace("\"", "'") : "Unauthorized";
        String path = request.getServletPath() != null ? request.getServletPath() : "";

        String json = "{\"success\":false,\"status\":401,\"message\":\"Unauthorized access: " + msg + "\",\"path\":\"" + path + "\"}";
        response.getWriter().write(json);
    }
}
