import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

interface ExtractedData {
  student_name: string;
  roll_no: string;
  course_name: string;
  grade: string;
  certificate_id: string;
  institution_name: string;
  issued_date: string;
}

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is not set");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File;

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Validate image file
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type. Supported types: ${allowedTypes.join(", ")}`,
        },
        { status: 400 },
      );
    }

    if (image.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB` },
        { status: 400 },
      );
    }

    // Convert image to base64
    const bytes = await image.arrayBuffer();
    const base64Image = Buffer.from(bytes).toString("base64");

    // Initialize the model with configuration
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.1, // Lower temperature for more consistent extraction
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1000,
      },
    });

    // Create the prompt for certificate data extraction
    const prompt = `
    You are an expert OCR system specialized in extracting data from educational certificates.
    Analyze this certificate image and extract the following information in JSON format:

    Required fields:
    - student_name: Full name of the student
    - roll_no: Student's roll number or ID number
    - course_name: Name of the course/program
    - grade: Grade or result (e.g., "A+", "First Class", "Pass", etc.)
    - certificate_id: Certificate ID/number (usually a UUID or unique identifier)
    - institution_name: Name of the educational institution
    - issued_date: Date when certificate was issued (format: YYYY-MM-DD)

    Important guidelines:
    1. Return ONLY valid JSON format
    2. If any field cannot be found, use empty string ""
    3. For dates, convert to YYYY-MM-DD format
    4. Be precise and extract exact text as it appears
    5. For certificate_id, look for unique identifiers, serial numbers, or certificate numbers
    6. Institution name should be the full official name

    Return the data in this exact JSON structure:
    {
      "student_name": "",
      "roll_no": "",
      "course_name": "",
      "grade": "",
      "certificate_id": "",
      "institution_name": "",
      "issued_date": ""
    }
    `;

    // Generate content with the image
    const result = await Promise.race([
      model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Image,
            mimeType: image.type,
          },
        },
      ]),
      new Promise<never>(
        (_, reject) =>
          setTimeout(() => reject(new Error("OCR request timeout")), 30000), // 30 second timeout
      ),
    ]);

    const response = await (
      result as Awaited<ReturnType<typeof model.generateContent>>
    ).response;
    const text = response.text();

    console.log("Gemini API response:", text); // Debug logging

    // Extract JSON from the response with improved parsing
    let extractedData: ExtractedData | null = null;
    try {
      // Try to parse the response as JSON directly
      extractedData = JSON.parse(text) as ExtractedData;
    } catch (parseError) {
      console.log(
        "Direct JSON parsing failed, trying extraction...",
        parseError,
      );

      // Try multiple patterns to extract JSON
      const jsonPatterns = [
        /\{[\s\S]*?\}/g, // Basic JSON pattern
        /```json\s*(\{[\s\S]*?\})\s*```/g, // JSON in code blocks
        /```\s*(\{[\s\S]*?\})\s*```/g, // JSON in generic code blocks
      ];

      let jsonFound = false;
      for (const pattern of jsonPatterns) {
        const matches = [...text.matchAll(pattern)];
        for (const match of matches) {
          try {
            const jsonText = match[1] || match[0];
            extractedData = JSON.parse(jsonText) as ExtractedData;
            jsonFound = true;
            console.log("Successfully parsed JSON with pattern:", pattern);
            break;
          } catch {
            console.log("Failed to parse match:", match[0]);
            continue;
          }
        }
        if (jsonFound) break;
      }

      if (!jsonFound || !extractedData) {
        console.error("Failed to extract JSON from response:", text);
        throw new Error(
          `Failed to extract valid JSON from OCR response. Raw response: ${text.substring(0, 200)}...`,
        );
      }
    }

    if (!extractedData) {
      throw new Error("Failed to extract data from OCR response");
    }

    // Validate required fields exist
    const requiredFields: (keyof ExtractedData)[] = [
      "student_name",
      "roll_no",
      "course_name",
      "grade",
      "certificate_id",
      "institution_name",
      "issued_date",
    ];

    // Ensure all required fields exist, set to empty string if missing
    for (const field of requiredFields) {
      if (!(field in extractedData)) {
        extractedData[field] = "";
      }
    }

    // Clean and validate the data
    const cleanedData: ExtractedData = {
      student_name: String(extractedData.student_name || "")
        .trim()
        .replace(/\s+/g, " "),
      roll_no: String(extractedData.roll_no || "")
        .trim()
        .replace(/\s+/g, " "),
      course_name: String(extractedData.course_name || "")
        .trim()
        .replace(/\s+/g, " "),
      grade: String(extractedData.grade || "")
        .trim()
        .replace(/\s+/g, " "),
      certificate_id: String(extractedData.certificate_id || "")
        .trim()
        .replace(/\s+/g, " "),
      institution_name: String(extractedData.institution_name || "")
        .trim()
        .replace(/\s+/g, " "),
      issued_date: String(extractedData.issued_date || "")
        .trim()
        .replace(/\s+/g, " "),
    };
    extractedData = cleanedData;

    // Validate and normalize date format
    if (extractedData.issued_date && extractedData.issued_date !== "") {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(extractedData.issued_date)) {
        // Try to parse and reformat the date
        try {
          // Handle various date formats
          let dateStr = extractedData.issued_date;

          // Remove ordinal suffixes (1st, 2nd, 3rd, 4th, etc.)
          dateStr = dateStr.replace(/(\d+)(st|nd|rd|th)/g, "$1");

          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            extractedData.issued_date = parsedDate.toISOString().split("T")[0];
          } else {
            console.warn("Could not parse date:", extractedData.issued_date);
            extractedData.issued_date = "";
          }
        } catch (dateError) {
          console.warn(
            "Date parsing error:",
            dateError,
            "for date:",
            extractedData.issued_date,
          );
          extractedData.issued_date = "";
        }
      }
    }

    // Log extracted data for debugging
    console.log("Successfully extracted data:", extractedData);

    return NextResponse.json(extractedData);
  } catch (error) {
    console.error("OCR extraction error:", error);

    // Provide more specific error messages
    let errorMessage = "Failed to extract data from image";
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        errorMessage =
          "OCR request timed out. Please try again with a clearer image.";
        statusCode = 408;
      } else if (
        error.message.includes("quota") ||
        error.message.includes("limit")
      ) {
        errorMessage = "API quota exceeded. Please try again later.";
        statusCode = 429;
      } else if (error.message.includes("API key")) {
        errorMessage = "API configuration error";
        statusCode = 500;
      } else if (error.message.includes("JSON")) {
        errorMessage =
          "Failed to parse certificate data from image. Please ensure the image is clear and contains a valid certificate.";
        statusCode = 422;
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Unknown error"
            : undefined,
      },
      { status: statusCode },
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST to upload an image." },
    { status: 405 },
  );
}
