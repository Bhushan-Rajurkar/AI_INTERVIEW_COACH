package com.brr.ai_coach_interview.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Slf4j
@Service
public class ResumeParserService {

    /**
     * Extracts plain text from an uploaded resume file (PDF or DOCX or TXT).
     */
    public String extractText(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Resume file cannot be empty");
        }

        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        log.info("Extracting text from resume: {}", filename);

        try {
            String extracted;
            if (filename.endsWith(".pdf")) {
                extracted = extractFromPdf(file);
            } else if (filename.endsWith(".docx")) {
                extracted = extractFromDocx(file);
            } else if (filename.endsWith(".txt") || filename.endsWith(".md")) {
                extracted = new String(file.getBytes(), StandardCharsets.UTF_8);
            } else {
                throw new IllegalArgumentException("Unsupported file format. Please upload a PDF (.pdf) or Word document (.docx).");
            }

            if (extracted == null || extracted.trim().isEmpty()) {
                throw new IllegalArgumentException("Could not extract any readable text from the uploaded resume.");
            }

            // Clean up and limit to reasonable size (e.g. 15,000 characters)
            String cleaned = extracted.replaceAll("\\r\\n|\\r", "\n").replaceAll("\\n{3,}", "\n\n").trim();
            if (cleaned.length() > 15000) {
                cleaned = cleaned.substring(0, 15000) + "\n...[truncated]";
            }

            log.info("Successfully extracted {} characters from {}", cleaned.length(), filename);
            return cleaned;

        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to parse resume: {}", filename, e);
            throw new RuntimeException("Failed to read resume content: " + e.getMessage(), e);
        }
    }

    private String extractFromPdf(MultipartFile file) throws Exception {
        try (InputStream is = file.getInputStream();
             PDDocument document = PDDocument.load(is)) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            return stripper.getText(document);
        }
    }

    private String extractFromDocx(MultipartFile file) throws Exception {
        try (InputStream is = file.getInputStream();
             XWPFDocument doc = new XWPFDocument(is);
             XWPFWordExtractor extractor = new XWPFWordExtractor(doc)) {
            return extractor.getText();
        }
    }
}

