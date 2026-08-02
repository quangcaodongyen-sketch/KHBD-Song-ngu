import express from "express";
import path from "path";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

const upload = multer({ storage: multer.memoryStorage() });

// Lazy initialized Gemini client helper
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function generateContentWithRetry(ai: GoogleGenAI, params: any, retries = 3, delayMs = 2000): Promise<any> {
  const modelsToTry = [params.model || "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-1.5-flash"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const isRateLimit = err?.status === 429 || err?.message?.includes("429") || err?.message?.includes("RESOURCE_EXHAUSTED");
        if (isRateLimit && attempt < retries - 1) {
          console.warn(`[Gemini API] Rate limit hit on ${model}, retrying in ${delayMs * (attempt + 1)}ms...`);
          await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        } else {
          // If not rate limit or max retries reached for this model, break and try fallback model
          break;
        }
      }
    }
  }

  throw lastError;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "AI LessonPlan Bilingual Pro" });
});

// Translation API endpoint
app.post("/api/translate", async (req, res) => {
  try {
    const { items, aiMode, alignmentMode, level, subject, tone, userApiKey } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Missing or invalid 'items' array." });
    }

    // Use custom API key if passed from client, else fall back to server env
    let ai: GoogleGenAI;
    const clientKey = userApiKey || req.headers["x-gemini-api-key"];
    if (clientKey && typeof clientKey === "string" && clientKey.trim().length > 10) {
      ai = new GoogleGenAI({
        apiKey: clientKey.trim(),
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });
    } else {
      ai = getGeminiClient();
    }

    let temperature = 0.2;
    if (aiMode === "fast") temperature = 0.4;
    if (aiMode === "precise") temperature = 0.1;

    const toneInstruction = tone === "simple"
      ? "Dùng từ vựng đơn giản, ngắn gọn, dễ hiểu cho học sinh."
      : tone === "formal"
      ? "Dùng văn phong hành chính - học thuật trang trọng, dùng cho báo cáo hoặc hội thảo."
      : "Dùng chuẩn thuật ngữ giáo án chuyên ngành sư phạm Bộ GD&ĐT / Công văn 5512.";

    const systemInstruction = `
Bạn là chuyên gia giáo dục Việt Nam, chuyên gia biên soạn giáo án chuẩn Bộ GD&ĐT, và chuyên gia dịch thuật học thuật Anh - Việt.
Nhiệm vụ của bạn là dịch các đoạn văn bản/bảng biểu/công thức từ giáo án tiếng Việt sang tiếng Anh theo CHUẨN THUẬT NGỮ GIÁO DỤC VIỆT NAM (Chương trình GDPT 2018, Công văn 5512, Thông tư Bộ GDĐT, Cambridge, CEFR).

PHONG CÁCH: ${toneInstruction}
CẤP HỌC: ${level || "Tất cả các cấp"} | MÔN HỌC: ${subject || "Môn học chung"}.

QUY TẮC DỊCH THUẬT RẤT QUAN TRỌNG:
1. TUYỆT ĐỐ KHÔNG LẶP LẠI VĂN BẢN TIẾNG VIỆT TRONG BẢN DỊCH TIẾNG ANH. Bản dịch tiếng Anh phải là 100% tiếng Anh thuần túy, không chèn bất kỳ từ tiếng Việt gốc nào ở cuối câu.
2. Với thuật ngữ giáo án chuẩn Công văn 5512:
   - Hoạt động: Activity
   - Mục tiêu: Objectives
   - Nội dung: Content
   - Sản phẩm: Expected Products / Products
   - Tổ chức thực hiện: Implementation / Organization & Execution
   - Chuyển giao nhiệm vụ: Task Assignment / Task Transfer
   - Thực hiện nhiệm vụ: Task Execution
   - Báo cáo, thảo luận: Presentation & Discussion / Reporting
   - Kết luận, nhận định: Conclusion & Assessment
   - Mở đầu / Khởi động: Warm-up / Introduction
   - Hình thành kiến thức mới: Knowledge Acquisition / New Knowledge Formation
   - Luyện tập: Practice
   - Vận dụng: Application
   - Phẩm chất: Qualities / Character Attributes
   - Năng lực chung: General Competencies
   - Năng lực đặc thù: Specific Competencies
3. KHÔNG TỰ Ý ĐẶT NỘI DUNG DỊCH TRONG NGOẶC ĐƠN (...). Chỉ dịch thẳng nội dung sang tiếng Anh.
4. GIỮ NGUYÊN 100% các công thức toán học (MathType/Equation), công thức hóa học, số liệu, hình vẽ, hình ảnh, ký hiệu khoa học hoặc mã giữ chỗ {{img_...}}. Không chỉnh sửa hay làm méo mó các ký hiệu này.
5. Đối với đề mục (ví dụ: 'I. MỤC TIÊU', '1. Về kiến thức'): Dịch thẳng sang tiếng Anh tương ứng ('I. OBJECTIVES', '1. Knowledge'), KHÔNG bọc ngoặc đơn và KHÔNG lặp lại tiếng Việt.
6. Trả về đúng định dạng JSON chứa mảng các chuỗi dịch tương ứng theo đúng thứ tự mảng đầu vào.
`;

    const prompt = `
Dịch danh sách các câu/đoạn sau từ giáo án tiếng Việt sang tiếng Anh.
MẢNG CẦN DỊCH:
${JSON.stringify(items, null, 2)}

QUY TẮC PHẢN HỒI:
- Nếu mảng đầu vào dạng chuỗi ["câu 1", "câu 2"], trả về JSON: {"translations": ["dịch 1", "dịch 2"]}
- Nếu mảng đầu vào dạng đối tượng [{"id": "...", "text": "..."}], trả về mảng JSON các đối tượng: [{"id": "...", "text": "bản dịch tiếng Anh"}]
- Đảm bảo giữ nguyên 100% các mã ID và số lượng phần tử.
`;

    const response = await generateContentWithRetry(ai, {
      model: req.body.model || "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text || "{}";
    let jsonResult;
    try {
      jsonResult = JSON.parse(responseText.trim().replace(/^```json\s*/, '').replace(/\s*```$/, ''));
    } catch (e) {
      jsonResult = {};
    }

    if (Array.isArray(jsonResult)) {
      res.json({ items: jsonResult, translations: jsonResult.map((i: any) => i.text || i) });
    } else {
      res.json({ translations: jsonResult.translations || [], items: jsonResult.items || [] });
    }
  } catch (error: any) {
    console.error("Translation API Error:", error);
    res.status(500).json({
      error: error.message || "Failed to process translation with Gemini API.",
    });
  }
});

// Quality Audit API Endpoint
app.post("/api/quality-check", async (req, res) => {
  try {
    const { nodes } = req.body;
    if (!nodes || !Array.isArray(nodes)) {
      return res.status(400).json({ error: "Missing 'nodes' array." });
    }

    const ai = getGeminiClient();

    const sampleNodes = nodes.slice(0, 30).map((n) => ({
      vi: n.contentVi,
      en: n.contentEn,
      type: n.type,
    }));

    const systemInstruction = `
Bạn là Trợ lý Kiểm định Chất lượng Giáo án Song ngữ chuẩn Bộ GD&ĐT.
Hãy phân tích danh sách các đoạn song ngữ Việt - Anh được cung cấp và đánh giá:
1. Độ chính xác thuật ngữ GDPT 2018 (0-100%)
2. Lỗi chính tả / dịch thuật (nếu có)
3. Quy định định dạng: Tiếng Anh in nghiêng, màu xanh #003399, không bold, giữ cỡ chữ.
4. Gợi ý sửa lỗi cụ thể.
`;

    const prompt = `
Phân tích các mẫu song ngữ sau:
${JSON.stringify(sampleNodes, null, 2)}

Trả về JSON có cấu trúc:
{
  "score": 98,
  "summary": "Giáo án đạt chất lượng rất cao, tuân thủ 99% Công văn 5512 và GDPT 2018.",
  "issues": [
    { "type": "terminology|spelling|formatting", "description": "Mô tả lỗi...", "suggestion": "Gợi ý sửa..." }
  ]
}
`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const jsonResult = JSON.parse(response.text || "{}");
    res.json(jsonResult);
  } catch (error: any) {
    console.error("Quality Audit API Error:", error);
    res.status(500).json({ error: error.message || "Quality check failed." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
