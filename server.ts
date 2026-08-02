import express from "express";
import path from "path";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "35mb" }));
app.use(express.urlencoded({ extended: true, limit: "35mb" }));

const upload = multer({ storage: multer.memoryStorage() });

function getGeminiClient(customKey?: string) {
  const apiKey = customKey || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length < 5) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Fallback Model Chain Execution with Automatic Retry
async function generateContentWithRetry(ai: GoogleGenAI, params: any, retries = 2, delayMs = 1000): Promise<any> {
  const primaryModel = params.model || "gemini-3-flash-preview";
  const modelsToTry = Array.from(
    new Set([primaryModel, "gemini-3-flash-preview", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"])
  );

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
        const isRateLimit =
          err?.status === 429 ||
          err?.message?.includes("429") ||
          err?.message?.includes("RESOURCE_EXHAUSTED") ||
          err?.message?.includes("Quota");

        if (isRateLimit && attempt < retries - 1) {
          console.warn(`[Gemini API] Rate limit on model ${model}, retrying in ${delayMs * (attempt + 1)}ms...`);
          await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        } else {
          break; // Try next model in chain
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content after trying all model fallback options.");
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "AI LessonPlan Bilingual Pro v2.5" });
});

// Translation API Endpoint for All 25+ Subjects
app.post("/api/translate", async (req, res) => {
  try {
    const { items, aiMode, level, subject, grade, tone, model, userApiKey } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Missing or invalid 'items' array." });
    }

    const clientKey = userApiKey || req.headers["x-gemini-api-key"];
    const ai = getGeminiClient(typeof clientKey === "string" ? clientKey : undefined);

    let temperature = 0.2;
    if (aiMode === "fast") temperature = 0.3;
    if (aiMode === "precise") temperature = 0.1;

    const toneInstruction =
      tone === "simple"
        ? "Dùng từ vựng đơn giản, ngắn gọn, dễ hiểu cho học sinh."
        : tone === "formal"
        ? "Dùng văn phong hành chính - học thuật trang trọng, dùng cho báo cáo hoặc hội thảo."
        : "Dùng chuẩn thuật ngữ giáo án chuyên ngành sư phạm Bộ GD&ĐT / Công văn 5512.";

    const systemInstruction = `
Bạn là chuyên gia dịch thuật tài liệu giáo dục và biên soạn Kế hoạch bài dạy (Lesson Plan) Việt - Anh hàng đầu cho giáo viên Việt Nam.
Nhiệm vụ của bạn là dịch mảng các câu/đoạn/ô bảng từ giáo án tiếng Việt sang tiếng Anh theo CHUẨN THUẬT NGỮ GIÁO DỤC VIỆT NAM (Chương trình GDPT 2018, Công văn 5512, Thông tư Bộ GDĐT, Cambridge, CEFR).

BỐI CẢNH BÀI DẠY:
- MÔN HỌC: ${subject || "Môn học chung"}
- CẤP HỌC: ${level || "THCS"} (Lớp ${grade || "8"})
- PHONG CÁCH: ${toneInstruction}

QUY TẮC DỊCH THUẬT 25+ BỘ MÔN (RẤT QUAN TRỌNG):
1. TUYỆT ĐỐ KHÔNG LẶP LẠI TIẾNG VIỆT GỐC TRONG BẢN DỊCH TIẾNG ANH. Bản dịch tiếng Anh phải là 100% tiếng Anh thuần túy, không chèn từ tiếng Việt ở cuối câu.
2. KHÔNG TỰ Ý ĐẶT NỘI DUNG DỊCH TRONG NGOẶC ĐƠN (...). Chỉ dịch thẳng nội dung sang tiếng Anh.
3. GIỮ NGUYÊN 100% các công thức toán học (MathType/LaTeX, $a^2+b^2=c^2$), công thức hóa học (H2SO4, CO2), đơn vị đo (m/s2, N, J, W, Pa), số liệu, hình vẽ, ký hiệu khoa học hoặc mã giữ chỗ {{img_...}}.
4. QUY ĐỊNH THUẬT NGỮ CÔNG VĂN 5512 / GDPT 2018:
   - Hoạt động -> Activity
   - Mục tiêu -> Objectives (Knowledge, Competencies, Qualities)
   - Nội dung -> Content
   - Sản phẩm -> Expected Products / Products
   - Tổ chức thực hiện -> Implementation / Procedures
   - Chuyển giao nhiệm vụ -> Task Assignment / Task Transfer
   - Thực hiện nhiệm vụ -> Task Execution
   - Báo cáo, thảo luận -> Presentation & Discussion / Reporting
   - Kết luận, nhận định -> Conclusion & Assessment
   - Mở đầu / Khởi động -> Warm-up / Introduction
   - Hình thành kiến thức mới -> New Knowledge Formation
   - Luyện tập -> Practice
   - Vận dụng -> Application
   - Phẩm chất -> Qualities / Character Attributes
   - Năng lực chung -> General Competencies
   - Năng lực đặc thù -> Specific Competencies
5. TRẢ VỀ ĐÚNG ĐỊNH DẠNG JSON: Mảng các đối tượng [{"id": "...", "text": "bản dịch tiếng Anh"}]. Đảm bảo giữ nguyên 100% các mã ID được cung cấp.
`;

    const prompt = `
Dịch danh sách các đoạn/câu sau từ giáo án tiếng Việt sang tiếng Anh:
MẢNG CẦN DỊCH:
${JSON.stringify(items, null, 2)}

Trả về duy nhất mảng JSON các đối tượng có cấu trúc:
[
  { "id": "id_goc", "text": "bản dịch tiếng Anh thuần túy" }
]
`;

    const response = await generateContentWithRetry(ai, {
      model: model || "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        temperature,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text || "[]";
    let jsonResult;
    try {
      jsonResult = JSON.parse(responseText.trim().replace(/^```json\s*/, "").replace(/\s*```$/, ""));
    } catch (e) {
      jsonResult = [];
    }

    if (Array.isArray(jsonResult)) {
      res.json({ items: jsonResult, translations: jsonResult.map((i: any) => i.text || i) });
    } else if (jsonResult.items && Array.isArray(jsonResult.items)) {
      res.json({ items: jsonResult.items, translations: jsonResult.items.map((i: any) => i.text || i) });
    } else {
      res.json({ items: [], translations: [] });
    }
  } catch (error: any) {
    console.error("Translation API Error:", error);
    res.status(500).json({
      error: error.message || "Không thể thực hiện dịch thuật AI. Vui lòng kiểm tra lại API Key Gemini.",
    });
  }
});

// AI Digital & AI Competency Integration API Endpoint (QĐ 3439/QĐ-BGDĐT)
app.post("/api/integrate-nls-ai", async (req, res) => {
  try {
    const { nodes, subject, level, userApiKey } = req.body;
    if (!nodes || !Array.isArray(nodes)) {
      return res.status(400).json({ error: "Missing 'nodes' array." });
    }

    const clientKey = userApiKey || req.headers["x-gemini-api-key"];
    const ai = getGeminiClient(typeof clientKey === "string" ? clientKey : undefined);

    const systemInstruction = `
Bạn là chuyên gia giáo dục số của Bộ GD&ĐT Việt Nam, am hiểu khung Năng lực số (NLS) và Khung Năng lực AI cho học sinh theo Quyết định 3439/QĐ-BGDĐT.
Nhiệm vụ của bạn là phân tích các phần/hoạt động học tập trong bài dạy, và bổ sung hợp lý 1-2 câu ứng dụng công cụ số (GeoGebra, PhET, Kahoot, Canva, Google Docs, AI Gemini/ChatGPT) vào mục Tiêu/Tổ chức thực hiện của bài dạy.

YÊU CẦU TRẢ VỀ:
Trả về JSON chứa mảng các phần tử được cập nhật:
[
  {
    "id": "node_id",
    "contentVi": "nội dung tiếng Việt đã bổ sung NLS/AI",
    "contentEn": "English translation for added digital integration",
    "isIntegrated": true,
    "integrationType": "nls"
  }
]
`;

    const prompt = `
Phân tích và gợi ý tích hợp Năng lực số / AI QĐ 3439 cho bài dạy môn ${subject || "chung"} cấp ${level || "THCS"}:
DANH SÁCH NODES:
${JSON.stringify(nodes.slice(0, 20), null, 2)}
`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });

    const jsonResult = JSON.parse(response.text || "[]");
    res.json({ integratedNodes: Array.isArray(jsonResult) ? jsonResult : [] });
  } catch (error: any) {
    console.error("NLS/AI Integration API Error:", error);
    res.status(500).json({ error: error.message || "Failed to process NLS/AI integration." });
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
      model: "gemini-3-flash-preview",
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
